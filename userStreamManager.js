
// const userStreams = {};
// const userSubscriptions = {};

// const categories = ["Dashboard", "Watchlist", "Position", "Investment", "Buy-Sell", "Option-Chain"];

// const exceptionalSymbols = new Set([
//     "NSE:NIFTY50-INDEX",
//     "NSE:NIFTYBANK-INDEX",
//     "BSE:SENSEX-INDEX",
//     "NSE:FINNIFTY-INDEX",
//     "NSE:MIDCPNIFTY-INDEX",
//     "BSE:BANKEX-INDEX"
// ]);

// const { handleMissingSymbol } = require('./fyersHandler');

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

// function startUserStream(userId, res, ltpMap1, ltpMap2, ltpMap3) {
//     initializeUser(userId);

//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");

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
//                     console.log(`[DEBUG] 🔍 Lookup failed: ${upperSym}, attempting fetch from Fyers`);
//                 }

//                 return {
//                     symbol: upperSym,
//                     ltp: data?.ltp ?? null,
//                     ch: data?.ch ?? null,
//                     chp: data?.chp ?? null
//                 };
//             });
//         }

//         res.write(`data: ${JSON.stringify(result)}\n\n`);
//     };

//     const interval = setInterval(sendData, 1000);
//     userStreams[userId] = { res, interval };

//     res.on("close", () => {
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

//         // Check if symbol exists in current map
//         const map = detectMap(upperSym, ltpMap1, ltpMap2, ltpMap3);
//         if (!map[upperSym]) {
//             handleMissingSymbol(userId, upperSym, map);
//         }
//     });
// }

// function removeSymbols(userId, category, symbols, ltpMap1, ltpMap2, ltpMap3) {
//     initializeUser(userId);

//     if (userSubscriptions[userId] && userSubscriptions[userId][category]) {
//         symbols.forEach(sym => {
//             const upperSym = sym.toUpperCase();
//             userSubscriptions[userId][category].delete(upperSym);

//             // Check if symbol exists in current map before removing
//             const map = detectMap(upperSym, ltpMap1, ltpMap2, ltpMap3);
//             if (!map[upperSym]) {
//                 handleMissingSymbol(userId, upperSym, map);
//             }
//         });
//     }
// }


// function cancelUserStream(userId) {
//     if (userStreams[userId]) {
//         clearInterval(userStreams[userId].interval);
//         userStreams[userId].res.end();
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



const WebSocket = require('ws');
const userStreams = {};
const userSubscriptions = {};

const categories = ["Dashboard", "Watchlist", "Position", "Investment", "Buy-Sell", "Option-Chain"];

// const {
//     initializeFyersConnection,
//     ltpMap1,
//     ltpMap2,
//     ltpMap3
// } = require("./fyersLTPService");

const exceptionalSymbols = new Set([
    "NSE:NIFTY50-INDEX",
    "NSE:NIFTYBANK-INDEX",
    "BSE:SENSEX-INDEX",
    "NSE:FINNIFTY-INDEX",
    "NSE:MIDCPNIFTY-INDEX",
    "BSE:BANKEX-INDEX"
]);

const { handleMissingSymbol } = require('./fyersHandler');

function initializeUser(userId) {
    if (!userSubscriptions[userId]) {
        userSubscriptions[userId] = {};
        for (const cat of categories) {
            userSubscriptions[userId][cat] = new Set();
        }
    }
}

function detectMap(symbol, ltpMap1, ltpMap2, ltpMap3) {
    const sym = symbol.toUpperCase();
    // console.log(sym)
    // console.log(sym)
    if (exceptionalSymbols.has(sym)) return ltpMap3;
    if (sym.includes("NIFTY") && !sym.includes("BANK") && !sym.includes("FIN")) return ltpMap1;
    if (sym.includes("SENSEX")) return ltpMap1;
    if (sym.includes("BANKNIFTY") || sym.includes("FINNIFTY")) return ltpMap2;



    // console.log( "yaii",ltpMap3)
    // console.log( "yaii",ltpMap3)
    return ltpMap3;
}

function startUserStream(userId, ws, ltpMap1, ltpMap2, ltpMap3) {
    initializeUser(userId);

    const sendData = () => {
        const userData = userSubscriptions[userId];
        const result = {};

        for (const [category, symbols] of Object.entries(userData)) {
            result[category] = Array.from(symbols).map(sym => {
                const upperSym = sym.toUpperCase();
                const map = detectMap(upperSym, ltpMap1, ltpMap2, ltpMap3);
                const data = map[upperSym];

                if (!data) {
                    handleMissingSymbol(userId, upperSym, map);
                    // console.log(`[DEBUG] 🔍 Lookup failed: ${upperSym}, attempting fetch from Fyers`);
                    // console.log(`[DEBUG] 🔍 Lookup failed: ${upperSym}, attempting fetch from Fyers`);
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
            ws.send(JSON.stringify(result)); // Send data via WebSocket
        }
    };

    const interval = setInterval(sendData, 1000);
    userStreams[userId] = { ws, interval };

    ws.on("close", () => {
        clearInterval(interval);
        delete userStreams[userId];
    });
}

function subscribeSymbols(userId, category, symbols, ltpMap1, ltpMap2, ltpMap3) {
    initializeUser(userId);

    if (!userSubscriptions[userId]) {
        userSubscriptions[userId] = {};
    }

    if (!userSubscriptions[userId][category]) {
        userSubscriptions[userId][category] = new Set();
    }

    symbols.forEach(sym => {
        const upperSym = sym.toUpperCase();
        userSubscriptions[userId][category].add(upperSym);

        // Check if symbol exists in the current map
        const map = detectMap(upperSym, ltpMap1, ltpMap2, ltpMap3);
        // console.log(map)
        // console.log(ltpMap3)
        // Ensure map is defined and contains the symbol
        if (map && map[upperSym]) {
            // Symbol exists in the map
            // console.log(`Symbol ${upperSym} found in map.`);
        } else {
            // Handle missing symbol in map
            // console.log("invalid symbol")
            // handleMissingSymbol(userId, upperSym, map);
        }
    });
}

function removeSymbols(userId, category, symbols, ltpMap1, ltpMap2, ltpMap3) {
    initializeUser(userId);

    if (userSubscriptions[userId] && userSubscriptions[userId][category]) {
        symbols.forEach(sym => {
            const upperSym = sym.toUpperCase();
            userSubscriptions[userId][category].delete(upperSym);

            const map = detectMap(upperSym, ltpMap1, ltpMap2, ltpMap3);
            if (!map || !map[upperSym]) {
                // console.warn(`⚠️ Tried removing invalid/missing symbol: ${upperSym}`);
            }
        });
    } else {
        // console.warn(`⚠️ No existing subscription for user: ${userId}, category: ${category}`);
    }
}

function cancelUserStream(userId) {
    if (userStreams[userId]) {
        clearInterval(userStreams[userId].interval);
        userStreams[userId].ws.close(); // Close WebSocket connection
        delete userStreams[userId];
    }

    if (userSubscriptions[userId]) {
        delete userSubscriptions[userId];
    }
}

module.exports = {
    startUserStream,
    subscribeSymbols,
    removeSymbols,
    cancelUserStream
};
