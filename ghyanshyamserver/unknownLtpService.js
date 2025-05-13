
// import { fyersDataSocket } from "fyers-api-v3";
// import { ltpMap1, ltpMap2, ltpMap3 } from "./fyersLTPService.js";

// const alternateToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb0VHdWdtNXhnZm1WMWpHVEhvRW9abVNqb3RmdVhuMTVXSXNhd0x0WWVJQXZXQmRrSGdvY3l5elkzZ1d0a3ByRE8yNzBld1RzMmZGSHZLM2duR0poSV9idF9SLTV4SFNma2hTRnJIcjBkLW1CQmdNaz0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiJlZjI1MzIwYmIxOWI1ZDVhZTJlZWM3MjhmNTIwYTVmZjQyYjM0MWJmZjU5YmI0ZWYwOGUwNDRkYiIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWVUwMjc2MSIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzQ1OTczMDAwLCJpYXQiOjE3NDU5MDY1OTIsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc0NTkwNjU5Miwic3ViIjoiYWNjZXNzX3Rva2VuIn0.3pENLD5d3dd6kE5tySOjbShJb5RaqxmzgBtPTCFo17U";

// const unknownSocket = fyersDataSocket.getInstance(alternateToken);

// function categorizeAndUpdate(symbol, ltp, ch, chp) {
//     const upper = symbol.toUpperCase();
//     const data = { ltp, ch, chp };

//     if (upper === "NSE:NIFTY50-INDEX" || upper === "NSE:NIFTYBANK-INDEX" ||
//         upper === "BSE:SENSEX-INDEX" || upper === "NSE:FINNIFTY-INDEX" ||
//         upper === "NSE:MIDCPNIFTY-INDEX" || upper === "BSE:BANKEX-INDEX") {
//         ltpMap3[upper] = data;
//         return;
//     }

//     if (upper.includes("NIFTY") && !upper.includes("BANK") && !upper.includes("FIN")) {
//         ltpMap1[upper] = data;
//     } else if (upper.includes("SENSEX")) {
//         ltpMap1[upper] = data;
//     } else if (upper.includes("BANKNIFTY") || upper.includes("FINNIFTY")) {
//         ltpMap2[upper] = data;
//     } else {
//         ltpMap3[upper] = data;
//     }
// }

// const unknownSymbolsSubscribed = new Set();

// export const unknownLtp = (symbol) => {
//     const upperSym = symbol.toUpperCase();

//     return new Promise((resolve, reject) => {
//         const onMessage = (msg) => {
//             if (msg.symbol === upperSym && msg.ltp !== undefined) {
//                 categorizeAndUpdate(msg.symbol, msg.ltp, msg.ch, msg.chp);
//                 // console.log(msg.ltp)
//             }
//             // console.log(`🔁 Added unknown symbol ${upperSym} to map with LTP: ${msg.ltp}`);
//         };

//         // Listen to live LTP updates
//         unknownSocket.on("message", onMessage);
//          console.log(upperSym)
//         // Subscribe to the symbol when connected
//         unknownSocket.on("connect", () => {
//             unknownSocket.subscribe([upperSym]);
//             unknownSocket.autoreconnect();
//         });

//         // Start the connection if it's not already connected
//         if (!unknownSocket.isConnected()) {
//             unknownSocket.connect();
//         } else {
//             unknownSocket.subscribe([upperSym]);
//         }

//         unknownSymbolsSubscribed.add(upperSym);

//         resolve();
//     });
// };


// export const unsubscribeUnknownLtp = (symbol) => {
//     const upperSym = symbol.toUpperCase();

//     if (unknownSymbolsSubscribed.has(upperSym)) {
//         unknownSocket.unsubscribe([upperSym]);
//         unknownSymbolsSubscribed.delete(upperSym); // 🧹 Clean up
//         console.log(`🔕 Unsubscribed ${upperSym} from unknownLtp`);
//     } else {
//         console.log(`ℹ️ Symbol ${upperSym} was not subscribed via unknownLtp`);
//     }
// };



// export default{
//     unknownLtp,
//     unsubscribeUnknownLtp
// };


import { fyersDataSocket } from "fyers-api-v3";
import { ltpMap1, ltpMap2, ltpMap3 } from "./fyersLTPService.js";

const alternateToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiZDoxIiwiZDoyIiwieDowIiwieDoxIiwieDoyIl0sImF0X2hhc2giOiJnQUFBQUFCb0lzN3hJOV9VZTgtVWlteDIxNDlUbEUtSnNxQ25fTzd0c2xCdUZsbTh1ajZrOC1UdGp2TkNHZU1LZEhZa2psN1UzQWZGdTVjUG5zNExYUV8zWmdqOWtFdHdTRGRHWWt6Zy0zMUFQZm1Da0VOTHlLQT0iLCJkaXNwbGF5X25hbWUiOiIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiJlZjI1MzIwYmIxOWI1ZDVhZTJlZWM3MjhmNTIwYTVmZjQyYjM0MWJmZjU5YmI0ZWYwOGUwNDRkYiIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWVUwMjc2MSIsImFwcFR5cGUiOjEwMCwiZXhwIjoxNzQ3MTgyNjAwLCJpYXQiOjE3NDcxMTE2NjUsImlzcyI6ImFwaS5meWVycy5pbiIsIm5iZiI6MTc0NzExMTY2NSwic3ViIjoiYWNjZXNzX3Rva2VuIn0.17wfV5HDJeAB2d6f54U95hD8vYUya6MH10ePToD2iVM";
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
