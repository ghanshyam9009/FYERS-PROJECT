import fs from "fs";
import csv from "csv-parser";
import { fyersDataSocket } from "fyers-api-v3";


  const fyersSocket = fyersDataSocket.getInstance(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb2dGdVFCc2ZrQ25ERGpYOC0tQU1TdVQ3Z211dTB1WUVrTGJnU0FjQ3QzSjluQThZYU9mdFZESGVQbU1vWTNCNWxrUUJLN2JNMGROTmlzSjNKeXFQSXViUmZGTTF0ZVZsM0xvS0Q3NHVWUUo5cVZ3cz0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiI0MmQyYWYzZDIyMmZjOGJjMWUwMWViNDVmMmU3ZDhkZWFkMjZjYzM2YWY1YjU0NzY3ZDNkMTNlNyIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiRkFBMTkyNTAiLCJhcHBUeXBlIjoxMDAsImV4cCI6MTc1MzMxNzAwMCwiaWF0IjoxNzUzMjQyNTEyLCJpc3MiOiJhcGkuZnllcnMuaW4iLCJuYmYiOjE3NTMyNDI1MTIsInN1YiI6ImFjY2Vzc190b2tlbiJ9.1B-X_B3QiRyq122us3hPi_y1Lg1eORYSStZc-XCaQ3M",
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
  
