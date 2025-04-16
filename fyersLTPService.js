
const fs = require("fs");
const csv = require("csv-parser");
const { fyersDataSocket } = require("fyers-api-v3");

const fyersSocket = fyersDataSocket.getInstance("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIl0sImF0X2hhc2giOiJnQUFBQUFCbl95OWdFbkZ0U0RmVi02elU5Q0lwZVpPQW5zZ0Eydm5kcmx3RW5WY3FYZXpMTk9lQ1RQRlJlV2VhU2xBLUZaSTZYcVNWbEZ5RV9PZEpjOFdTTG5yZzZ1OVpPczlrU1pxTF9zbC1SamFTVWRkQ2pKND0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiJlMWI3MmYyOGY4ODAwMTkzMTRhNmFhODI3ZjQ4YzBmNDNmZGNjZDRhZWY3ZGQ1ODc0YWU5MDI3ZCIsImlzRGRwaUVuYWJsZWQiOiJZIiwiaXNNdGZFbmFibGVkIjoiWSIsImZ5X2lkIjoiWFMwNzgwMyIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzQ0ODQ5ODAwLCJpYXQiOjE3NDQ3NzcwNTYsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc0NDc3NzA1Niwic3ViIjoiYWNjZXNzX3Rva2VuIn0.k_32xAeqsppVByORRmOx8V0fMcAgRe7rrZDsYgDcU_Q");

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
            // console.log(msg)
            categorizeAndUpdate(msg.symbol, msg.ltp, msg.ch, msg.chp);
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
    for (const [symbol, { ltp, ch, chp }] of Object.entries(ltpMap1)) {
        console.log(`${symbol}: ₹${ltp} (CH: ₹${ch}, CHP: ${chp}%)`);
    }
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
    // setInterval(printAllLTPs, 5000); // Live LTP printout
}

module.exports = {
    initializeFyersConnection,
    ltpMap1,
    ltpMap2,
    ltpMap3
};
