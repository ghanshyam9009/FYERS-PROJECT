const express = require("express");
const http = require("http");
const FyersSocket = require("fyers-api-v3").fyersDataSocket;
const AWS = require("aws-sdk");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configure AWS
AWS.config.update({
  region: "ap-south-1",
  credentials: new AWS.Credentials({
    accessKeyId: "AKIA4IM3HNOCATS4XS3I",
    secretAccessKey: "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",
  }),
});

// Initialize data structures
const liveData = {
  prices: new Map(),
};
const subscribedSymbols = new Set();
let isConnected = false;
let awsWs;

const userSymbols = new Map();

// Initialize Fyers WebSocket
const fyersdata = new FyersSocket(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb0J6aTJCTUJxdXRvUTlmZXlJeGpWN0FDb1YxMDAxaVQ1cnVRZGlOdTNMd2YyZUo5bEI4d1Q4ZWkzdF9KVFFNZ25ScmlnZHgtcnNpanhaVXc0cGlLWlgwNXlwaVZtS1diWVdFYXZPVHhic0ZUSTBTQT0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiI4YjNhY2ZkYWI4YmZkMTNhYzM5YmJiMTlmNDdlZTU5MmZjMDdmOGJiZmE0ZDg4YWY3YjQ2ZjQzMiIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWVM2MTEwOSIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzQ1MzY4MjAwLCJpYXQiOjE3NDUzMDM3MzQsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc0NTMwMzczNCwic3ViIjoiYWNjZXNzX3Rva2VuIn0.iTuM3wyP2-hLCluJ1KzA7hACCzVPoR-T00VtHfJnpd0"
);

// Fyers event handlers
fyersdata.on("connect", () => {
  console.log("Connected to Fyers WebSocket");
});

fyersdata.on("message", (message) => {
  try {
    if (message?.symbol && message.ltp) {
      const symbol = message.symbol.toUpperCase();
      const price = parseFloat(message.ltp);

      // Store price
      liveData.prices.set(symbol, {
        price,
        timestamp: new Date().toISOString(),
      });

      // Send price update to Lambda if symbol is subscribed
      if (
        subscribedSymbols.has(symbol) &&
        awsWs?.readyState === WebSocket.OPEN
      ) {
        const priceUpdate = {
          category: "price_update",
          data: {
            stockSymbol: symbol,
            currentPrice: price,
            change: 0,
            changePercent: 0,
            timestamp: new Date().toISOString(),
          },
        };
        awsWs.send(JSON.stringify(priceUpdate));
        console.log(`Sent price update for ${symbol}: ${price}`);
      }
    }
  } catch (error) {
    console.error("Error processing Fyers message:", error);
  }
});

// AWS WebSocket connection
function createWebSocketConnection() {
  if (isConnected) return;

  try {
    console.log("Creating new WebSocket connection...");

    // Empty headers object for future extensibility
    const headers = {};

    awsWs = new WebSocket(
      "wss://kxuqvqdtd8.execute-api.ap-south-1.amazonaws.com/Prod?customerId=FYERS_FEED",
      [],
      { headers }
    );

    awsWs.on("open", () => {
      console.log("Connected to AWS WebSocket as FYERS_FEED");
      isConnected = true;

      // Send initial connection confirmation
      const message = {
        type: "connection_confirm",
        customerId: "FYERS_FEED",
        timestamp: new Date().toISOString(),
      };
      awsWs.send(JSON.stringify(message));
    });

    awsWs.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        console.log("Received message:", JSON.stringify(message, null, 2));

        switch (message.type) {
          case "subscribe_investments":
            console.log("Processing subscription request...");
            handleSubscribeInvestments(message);
            break;
          case "customer_disconnect":
            console.log("Processing customer disconnect...");
            handleCustomerDisconnect(message);
            break;
          case "heartbeat":
            console.log("Heartbeat received");
            break;
          default:
            console.log("Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
        console.error(error.stack);
      }
    });

    awsWs.on("error", (error) => {
      console.error("WebSocket error:", error);
      isConnected = false;
      setTimeout(createWebSocketConnection, 5000);
    });

    awsWs.on("close", (code, reason) => {
      console.log(
        `WebSocket connection closed. Code: ${code}, Reason: ${reason}`
      );
      isConnected = false;
      setTimeout(createWebSocketConnection, 5000);
    });
  } catch (error) {
    console.error("Error creating WebSocket connection:", error);
    console.error(error.stack);
    setTimeout(createWebSocketConnection, 5000);
  }
}

// Handle subscription
async function handleSubscribeInvestments(message) {
  try {
    const { customerId, data: investments } = message;
    console.log(
      `Processing subscription for ${customerId}:`,
      JSON.stringify(investments, null, 2)
    );

    if (!Array.isArray(investments) || investments.length === 0) {
      console.log(`No investments to process for ${customerId}`);
      return;
    }

    // Convert investment symbols to Fyers format and filter out invalid ones
    const symbols = investments
      .filter((inv) => inv.stock_symbol && typeof inv.stock_symbol === "string")
      .map((inv) =>
        inv.stock_symbol.includes("NSE:")
          ? inv.stock_symbol
          : `NSE:${inv.stock_symbol}-EQ`
      );

    if (symbols.length === 0) {
      console.log(`No valid symbols found for ${customerId}`);
      return;
    }

    console.log(`Processed symbols for subscription:`, symbols);

    // First unsubscribe from old symbols for this customer
    const oldSymbols = userSymbols.get(customerId) || new Set();
    if (oldSymbols.size > 0) {
      console.log(
        `Unsubscribing from old symbols for ${customerId}:`,
        Array.from(oldSymbols)
      );
      await fyersdata.unsubscribe(Array.from(oldSymbols));
    }

    // Store customer's new symbols
    userSymbols.set(customerId, new Set(symbols));

    // Recalculate total subscribed symbols
    subscribedSymbols.clear();
    for (const symbolSet of userSymbols.values()) {
      for (const symbol of symbolSet) {
        subscribedSymbols.add(symbol);
      }
    }

    // Subscribe to all unique symbols
    const allSymbols = Array.from(subscribedSymbols);
    if (allSymbols.length > 0) {
      console.log(`Subscribing to symbols:`, allSymbols);
      try {
        await fyersdata.subscribe(allSymbols);
        console.log(
          `Successfully subscribed for ${customerId}. Total symbols:`,
          allSymbols
        );

        // Send subscription confirmation
        const confirmMessage = {
          category: "subscription",
          status: "confirmed",
          customerId,
          symbols: allSymbols,
          timestamp: new Date().toISOString(),
        };
        awsWs.send(JSON.stringify(confirmMessage));
        console.log(`Sent subscription confirmation for ${customerId}`);
      } catch (error) {
        console.error(`Error subscribing to symbols:`, error);
        console.error(error.stack);
      }
    } else {
      console.log(`No symbols to subscribe for ${customerId}`);
    }
  } catch (error) {
    console.error("Error handling subscription:", error);
    console.error(error.stack);
  }
}

// Heartbeat
function startHeartbeat() {
  setInterval(() => {
    if (awsWs?.readyState === WebSocket.OPEN) {
      awsWs.send(JSON.stringify({ type: "heartbeat" }));
      console.log("Heartbeat sent");
    }
  }, 30000);
}

// Initialize
function initialize() {
  createWebSocketConnection();
  startHeartbeat();
  fyersdata.connect();
  console.log("EC2 middleware initialized with updated user model");
}

// Add better error handling and reconnection logic
fyersdata.on("error", (error) => {
  console.error("Fyers WebSocket error:", error);
  setTimeout(() => {
    console.log("Attempting to reconnect to Fyers...");
    fyersdata.connect();
  }, 5000);
});

fyersdata.on("close", () => {
  console.log("Fyers WebSocket closed. Attempting to reconnect...");
  setTimeout(() => {
    console.log("Reconnecting to Fyers...");
    fyersdata.connect();

    // Resubscribe to all symbols
    if (subscribedSymbols.size > 0) {
      const allSymbols = Array.from(subscribedSymbols);
      fyersdata.subscribe(allSymbols);
      console.log("Resubscribed to symbols:", allSymbols);
    }
  }, 5000);
});

// Add customer disconnect handler
function handleCustomerDisconnect(message) {
  try {
    const { customerId } = message;
    console.log(`Customer disconnected: ${customerId}`);

    // Remove customer's symbols
    userSymbols.delete(customerId);

    // Recalculate total subscribed symbols
    subscribedSymbols.clear();
    for (const symbolSet of userSymbols.values()) {
      for (const symbol of symbolSet) {
        subscribedSymbols.add(symbol);
      }
    }

    // Update Fyers subscriptions
    const remainingSymbols = Array.from(subscribedSymbols);
    if (remainingSymbols.length > 0) {
      // First unsubscribe from all
      fyersdata.unsubscribe();
      // Then subscribe to remaining symbols
      fyersdata.subscribe(remainingSymbols);
      console.log(
        `Updated subscriptions after ${customerId} disconnect. Remaining symbols:`,
        remainingSymbols
      );
    } else {
      fyersdata.unsubscribe();
      console.log("No remaining subscriptions, unsubscribed from all symbols");
    }
  } catch (error) {
    console.error("Error handling customer disconnect:", error);
    console.error(error.stack);
  }
}

initialize();
