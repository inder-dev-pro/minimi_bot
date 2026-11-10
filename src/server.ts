import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getHistory, getSources, listConversations } from "./db.js";
import { runAgent } from "./agent.js";

const app = express(); const port = Number(process.env.PORT || 3000);
const origins = process.env.ALLOWED_ORIGIN?.split(",").map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => { if (origins?.length && req.headers.origin && !origins.includes(req.headers.origin)) return res.status(403).json({ error: "Origin not allowed" }); res.setHeader("X-Content-Type-Options", "nosniff"); next(); });
app.use(express.json({ limit: "32kb" })); app.use(express.static("public"));
const hits = new Map<string, number[]>();
function allow(req: express.Request) { const key = req.ip || "anonymous", now = Date.now(), times = (hits.get(key) || []).filter(t => now - t < 60_000); times.push(now); hits.set(key, times); return times.length <= 12; }
const request = z.object({
  message: z.string().trim().min(1).max(8000),
  conversationId: z.preprocess(v => (v === "" || v === null ? undefined : v), z.string().uuid().optional())
});
app.get("/api/health", (_req, res) => res.json({ ok: true, model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", search: Boolean(process.env.TAVILY_API_KEY), llm: Boolean(process.env.GROQ_API_KEY) }));
app.get("/api/conversations", (_req, res) => res.json({ conversations: listConversations() }));
app.get("/api/conversations/:id", (req, res) => { const messages = getHistory(req.params.id, 100).map(m => ({ ...m, sources: m.role === "assistant" ? getSources(m.id) : [] })); res.json({ messages }); });
app.post("/api/chat", async (req, res) => {
  if (!allow(req)) return res.status(429).json({ error: "Too many requests; try again in a minute." });
  const parsed = request.safeParse(req.body);
  if (!parsed.success) {
    const isConvErr = parsed.error.issues.every(i => i.path[0] === "conversationId");
    return res.status(400).json({ error: isConvErr ? "Invalid conversation ID." : "Provide a message up to 8,000 characters." });
  }
  const conversationId = parsed.data.conversationId || randomUUID();
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  const emit = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try { await runAgent(conversationId, parsed.data.message, emit); } catch (error) { emit("error", { message: error instanceof Error ? error.message : "The agent failed unexpectedly." }); } finally { res.end(); }
});
app.listen(port, () => {
  console.log(`Minimi running at http://localhost:${port}`);
  if (!process.env.GROQ_API_KEY) console.warn("⚠  GROQ_API_KEY is not set — LLM calls will fail. Add it to .env");
  if (!process.env.TAVILY_API_KEY) console.warn("⚠  TAVILY_API_KEY is not set — web search is disabled. Add it to .env");
});
