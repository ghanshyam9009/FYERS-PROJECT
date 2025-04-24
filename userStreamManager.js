// const WebSocket = require('ws');
// const { ltpMap1, ltpMap2, ltpMap3 } = require('./fyersLTPService');
// const userStreams = {};
// const userSubscriptions = {};


// // const { ltpMap1, ltpMap2, ltpMap3 } = require('./fyersLTPService'); 

// ltpMap2
// ltpMap3
// ltpMap1

// const categories = ["Dashboard", "Watchlist", "Position", "Investment", "Buy-Sell", "Option-Chain"];

// const exceptionalSymbols = new Set([
//     "NSE:NIFTY50-INDEX",
//     "NSE:NIFTYBANK-INDEX",
//     "BSE:SENSEX-INDEX",
//     "NSE:FINNIFTY-INDEX",
//     "NSE:MIDCPNIFTY-INDEX",
//     "BSE:BANKEX-INDEX"
// ]);


// function initializeUser(userId) {
//     if (!userSubscriptions[userId]) {
//         userSubscriptions[userId] = {};
//         for (const cat of categories) {
//             userSubscriptions[userId][cat] = new Set();
//         }
//     }
// }

// function detectMap(symbol, ltpMap1, ltpMap2, ltpMap3) {
//     const sym = symbol.toUpperCase();
//     if (exceptionalSymbols.has(sym)) return ltpMap3;
//     if (sym.includes("NIFTY") && !sym.includes("BANK") && !sym.includes("FIN")) return ltpMap1;
//     if (sym.includes("SENSEX")) return ltpMap1;
//     if (sym.includes("BANKNIFTY") || sym.includes("FINNIFTY")) return ltpMap2;

//     return ltpMap3;
// }

// function startUserStream(userId, ws, ltpMap1, ltpMap2, ltpMap3) {
//     initializeUser(userId);

//     const sendData = () => {
//         const userData = userSubscriptions[userId];
//         const result = {};

//         for (const [category, symbols] of Object.entries(userData)) {
//             result[category] = Array.from(symbols).map(sym => {
//                 const upperSym = sym.toUpperCase();
//                 const map = detectMap(upperSym, ltpMap1, ltpMap2, ltpMap3);
//                 const data = map[upperSym];

//                 if (!data) {
//                     handleMissingSymbol(userId, upperSym, map);
//                 }

//                 return {
//                     symbol: upperSym,
//                     ltp: data?.ltp ?? null,
//                     ch: data?.ch ?? null,
//                     chp: data?.chp ?? null
//                 };
//             });
//         }

//         if (ws.readyState === WebSocket.OPEN) {
//             ws.send(JSON.stringify(result)); // Send data via WebSocket
//         }
//     };

//     const interval = setInterval(sendData, 1000);
//     userStreams[userId] = { ws, interval };

//     ws.on("close", () => {
//         clearInterval(interval);
//         delete userStreams[userId];
//     });
// }

// function subscribeSymbols(userId, category, symbols, ltpMap1, ltpMap2, ltpMap3) {
//     initializeUser(userId);

//     if (!userSubscriptions[userId]) {
//         userSubscriptions[userId] = {};
//     }

//     if (!userSubscriptions[userId][category]) {
//         userSubscriptions[userId][category] = new Set();
//     }

//     symbols.forEach(sym => {
//         const upperSym = sym.toUpperCase();
//         userSubscriptions[userId][category].add(upperSym);

//         // Check if symbol exists in the current map
//         const map = detectMap(upperSym, ltpMap1, ltpMap2, ltpMap3);
//         console.log(map)
//         console.log(ltpMap3)
//         // Ensure map is defined and contains the symbol
//         if (map && map[upperSym]) {
//             // Symbol exists in the map
//             console.log(`Symbol ${upperSym} found in map.`);
//         } else {
//             // Handle missing symbol in map
//             console.log("invalid symbol")

//         }
//     });
// }

// function removeSymbols(userId, category, symbols, ltpMap1, ltpMap2, ltpMap3) {
//     initializeUser(userId);

//     if (userSubscriptions[userId] && userSubscriptions[userId][category]) {
//         symbols.forEach(sym => {
//             const upperSym = sym.toUpperCase();
//             userSubscriptions[userId][category].delete(upperSym);

//             const map = detectMap(upperSym, ltpMap1, ltpMap2, ltpMap3);
//             if (!map || !map[upperSym]) {
//                 console.warn(`⚠️ Tried removing invalid/missing symbol: ${upperSym}`);
//             }
//         });
//     } else {
//         console.warn(`⚠️ No existing subscription for user: ${userId}, category: ${category}`);
//     }
// }

// function cancelUserStream(userId) {
//     if (userStreams[userId]) {
//         clearInterval(userStreams[userId].interval);
//         userStreams[userId].ws.close(); // Close WebSocket connection
//         delete userStreams[userId];
//     }

//     if (userSubscriptions[userId]) {
//         delete userSubscriptions[userId];
//     }
// }

// module.exports = {
//     startUserStream,
//     subscribeSymbols,
//     removeSymbols,
//     cancelUserStream
// };

import WebSocket from 'ws';
import { ltpMap1, ltpMap2, ltpMap3 } from './fyersLTPService.js';
import { unknownLtp, unsubscribeUnknownLtp } from './unknownLtpService.js';

// const WebSocket = require('ws');
// const { ltpMap1, ltpMap2, ltpMap3 } = require('./fyersLTPService');
// const { unknownLtp } = require("./unknownLtpService");


const userStreams = {};
const userSubscriptions = {};

const categories = ["Dashboard", "Watchlist", "Position", "Investment", "Buy-Sell", "Option-Chain"];

const exceptionalSymbols = new Set([
    "NSE:NIFTY50-INDEX",
    "NSE:NIFTYBANK-INDEX",
    "BSE:SENSEX-INDEX",
    "NSE:FINNIFTY-INDEX",
    "NSE:MIDCPNIFTY-INDEX",
    "BSE:BANKEX-INDEX"
]);

function initializeUser(userId) {
    if (!userSubscriptions[userId]) {
        userSubscriptions[userId] = {};
        for (const cat of categories) {
            userSubscriptions[userId][cat] = new Set();
        }
    }
}

function detectMap(symbol) {
    const sym = symbol.toUpperCase();
    if (exceptionalSymbols.has(sym)) return ltpMap3;
    if (sym.includes("NIFTY") && !sym.includes("BANK") && !sym.includes("FIN")) return ltpMap1;
    if (sym.includes("SENSEX")) return ltpMap1;
    if (sym.includes("BANKNIFTY") || sym.includes("FINNIFTY")) return ltpMap2;
    return ltpMap3;
}

function handleMissingSymbol(userId, symbol, map) {
    console.warn(`⚠️ [${userId}] Missing data for symbol ${symbol} in map.`);
}

export function startUserStream(userId, ws) {
    initializeUser(userId);

    const sendData = () => {
        const userData = userSubscriptions[userId];
        const result = {};

        for (const [category, symbols] of Object.entries(userData)) {
            result[category] = Array.from(symbols).map(sym => {
                const upperSym = sym.toUpperCase();
                const map = detectMap(upperSym);
                const data = map[upperSym];

                if (!data) {
                    handleMissingSymbol(userId, upperSym, map);
                }

                return {
                    symbol: upperSym,
                    ltp: data?.ltp ?? null,
                    ch: data?.ch ?? null,
                    chp: data?.chp ?? null
                };
            });
        }

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(result));
        }
    };

    const interval = setInterval(sendData, 1000);
    userStreams[userId] = { ws, interval };

    ws.on("close", () => {
        clearInterval(interval);
        delete userStreams[userId];
    });
}

export function subscribeSymbols(userId, category, symbols) {
    initializeUser(userId);

    if (!userSubscriptions[userId][category]) {
        userSubscriptions[userId][category] = new Set();
    }

    symbols.forEach(sym => {
        const upperSym = sym.toUpperCase();
        userSubscriptions[userId][category].add(upperSym);

        const map = detectMap(upperSym);
        const exists = map && map[upperSym];

        if (exists) {
            console.log(`✅ Symbol ${upperSym} found in correct map.`);
        } else {
            console.log(`❌ Invalid symbol: ${upperSym} — fetching from alternate Fyers socket...`);
            try {
                // // await unknownLtp(upperSym);
                async function processUnknownSymbol(upperSym) {
                    await unknownLtp(upperSym);
                }
                
                processUnknownSymbol(upperSym)
                console.log(`✅ Symbol ${upperSym} fetched and added.`);
            } catch (err) {
                console.error(`❌ Could not fetch ${upperSym}: ${err.message}`);
            }
        }
    });
}
export function removeSymbols(userId, category, symbols) {
    initializeUser(userId);

    if (userSubscriptions[userId] && userSubscriptions[userId][category]) {
        symbols.forEach(sym => {
            const upperSym = sym.toUpperCase();
            userSubscriptions[userId][category].delete(upperSym);

            const map = detectMap(upperSym);
            if (!map || !map[upperSym]) {
                console.warn(`⚠️ Tried removing invalid/missing symbol: ${upperSym}`);
                unsubscribeUnknownLtp(upperSym); // 🆕 Attempt to stop from Fyers unknown
            }
        });
    } else {
        console.warn(`⚠️ No existing subscription for user: ${userId}, category: ${category}`);
    }
}


export function cancelUserStream(userId) {
    if (userStreams[userId]) {
        clearInterval(userStreams[userId].interval);
        userStreams[userId].ws.close();
        delete userStreams[userId];
    }

    if (userSubscriptions[userId]) {
        delete userSubscriptions[userId];
    }
}

export default {
    startUserStream,
    subscribeSymbols,
    removeSymbols,
    cancelUserStream
};
