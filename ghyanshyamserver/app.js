// import express from "express";
// import cors from "cors";
// import bodyParser from "body-parser";
// import { WebSocketServer } from "ws"; // Correct import for ES modules

// import { initializeFyersConnection, ltpMap1, ltpMap2, ltpMap3 } from "./fyersLTPService.js";
// import { startUserStream, subscribeSymbols, removeSymbols, cancelUserStream } from "./userStreamManager.js";

// const app = express();
// const PORT = 3000;

// app.use(cors());
// app.use(bodyParser.json());

// // WebSocket server setup
// const wss = new WebSocketServer({ noServer: true }); // Use WebSocketServer instead of WebSocket.Server

// wss.on("connection", (ws, req) => {
//     const userId = req.url.split("/")[2];
//     startUserStream(userId, ws, ltpMap1, ltpMap2, ltpMap3);
// });

// app.post("/subscribe", (req, res) => {
//     const { userId, category, symbols } = req.body;
//     if (!userId || !category || !symbols?.length) {
//         return res.status(400).json({ error: "Missing userId, category, or symbols" });
//     }
//     subscribeSymbols(userId, category, symbols);
//     res.json({ message: "Subscribed successfully" });
// });

// app.post("/unsubscribe", (req, res) => {
//     const { userId, category, symbols } = req.body;
//     if (!userId || !category || !symbols?.length) {
//         return res.status(400).json({ error: "Missing userId, category, or symbols" });
//     }
//     removeSymbols(userId, category, symbols);
//     res.json({ message: "Removed successfully" });
// });

// app.delete("/cancel-ws/:userId", (req, res) => {
//     const userId = req.params.userId;
//     cancelUserStream(userId);
//     res.json({ message: "Stream cancelled successfully" });
// });

// // Handle WebSocket upgrade
// app.server = app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
//     initializeFyersConnection();
// });

// app.server.on("upgrade", (request, socket, head) => {
//     const userId = request.url.split("/")[2]; // get userId from URL
//     wss.handleUpgrade(request, socket, head, (ws) => {
//         wss.emit("connection", ws, request);
//     });
// });


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

// Subscribe route
app.post("/subscribe", async (req, res) => {
    try {
        const { userId, category, symbols } = req.body;
        if (!userId || !category || !symbols?.length) {
            return res.status(400).json({ error: "Missing userId, category, or symbols" });
        }
        await subscribeSymbols(userId, category, symbols);
        res.json({ message: "Subscribed successfully" });
    } catch (error) {
        console.error("Error in /subscribe:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Unsubscribe route
app.post("/unsubscribe", async (req, res) => {
    try {
        const { userId, category, symbols } = req.body;
        if (!userId || !category || !symbols?.length) {
            return res.status(400).json({ error: "Missing userId, category, or symbols" });
        }
        await removeSymbols(userId, category, symbols);
        res.json({ message: "Removed successfully" });
    } catch (error) {
        console.error("Error in /unsubscribe:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Cancel WebSocket stream
app.delete("/cancel-ws/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        await cancelUserStream(userId);
        res.json({ message: "Stream cancelled successfully" });
    } catch (error) {
        console.error("Error in /cancel-ws:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Handle WebSocket upgrade
app.server = app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
        await initializeFyersConnection();
        console.log("Fyers connection initialized");
    } catch (error) {
        console.error("Failed to initialize Fyers connection:", error);
    }
});

app.server.on("upgrade", (request, socket, head) => {
    const userId = request.url.split("/")[2]; // get userId from URL
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});
