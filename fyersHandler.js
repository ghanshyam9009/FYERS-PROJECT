const axios = require('axios');

// Dummy function to simulate Fyers call — replace with real credentials and logic
async function fetchLtpFromFyers(symbol) {
    try {
        const fyersSymbol = symbol.replace(':', '-'); // Convert NSE:RELIANCE -> NSE-RELIANCE
        const response = await axios.get(`https://api.fyers.in/api/quote/${fyersSymbol}`);
        return {
            ltp: response.data.ltp,
            ch: response.data.ch,
            chp: response.data.chp
        };
    } catch (err) {
        console.error(`[ERROR] Failed to fetch from Fyers for ${symbol}:`, err.message);
        return null;
    }
}

// Called by streamManager when a symbol is missing in map
async function handleMissingSymbol(userId, symbol, mapToUpdate) {
    const ltpData = await fetchLtpFromFyers(symbol);
    if (ltpData) {
        mapToUpdate[symbol] = ltpData;
        console.log(`[INFO] 🔁 Updated ${symbol} with live LTP from Fyers for user ${userId}`);
    }
}

module.exports = {
    handleMissingSymbol
};
