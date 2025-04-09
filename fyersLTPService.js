


const fs = require("fs");
const csv = require("csv-parser");
const { fyersDataSocket } = require("fyers-api-v3");

const fyersSocket = fyersDataSocket.getInstance("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCbjlmRktCNEMwNVNOSmtGVV9UZHpMVDhwclVuUTlBU0hlaHR4WU5JME05RW9HT250NUhEVzVpQ0Y3b2x2OWJaenFQS1JwMnI1REVERmVISEJNWFYxUkpnQW8yeXBMWGd4aFNPeUI5amd5TnZTTnhuWT0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiJlZjI1MzIwYmIxOWI1ZDVhZTJlZWM3MjhmNTIwYTVmZjQyYjM0MWJmZjU5YmI0ZWYwOGUwNDRkYiIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWVUwMjc2MSIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzQ0MjQ1MDAwLCJpYXQiOjE3NDQxNzEzMzgsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc0NDE3MTMzOCwic3ViIjoiYWNjZXNzX3Rva2VuIn0.V8xaNgHXeO1EPnOBY_0SLWMsPa4xaRdYwHo2P6PbuWQ");

const ltpMap1 = {}; // NIFTY & SENSEX
const ltpMap2 = {}; // BANKNIFTY & FINNIFTY
const ltpMap3 = {}; // EQUITY/OTHERS

function readSymbolsFromCSV(filePath) {
    return new Promise((resolve, reject) => {
        const symbols = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (row) => row.Symbol && symbols.push(row.Symbol.trim()))
            .on("end", () => resolve(symbols))
            .on("error", (err) => reject(err));
    });
}

function categorizeAndUpdate(symbol, ltp) {
    const upper = symbol.toUpperCase();
    if (upper.includes("NIFTY") && !upper.includes("BANK") && !upper.includes("FIN")) {
        ltpMap1[upper] = ltp;
    } else if (upper.includes("SENSEX")) {
        ltpMap1[upper] = ltp;
    } else if (upper.includes("BANKNIFTY") || upper.includes("FINNIFTY")) {
        ltpMap2[upper] = ltp;
    } else {
        ltpMap3[upper] = ltp;
    }

    // Debug print
    // console.log(`[SOCKET] ${upper}: ₹${ltp}`);
}

function handleSocket(symbols) {
    fyersSocket.on("message", (msg) => {
        if (msg.symbol && msg.ltp !== undefined) {
            categorizeAndUpdate(msg.symbol, msg.ltp);
        }
    });

    fyersSocket.on("connect", () => {
        console.log("✅ Connected to Fyers socket");
        fyersSocket.subscribe(symbols);
        fyersSocket.autoreconnect();
    });

    fyersSocket.connect();
}

function printAllLTPs() {
    console.clear();
    console.log("\n========== 🟢 BANKNIFTY & FINNIFTY ==========");
    for (const [symbol, ltp] of Object.entries(ltpMap1)) {
        console.log(`${symbol}: ₹${ltp}`);
    }
}

async function initializeFyersConnection() {
    const allSymbols = [
        ...(await readSymbolsFromCSV("./sensex-50.csv")),
        ...(await readSymbolsFromCSV("./sensex-50.csv")),
        ...(await readSymbolsFromCSV("./BANKNIFTY.csv")),
        ...(await readSymbolsFromCSV("./FINNIFTY.csv")),
        ...(await readSymbolsFromCSV("./EQUITY.csv"))
    ];
    handleSocket(allSymbols);
    setInterval(printAllLTPs, 5000); // Live LTP printout
}

module.exports = {
    initializeFyersConnection,
    ltpMap1,
    ltpMap2,
    ltpMap3
};
