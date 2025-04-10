
const userStreams = {};
const userSubscriptions = {};

const categories = ["Dashboard", "Watchlist", "Position", "Investment", "Buy-Sell", "Option-Chain"];

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

    // Force lookup in ltpMap3 if symbol is an exception
    if (exceptionalSymbols.has(sym)) return ltpMap3;

    if (sym.includes("NIFTY") && !sym.includes("BANK") && !sym.includes("FIN")) return ltpMap1;
    if (sym.includes("SENSEX")) return ltpMap1;
    if (sym.includes("BANKNIFTY") || sym.includes("FINNIFTY")) return ltpMap2;

    return ltpMap3;
}


function startUserStream(userId, res, ltpMap1, ltpMap2, ltpMap3) {
    initializeUser(userId);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendData = () => {
        const userData = userSubscriptions[userId];
        const result = {};

        for (const [category, symbols] of Object.entries(userData)) {
            result[category] = Array.from(symbols).map(sym => {
                const upperSym = sym.toUpperCase();
                const map = detectMap(upperSym, ltpMap1, ltpMap2, ltpMap3);
                const ltp = map[upperSym];

                if (ltp === undefined) {
                    console.log(`[DEBUG] 🔍 Lookup failed: ${upperSym} in ${Object.keys(map)[0]}`);
                }

                return {
                    symbol: upperSym,
                    ltp: ltp ?? null
                };
            });
        }

        res.write(`data: ${JSON.stringify(result)}\n\n`);
    };

    const interval = setInterval(sendData, 1000);
    userStreams[userId] = { res, interval };

    res.on("close", () => {
        clearInterval(interval);
        delete userStreams[userId];
    });
}

// function subscribeSymbols(userId, category, symbols) {
//     initializeUser(userId);
//     symbols.forEach(sym => userSubscriptions[userId][category].add(sym.toUpperCase()));
// }

// function removeSymbols(userId, category, symbols) {
//     initializeUser(userId);
//     symbols.forEach(sym => userSubscriptions[userId][category].delete(sym.toUpperCase()));
// }


function subscribeSymbols(userId, category, symbols) {
    initializeUser(userId);

    if (!userSubscriptions[userId]) {
        userSubscriptions[userId] = {};
    }

    if (!userSubscriptions[userId][category]) {
        userSubscriptions[userId][category] = new Set();
    }

    symbols.forEach(sym => userSubscriptions[userId][category].add(sym.toUpperCase()));
}


function removeSymbols(userId, category, symbols) {
    initializeUser(userId);

    if (
        userSubscriptions[userId] &&
        userSubscriptions[userId][category]
    ) {
        symbols.forEach(sym => userSubscriptions[userId][category].delete(sym.toUpperCase()));
    }
}


function cancelUserStream(userId) {
    if (userStreams[userId]) {
        clearInterval(userStreams[userId].interval);
        userStreams[userId].res.end();
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
