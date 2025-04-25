// const { fyersDataSocket } = require("fyers-api-v3");
// const { ltpMap1, ltpMap2, ltpMap3 } = require("./fyersLTPService");

import { fyersDataSocket } from "fyers-api-v3";
import { ltpMap1, ltpMap2, ltpMap3 } from "./fyersLTPService.js";

const alternateToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb0NjTVdCcjhxeGxucTdySHpvTnNDOGU4eDJ4LVphQlBtb1Z6UGF3X3Yxc2tPUHFJTHVpbDFGTlN2RU5INC04SVBveUI1dW5OeTlDbTdrX0pHcXdiVkZLWTI3UzNzWFNYWWlWZjJ1RTdZS1FPS3hhUT0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiJlZjI1MzIwYmIxOWI1ZDVhZTJlZWM3MjhmNTIwYTVmZjQyYjM0MWJmZjU5YmI0ZWYwOGUwNDRkYiIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWVUwMjc2MSIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzQ1NTQxMDAwLCJpYXQiOjE3NDU0NzAyMzAsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc0NTQ3MDIzMCwic3ViIjoiYWNjZXNzX3Rva2VuIn0.kteY9nqb0atuGU3Y7_z0IVj2cOvwtktBfVqNE42yk98";

const unknownSocket = fyersDataSocket.getInstance(alternateToken);

function categorizeAndUpdate(symbol, ltp, ch, chp) {
    const upper = symbol.toUpperCase();
    const data = { ltp, ch, chp };

    if (upper === "NSE:NIFTY50-INDEX" || upper === "NSE:NIFTYBANK-INDEX" ||
        upper === "BSE:SENSEX-INDEX" || upper === "NSE:FINNIFTY-INDEX" ||
        upper === "NSE:MIDCPNIFTY-INDEX" || upper === "BSE:BANKEX-INDEX") {
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

const unknownSymbolsSubscribed = new Set();

export const unknownLtp = (symbol) => {
    const upperSym = symbol.toUpperCase();

    return new Promise((resolve, reject) => {
        const onMessage = (msg) => {
            if (msg.symbol === upperSym && msg.ltp !== undefined) {
                categorizeAndUpdate(msg.symbol, msg.ltp, msg.ch, msg.chp);
                // console.log(msg.ltp)
            }
            // console.log(`🔁 Added unknown symbol ${upperSym} to map with LTP: ${msg.ltp}`);
        };

        // Listen to live LTP updates
        unknownSocket.on("message", onMessage);
         console.log(upperSym)
        // Subscribe to the symbol when connected
        unknownSocket.on("connect", () => {
            unknownSocket.subscribe([upperSym]);
            unknownSocket.autoreconnect();
        });

        // Start the connection if it's not already connected
        if (!unknownSocket.isConnected()) {
            unknownSocket.connect();
        } else {
            unknownSocket.subscribe([upperSym]);
        }

        unknownSymbolsSubscribed.add(upperSym);

        resolve();
    });
};


export const unsubscribeUnknownLtp = (symbol) => {
    const upperSym = symbol.toUpperCase();

    if (unknownSymbolsSubscribed.has(upperSym)) {
        unknownSocket.unsubscribe([upperSym]);
        unknownSymbolsSubscribed.delete(upperSym); // 🧹 Clean up
        console.log(`🔕 Unsubscribed ${upperSym} from unknownLtp`);
    } else {
        console.log(`ℹ️ Symbol ${upperSym} was not subscribed via unknownLtp`);
    }
};



export default{
    unknownLtp,
    unsubscribeUnknownLtp
};
