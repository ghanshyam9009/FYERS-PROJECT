const express = require("express");
const http = require("http");
const { fyersDataSocket } = require("fyers-api-v3");
const AWS = require("aws-sdk");
const WebSocket = require("ws");
const fs = require("fs").promises;
const path = require("path");

// Configuration
const CONFIG = {
  aws: {
    region: "ap-south-1",
    credentials: {
      accessKeyId: "AKIA4IM3HNOCATS4XS3I",
      secretAccessKey: "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",
    },
    wsUrl:
      "wss://y7xzvn1cr3.execute-api.ap-south-1.amazonaws.com/Prod?userId=FYERS_FEED",
  },
  fyers: {
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb0J6ay1vdkdXZjNkdGlsN2E2cVBrVm1neWF5Qks4NnZlMzRZODFfR1R0ZDd1UElhYmlmbFNyQmxkNE0wQTZ4UlJYbnYyX2dMOVRCekJVUE1yZFhMa01WalJhZHlyNnNmMlpULWZ5N1MzY2hhTXVPND0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiJlODVkZDU4NWI5NDIxMzJhMTE4MWEzMDFhZTI3NDkyZDZiODE1Zjc0MzQ2ZGFiNzhlNWViODNhMSIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWUE0NzI0MyIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzQ1MzY4MjAwLCJpYXQiOjE3NDUzMDM4NzAsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc0NTMwMzg3MCwic3ViIjoiYWNjZXNzX3Rva2VuIn0.y8R_TE78xr4nuWU9QoBsaJQN-Q5ZMmrX1wyO2lqQHWI",
  },
  intervals: {
    heartbeat: 30000,
    reconnect: 5000,
    scheduler: 30000,
  },
  market: {
    closeTime: { hour: 15, minute: 20 },
    deliveryTime: { hour: 23, minute: 45 },
    tolerance: 5, // minutes
  },
};

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);
const port = 3010;

// Initialize WebSocket server
const wss = new WebSocket.Server({ server }); // Attach WebSocket to HTTP server

// Middleware for Express
app.use(express.json());

// AWS and Fyers WebSocket handling (unchanged)
AWS.config.update(CONFIG.aws);

// State Management (unchanged)
class MarketDataManager {
  constructor() {
    this.prices = new Map();
    this.subscribedSymbols = new Set();
    this.userSymbols = new Map();
    this.isConnected = false;
    this.awsWs = null;
    this.fyersWs = null;
    this.scheduler = null;
    this.lastDeliveryTime = null;
  }

  async init() {
    await this.ensureLogDir();
    this.setupFyers();
    this.connectAWS();
    this.startHeartbeat();
    this.setupScheduler();
    console.log("Market Data Manager initialized");
  }

  // Existing methods (unchanged)
  async ensureLogDir() {
    const logDir = path.join(__dirname, "logs");
    await fs.mkdir(logDir, { recursive: true }).catch(() => {});
  }

  setupFyers() {
    this.fyersWs = new fyersDataSocket(CONFIG.fyers.token);
    this.fyersWs.on("connect", () =>
      console.log("Connected to Fyers WebSocket")
    );
    this.fyersWs.on("message", this.handleFyersMessage.bind(this));
    this.fyersWs.on("error", (error) => {
      console.error("Fyers WebSocket error:", error);
      this.reconnectFyers();
    });
    this.fyersWs.on("close", () => this.reconnectFyers());
    this.fyersWs.connect();
  }

  connectAWS() {
    if (this.isConnected) return;
    this.awsWs = new WebSocket(CONFIG.aws.wsUrl);
    this.awsWs.on("open", () => {
      this.isConnected = true;
      console.log("Connected to AWS WebSocket");
    });
    this.awsWs.on("message", this.handleAWSMessage.bind(this));
    this.awsWs.on("error", (error) => {
      console.error("AWS WebSocket error:", error);
      this.reconnectAWS();
    });
    this.awsWs.on("close", () => this.reconnectAWS());
  }

  handleFyersMessage(message) {
    try {
      if (!message?.symbol || !message.ltp) return;
      const symbol = message.symbol.toUpperCase();
      const data = this.formatPriceData(message);
      if (isNaN(data.price) || data.price <= 0) return;
      this.prices.set(symbol, data);
      if (this.subscribedSymbols.has(symbol)) {
        this.sendPriceUpdate(symbol, data);
      }
    } catch (error) {
      console.error("Error processing Fyers message:", error);
    }
  }

  async handleAWSMessage(data) {
    try {
      const message = JSON.parse(data);
      const handlers = {
        p_price: this.handleGetPrice,
        subscribe_investments: this.handleSubscribeInvestments,
        customer_disconnect: this.handleCustomerDisconnect,
        market_close: this.handleMarketClose,
        delivery_to_investment: this.handleDeliveryToInvestment,
        heartbeat: () => console.log("Heartbeat received"),
      };
      const handler =
        handlers[message.type] ||
        (() => console.log("Unknown message type:", message.type));
      await handler.call(this, message);
    } catch (error) {
      console.error("Error processing AWS message:", error);
    }
  }

  formatPriceData({ ltp, change = 0, chp = 0 }) {
    return {
      price: parseFloat(ltp).toFixed(2),
      change: parseFloat(change).toFixed(2),
      changePercent: parseFloat(chp).toFixed(2),
      timestamp: new Date().toISOString(),
    };
  }

  sendPriceUpdate(symbol, data) {
    if (!this.isConnected || this.awsWs.readyState !== WebSocket.OPEN) return;
    const update = {
      type: "price_update",
      data: { symbol, ...data },
    };
    this.awsWs.send(JSON.stringify(update));
  }

  async handleGetPrice({ requestId, symbol }) {
    const data = this.prices.get(symbol.toUpperCase()) || {
      price: 0,
      timestamp: new Date().toISOString(),
    };
    this.awsWs.send(
      JSON.stringify({
        type: "price_response",
        requestId,
        symbol,
        ...data,
      })
    );
  }

  async handleSubscribeInvestments({ userId, data: investments }) {
    if (!Array.isArray(investments)) return;
    const symbols = investments
      .map((inv) => (inv.symbol || inv.stock_symbol)?.toUpperCase())
      .filter(Boolean);
    const oldSymbols = this.userSymbols.get(userId) || new Set();
    this.userSymbols.set(userId, new Set(symbols));
    this.updateSubscriptions();
    symbols.forEach((symbol) => this.fetchAndSendPrice(symbol));
  }

  handleCustomerDisconnect({ userId }) {
    this.userSymbols.delete(userId);
    this.updateSubscriptions();
  }

  getISTTime() {
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    return {
      hours: istTime.getUTCHours(),
      minutes: istTime.getUTCMinutes(),
      day: istTime.getUTCDay(),
    };
  }

  async handleMarketClose(message) {
    const ist = this.getISTTime();
    if (ist.day < 1 || ist.day > 5) return;
    const { hour, minute } = CONFIG.market.closeTime;
    if (!this.isWithinTimeWindow(ist, hour, minute)) return;
    const notification = {
      type: "market_close",
      source: "ec2_feed",
      timestamp: new Date().toISOString(),
      message: "Market close triggered at 3:20 PM IST",
    };
    await this.sendWithRetry(notification);
    this.cleanupMarketClose();
  }

  async handleDeliveryToInvestment(message) {
    try {
      const ist = this.getISTTime();
      const isDeliveryTime = this.isDeliveryTime(ist);
      if (!isDeliveryTime) {
        console.log(
          "Current time is not delivery to investment time. Process will only run at 11:45 PM IST +/- 5 minutes."
        );
        return;
      }
      const currentDateIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      if (this.lastDeliveryTime === currentDateIST) {
        console.log(
          `Delivery to investment already processed today (${currentDateIST}). Skipping.`
        );
        return;
      }
      const deliveryMessage = {
        type: "delivery_to_investment",
        source: "ec2_feed",
        timestamp: new Date().toISOString(),
        message:
          "Converting all delivery, CNC, overnight positions to investments at 11:45 PM IST",
        data: {
          includeTypes: ["DELIVERY", "CNC", "OVERNIGHT"],
          includeAllStatus: true,
        },
      };
      const success = await this.sendWithRetry(deliveryMessage);
      if (success) {
        this.lastDeliveryTime = currentDateIST;
        console.log(
          `Delivery to investment processed successfully at ${currentDateIST}`
        );
      } else {
        console.error(
          "Failed to send delivery to investment message after retries"
        );
      }
    } catch (error) {
      console.error("Error handling delivery to investment:", error);
    }
  }

  updateSubscriptions() {
    this.subscribedSymbols.clear();
    this.userSymbols.forEach((symbols) =>
      symbols.forEach((s) => this.subscribedSymbols.add(s))
    );
    const allSymbols = Array.from(this.subscribedSymbols);
    allSymbols.length
      ? this.fyersWs.subscribe(allSymbols)
      : this.fyersWs.unsubscribe();
  }

  async fetchAndSendPrice(symbol) {
    const data = this.prices.get(symbol) || (await this.getFyersPrice(symbol));
    if (data?.price > 0) this.sendPriceUpdate(symbol, data);
  }

  async getFyersPrice(symbol) {
    const wasSubscribed = this.subscribedSymbols.has(symbol);
    if (!wasSubscribed) await this.fyersWs.subscribe([symbol]);
    const data = await this.waitForPrice(symbol);
    if (!wasSubscribed) await this.fyersWs.unsubscribe([symbol]);
    return data;
  }

  waitForPrice(symbol, timeout = 2000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = setInterval(() => {
        const data = this.prices.get(symbol);
        if (data?.price > 0 || Date.now() - start >= timeout) {
          clearInterval(check);
          resolve(data || null);
        }
      }, 100);
    });
  }

  async sendWithRetry(message, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      if (this.isConnected && this.awsWs.readyState === WebSocket.OPEN) {
        this.awsWs.send(JSON.stringify(message));
        return true;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
      this.connectAWS();
    }
    return false;
  }

  cleanupMarketClose() {
    this.subscribedSymbols.clear();
    this.userSymbols.clear();
    this.prices.clear();
    this.fyersWs.unsubscribe();
    // Close the WebSocket connection if it exists
    if (this.fyersWs && this.fyersWs.ws) {
      this.fyersWs.ws.close();
    }
  }

  startHeartbeat() {
    setInterval(() => {
      if (this.isConnected)
        this.awsWs.send(JSON.stringify({ type: "heartbeat" }));
    }, CONFIG.intervals.heartbeat);
  }

  setupScheduler() {
    this.scheduler = setInterval(() => {
      const ist = this.getISTTime();
      if (ist.minutes % 5 === 0)
        console.log(`Time check: ${ist.hours}:${ist.minutes} IST`);
      if (this.isMarketCloseTime(ist))
        this.handleMarketClose({ source: "scheduler" });
      if (this.isDeliveryTime(ist))
        this.handleDeliveryToInvestment({
          type: "delivery_to_investment",
          source: "scheduler",
        });
    }, CONFIG.intervals.scheduler);
  }

  isWithinTimeWindow(ist, targetHour, targetMinute) {
    const diff = (ist.hours - targetHour) * 60 + (ist.minutes - targetMinute);
    return Math.abs(diff) <= CONFIG.market.tolerance;
  }

  isMarketCloseTime(ist) {
    return (
      ist.day >= 1 &&
      ist.day <= 5 &&
      this.isWithinTimeWindow(
        ist,
        CONFIG.market.closeTime.hour,
        CONFIG.market.closeTime.minute
      )
    );
  }

  isDeliveryTime(ist) {
    return this.isWithinTimeWindow(
      ist,
      CONFIG.market.deliveryTime.hour,
      CONFIG.market.deliveryTime.minute
    );
  }

  reconnectFyers() {
    setTimeout(() => {
      this.fyersWs.connect();
      this.updateSubscriptions();
    }, CONFIG.intervals.reconnect);
  }

  reconnectAWS() {
    this.isConnected = false;
    setTimeout(() => this.connectAWS(), CONFIG.intervals.reconnect);
  }
}

// HTTP Endpoint for LTP
app.get("/get_price", async (req, res) => {
  try {
    const symbol = req.query.symbol?.toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    const data = manager.prices.get(symbol) || {
      price: 0,
      timestamp: new Date().toISOString(),
    };
    if (data.price <= 0) {
      const freshData = await manager.getFyersPrice(symbol);
      if (freshData?.price > 0) {
        data.price = freshData.price;
        data.timestamp = freshData.timestamp;
      }
    }

    res.json({
      symbol,
      price: parseFloat(data.price),
      timestamp: data.timestamp,
    });
  } catch (error) {
    console.error("Error fetching price:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Local WebSocket handling (optional, for direct client connections)
wss.on("connection", (ws) => {
  console.log("New WebSocket client connected");
  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === "p_price" && message.symbol) {
        const symbol = message.symbol.toUpperCase();
        const data = manager.prices.get(symbol) || {
          price: 0,
          timestamp: new Date().toISOString(),
        };
        if (data.price <= 0) {
          const freshData = await manager.getFyersPrice(symbol);
          if (freshData?.price > 0) {
            data.price = freshData.price;
            data.timestamp = freshData.timestamp;
          }
        }
        ws.send(
          JSON.stringify({
            type: "price_response",
            requestId: message.requestId,
            symbol,
            ...data,
          })
        );
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  });
  ws.on("close", () => console.log("WebSocket client disconnected"));
});

// Start the application
const manager = new MarketDataManager();
manager.init().catch(console.error);

// Start the HTTP/WebSocket server
server.listen(port, () => {
  console.log(`Server running on port ${port} (HTTP and WebSocket)`);
});
