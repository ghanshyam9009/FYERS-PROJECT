
import { fyersDataSocket } from "fyers-api-v3";
import { ltpMap1, ltpMap2, ltpMap3 } from "./fyersLTPService.js";

const alternateToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb1oxckNaUXNRLUxSRVlQZGpPRUxPc2pkakQzNzN6UkhraXZfZkZPWUJwRHp2ckFRaURjWXVENFg2QTYzQ00tQm9STElqMmhIVW1QamFLYzZZZGhpQWZGMHp3c3Q5SGd3S2pWcjlSOU5zck14cWt3Zz0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiI1YzQ1Yjc4Y2FlNzlhZmMwZTFjNzZlYzE1NTNlMWJhYzg5ZGY2NDU1MWU2NWUwZGNhNTYxZTM1ZiIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiRkFBMTkzMjciLCJhcHBUeXBlIjoxMDAsImV4cCI6MTc1MTY3NTQwMCwiaWF0IjoxNzUxNjAzOTA2LCJpc3MiOiJhcGkuZnllcnMuaW4iLCJuYmYiOjE3NTE2MDM5MDYsInN1YiI6ImFjY2Vzc190b2tlbiJ9.zv4BYa-Su5sYooEsLrWIq0lbAcTWlY0pjdOBWyGoHwA";
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
