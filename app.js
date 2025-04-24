import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws"; // Correct import for ES modules

import { initializeFyersConnection, ltpMap1, ltpMap2, ltpMap3 } from "./fyersLTPService.js";
import { startUserStream, subscribeSymbols, removeSymbols, cancelUserStream } from "./userStreamManager.js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// WebSocket server setup
const wss = new WebSocketServer({ noServer: true }); // Use WebSocketServer instead of WebSocket.Server

wss.on("connection", (ws, req) => {
    const userId = req.url.split("/")[2];
    startUserStream(userId, ws, ltpMap1, ltpMap2, ltpMap3);
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

app.delete("/cancel-ws/:userId", (req, res) => {
    const userId = req.params.userId;
    cancelUserStream(userId);
    res.json({ message: "Stream cancelled successfully" });
});

// Handle WebSocket upgrade
app.server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initializeFyersConnection();
});

app.server.on("upgrade", (request, socket, head) => {
    const userId = request.url.split("/")[2]; // get userId from URL
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});
