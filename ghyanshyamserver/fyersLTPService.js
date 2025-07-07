import fs from "fs";
import csv from "csv-parser";
import { fyersDataSocket } from "fyers-api-v3";


  const fyersSocket = fyersDataSocket.getInstance(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb2EyZ2tVZ1ZQZHI2Y2hZelRsVWJ3UmpXRVY4WFIwQkJfcFdVVUdZNEFrOWtPcUJkbFpqd3lTeFp3aTNaQmpBdTlhRnVxVTcxNzhmcXlWVUVkOGp0Uy02ZkItNXljZHdGVTlUOUFvZUs3Vm8yQmRGYz0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiJlODVkZDU4NWI5NDIxMzJhMTE4MWEzMDFhZTI3NDkyZDZiODE1Zjc0MzQ2ZGFiNzhlNWViODNhMSIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWUE0NzI0MyIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzUxOTM0NjAwLCJpYXQiOjE3NTE4Njk0NzYsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc1MTg2OTQ3Niwic3ViIjoiYWNjZXNzX3Rva2VuIn0.SLDQYLzXl6w9Xt_mkO7sBVlUbfdJyD6Zs6RCNHvla64",
    "",           // log path can be empty or omitted
    false          // ✅ true disables logging
  );



const ltpMap1 = {};
const ltpMap2 = {};
const ltpMap3 = {};

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

const exceptionalSymbols = new Set([
    "NSE:NIFTY50-INDEX",
    "NSE:NIFTYBANK-INDEX",
    "BSE:SENSEX-INDEX",
    "NSE:FINNIFTY-INDEX",
    "NSE:MIDCPNIFTY-INDEX",
    "BSE:BANKEX-INDEX"
]);

function categorizeAndUpdate(symbol, ltp, ch, chp) {
    const upper = symbol.toUpperCase();
    const data = { ltp, ch, chp };

    if (exceptionalSymbols.has(upper)) {
        ltpMap3[upper] = data;
        return;
    }

    if (upper.includes("NIFTY") && !upper.includes("BANK") && !upper.includes("FIN")) {
        ltpMap1[upper] = data;
    } else if (upper.includes("SENSEX")) {
        ltpMap1[upper] = data;
    } else if (upper.includes("BANKNIFTY") || upper.includes("FINNIFTY")) {
        ltpMap2[upper] = data;
    } else {
        ltpMap3[upper] = data;
    }
}

function handleSocket(symbols) {
    fyersSocket.on("message", (msg) => {
        if (msg.symbol && msg.ltp !== undefined) {
            categorizeAndUpdate(msg.symbol, msg.ltp, msg.ch, msg.chp);
        }
    });

    fyersSocket.on("connect", () => {
        fyersSocket.subscribe(symbols);
        fyersSocket.autoreconnect();
    });

    fyersSocket.connect();
}

async function initializeFyersConnection() {
    const allSymbols = [
        ...(await readSymbolsFromCSV("./NIFTY.csv")),
        ...(await readSymbolsFromCSV("./sensex-50.csv")),
        ...(await readSymbolsFromCSV("./BANKNIFTY.csv")),
        ...(await readSymbolsFromCSV("./FINNIFTY.csv")),
        ...(await readSymbolsFromCSV("./EQUITY.csv"))
    ];
    handleSocket(allSymbols);
}

// Initialize connection
initializeFyersConnection();

// Periodically print the LTP Maps
// setInterval(() => {
//     console.clear();
//     console.log("========== 📈 ltpMap1 (NIFTY / SENSEX) ==========");
//     // console.log(JSON.stringify(ltpMap1, null, 2));
//     console.log("\n========== 🏦 ltpMap2 (BANKNIFTY / FINNIFTY) ==========");
//     // console.log(JSON.stringify(ltpMap2, null, 2));
//     console.log("\n========== 📊 ltpMap3 (Others / Exceptional) ==========");
//     // console.log(JSON.stringify(ltpMap3, null, 2));
// }, 5000);

// module.exports = {
//     initializeFyersConnection,
//     ltpMap1,
//     ltpMap2,
//     ltpMap3
// };

export {
    initializeFyersConnection,
    ltpMap1,
    ltpMap2,
    ltpMap3
  };
  
