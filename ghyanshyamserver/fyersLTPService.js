
import fs from "fs";
import csv from "csv-parser";
import { fyersDataSocket } from "fyers-api-v3";


// const fyersSocket = fyersDataSocket.getInstance("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb0N3bGFZZHFPVTZfUzhhQXp3YnNnLThQWmFOR00zR1pzenhIX1E2b1l6MXlQWWtjQmZJWm5UZ28tYkczTUI4QTNYNG5hem1PLXlDRkMzN0h0V3JXOHU5d2VFaHRBeEVjSm5icEVDakdPR0JVZV94MD0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiJlZjI1MzIwYmIxOWI1ZDVhZTJlZWM3MjhmNTIwYTVmZjQyYjM0MWJmZjU5YmI0ZWYwOGUwNDRkYiIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWVUwMjc2MSIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzQ1NjI3NDAwLCJpYXQiOjE3NDU1NTM3NTQsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc0NTU1Mzc1NCwic3ViIjoiYWNjZXNzX3Rva2VuIn0.U9kIfEBfaIW4IAD8LQLF2q10HOZzn2RgvUIinmRxSc4");



// const fyersSocket = fyersDataSocket.getInstance(
//     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb0N3bGFZZHFPVTZfUzhhQXp3YnNnLThQWmFOR00zR1pzenhIX1E2b1l6MXlQWWtjQmZJWm5UZ28tYkczTUI4QTNYNG5hem1PLXlDRkMzN0h0V3JXOHU5d2VFaHRBeEVjSm5icEVDakdPR0JVZV94MD0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiJlZjI1MzIwYmIxOWI1ZDVhZTJlZWM3MjhmNTIwYTVmZjQyYjM0MWJmZjU5YmI0ZWYwOGUwNDRkYiIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWVUwMjc2MSIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzQ1NjI3NDAwLCJpYXQiOjE3NDU1NTM3NTQsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc0NTU1Mzc1NCwic3ViIjoiYWNjZXNzX3Rva2VuIn0.U9kIfEBfaIW4IAD8LQLF2q10HOZzn2RgvUIinmRxSc4",
//     { disableLogging: true } // ✅ Important: this disables logging
//   );


  const fyersSocket = fyersDataSocket.getInstance(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb09Vek5pX0RZeUZFbnVnRkFZcWw5ckpjRUdIams5T0tmSkZfeVRCaDE1NGZ1c0F5SDB2OTltak1NUlRJdGVwcUVxSDZaVTJQQVJ4dm1vc3RPN21mV3Zyekozc055MjM0YkU3RUpSUFpkR0RhT3RYZz0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiI1YzQ1Yjc4Y2FlNzlhZmMwZTFjNzZlYzE1NTNlMWJhYzg5ZGY2NDU1MWU2NWUwZGNhNTYxZTM1ZiIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiRkFBMTkzMjciLCJhcHBUeXBlIjoxMDAsImV4cCI6MTc0ODY1MTQwMCwiaWF0IjoxNzQ4NTg1Njc3LCJpc3MiOiJhcGkuZnllcnMuaW4iLCJuYmYiOjE3NDg1ODU2NzcsInN1YiI6ImFjY2Vzc190b2tlbiJ9.bV4d1Q98KasZPiyu8swJNLywszXYAvdxpBlL6Dw0jfc",
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
  
