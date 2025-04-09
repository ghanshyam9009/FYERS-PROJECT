
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const {
    initializeFyersConnection,
    ltpMap1,
    ltpMap2,
    ltpMap3
} = require("./fyersLTPService");

const {
    startUserStream,
    subscribeSymbols,
    removeSymbols,
    cancelUserStream
} = require("./userStreamManager");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

app.get("/get-sse/:userId", (req, res) => {
    const userId = req.params.userId;
    startUserStream(userId, res, ltpMap1, ltpMap2, ltpMap3);
});

app.post("/subscribe", (req, res) => {
    const { userId, category, symbols } = req.body;
    if (!userId || !category || !symbols?.length) {
        return res.status(400).json({ error: "Missing userId, category, or symbols" });
    }
    subscribeSymbols(userId, category, symbols);
    res.json({ message: "Subscribed successfully" });
});

app.post("/unsubscribe", (req, res) => {
    const { userId, category, symbols } = req.body;
    if (!userId || !category || !symbols?.length) {
        return res.status(400).json({ error: "Missing userId, category, or symbols" });
    }
    removeSymbols(userId, category, symbols);
    res.json({ message: "Removed successfully" });
});

app.delete("/cancel-sse/:userId", (req, res) => {
    const userId = req.params.userId;
    cancelUserStream(userId);
    res.json({ message: "SSE cancelled successfully" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initializeFyersConnection();
});
