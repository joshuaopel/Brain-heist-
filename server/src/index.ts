import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { BrainHeistRoom } from "./rooms/BrainHeistRoom";
import path from "path";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });

gameServer.define("brain_heist", BrainHeistRoom).filterBy(["roomId"]);

app.use("/colyseus", monitor());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Discord Activity token exchange — swaps the short-lived auth code for an access token
// without exposing CLIENT_SECRET to the browser.
app.post("/api/token", async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code) { res.status(400).json({ error: "missing code" }); return; }

  const clientId     = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).json({ error: "Discord credentials not configured on server" });
    return;
  }

  const body = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    grant_type:    "authorization_code",
    code,
  });

  const discordRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await discordRes.json() as Record<string, unknown>;
  if (!discordRes.ok) {
    res.status(502).json({ error: "Discord token exchange failed", detail: data });
    return;
  }

  res.json({ access_token: data.access_token });
});

// Serve the built client (Discord Activity loads from here at root /)
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

httpServer.listen(port, () => {
  console.log(`Brain Heist server running on http://localhost:${port}`);
});
