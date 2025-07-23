
import { fyersDataSocket } from "fyers-api-v3";
import { ltpMap1, ltpMap2, ltpMap3 } from "./fyersLTPService.js";

const alternateToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb2dGdktXMk1xZUt3Y2lqUGU3alFaYV9vRV9WTDNLUTBObGlELXdTNEh2TzY1LWpIWkNaTkZfRVU5RHZzWE1BT1hHbk1IQ1luY2JFQkwtT1ZkMnR4NlpUeE1wem8wUUdNM1NTTzloeWtsZENpb0lzdz0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiJlODVkZDU4NWI5NDIxMzJhMTE4MWEzMDFhZTI3NDkyZDZiODE1Zjc0MzQ2ZGFiNzhlNWViODNhMSIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWUE0NzI0MyIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzUzMzE3MDAwLCJpYXQiOjE3NTMyNDI1NzAsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc1MzI0MjU3MCwic3ViIjoiYWNjZXNzX3Rva2VuIn0.tWBpBEmfz9W5_WHZCvSBTmoHQD378DCrMvx1MfjGXEw";
const unknownSocket = fyersDataSocket.getInstance(alternateToken);

const unknownSymbolsSubscribed = new Set();

// 🧠 Only one message handler globally
function onUnknownMessage(msg) {
    const upper = msg.symbol?.toUpperCase();
    if (!upper) return;

    const data = { ltp: msg.ltp, ch: msg.ch, chp: msg.chp };

    if (["NSE:NIFTY50-INDEX", "NSE:NIFTYBANK-INDEX", "BSE:SENSEX-INDEX", "NSE:FINNIFTY-INDEX", "NSE:MIDCPNIFTY-INDEX", "BSE:BANKEX-INDEX"].includes(upper)) {
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

// 🔥 Setup socket only once
if (!unknownSocket.isConnected()) {
    unknownSocket.on("message", onUnknownMessage);

    unknownSocket.on("connect", () => {
        console.log("🔌 Unknown socket connected");
        unknownSocket.autoreconnect();
    });

    unknownSocket.connect();
}

export const unknownLtp = (symbol) => {
    const upperSym = symbol.toUpperCase();
    if (unknownSymbolsSubscribed.has(upperSym)) return Promise.resolve();

    unknownSymbolsSubscribed.add(upperSym);
    unknownSocket.subscribe([upperSym]);
    console.log(`✅ Subscribed unknown symbol: ${upperSym}`);
    return Promise.resolve();
};

export const unsubscribeUnknownLtp = (symbol) => {
    const upperSym = symbol.toUpperCase();
    if (unknownSymbolsSubscribed.has(upperSym)) {
        unknownSocket.unsubscribe([upperSym]);
        unknownSymbolsSubscribed.delete(upperSym);
        console.log(`🔕 Unsubscribed unknown symbol: ${upperSym}`);
    } else {
        console.log(`ℹ️ Symbol ${upperSym} was not subscribed.`);
    }
};

export default {
    unknownLtp,
    unsubscribeUnknownLtp
};
