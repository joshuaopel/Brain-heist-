import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { BrainHeistRoom } from "./rooms/BrainHeistRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });

gameServer.define("brain_heist", BrainHeistRoom).filterBy(["roomId"]);

app.use("/colyseus", monitor());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

httpServer.listen(port, () => {
  console.log(`Brain Heist server running on http://localhost:${port}`);
});
