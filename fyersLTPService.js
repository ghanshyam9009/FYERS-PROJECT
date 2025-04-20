const fs = require("fs");
const csv = require("csv-parser");
const { fyersDataSocket } = require("fyers-api-v3");

const fyersSocket = fyersDataSocket.getInstance("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIl0sImF0X2hhc2giOiJnQUFBQUFCb0JKNk1lSi1VbU1rYnBBN2cyN1B1UnNfelpFZFhoRHdGS01RcjVoeGRTZjk2Q3dwdk8wUzdBRUN1TEI1ZlU1OEVEclQxNXIzaGtielROY0VnOFNlZ0NfdXRSVGphdmRvOVVDQ2YzNFFwU1NySWktVT0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiJlMWI3MmYyOGY4ODAwMTkzMTRhNmFhODI3ZjQ4YzBmNDNmZGNjZDRhZWY3ZGQ1ODc0YWU5MDI3ZCIsImlzRGRwaUVuYWJsZWQiOiJZIiwiaXNNdGZFbmFibGVkIjoiWSIsImZ5X2lkIjoiWFMwNzgwMyIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzQ1MTk1NDAwLCJpYXQiOjE3NDUxMzMxOTYsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc0NTEzMzE5Niwic3ViIjoiYWNjZXNzX3Rva2VuIn0.D_UXL4qoPgp8mW5GnfrbeUB0o0TvkPWNKTLrGQGYkLI");

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

module.exports = {
    initializeFyersConnection,
    ltpMap1,
    ltpMap2,
    ltpMap3
};
