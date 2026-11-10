import type { SearchPlan, Source } from "./types.js";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions", TAVILY_URL = "https://api.tavily.com/search";
const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
export const hasGroq = () => Boolean(process.env.GROQ_API_KEY);
export const hasTavily = () => Boolean(process.env.TAVILY_API_KEY);

export async function groq(messages: Array<{ role: string; content: string }>, temperature = 0.2): Promise<string> {
  if (!hasGroq()) throw new Error("GROQ_API_KEY is not configured. Copy .env.example to .env and add your free key from console.groq.com.");
  const response = await fetch(GROQ_URL, { method: "POST", headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages, temperature, max_tokens: 4096 }) });
  if (!response.ok) throw new Error(`Groq request failed (${response.status}): ${await response.text()}`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return body.choices?.[0]?.message?.content?.trim() || "I couldn't produce a response.";
}

function parsePlan(raw: string): SearchPlan { const match = raw.match(/\{[\s\S]*\}/); try { const value: { shouldSearch?: unknown; queries?: unknown; rationale?: unknown } = JSON.parse(match?.[0] || raw); return { shouldSearch: Boolean(value.shouldSearch), queries: Array.isArray(value.queries) ? value.queries.slice(0, 3).filter((q: unknown): q is string => typeof q === "string") : [], rationale: String(value.rationale || "") }; } catch { return { shouldSearch: true, queries: [], rationale: "Planner output was malformed; using safe fallback." }; } }

export async function planSearch(context: string, message: string, today: string): Promise<SearchPlan> {
  if (!hasGroq()) {
    // No LLM available — return a no-search plan so the agent can still surface an error
    return { shouldSearch: false, queries: [], rationale: "Groq API key is not configured. Running without LLM." };
  }
  const raw = await groq([{ role: "system", content: `You are a careful search planner. Today is ${today}. Search requests about current facts, prices, releases, recommendations, verification, or changes since a prior chat. Do NOT search simple writing or math. Return ONLY JSON: {"shouldSearch":boolean,"queries":["up to three precise web queries"],"rationale":"short"}. Resolve relative dates against today and include exact dates or year in queries.` }, { role: "user", content: `Conversation context:\n${context}\n\nNew user message:\n${message}` }], 0);
  const plan = parsePlan(raw);
  if (plan.shouldSearch && !plan.queries.length) plan.queries = [message];
  // If Tavily key is missing, skip web search even if the planner wanted it
  if (plan.shouldSearch && !hasTavily()) {
    plan.shouldSearch = false;
    plan.rationale += " (Web search skipped — TAVILY_API_KEY is not configured.)";
  }
  return plan;
}

export async function searchWeb(query: string): Promise<Source[]> {
  if (!hasTavily()) return [];
  const response = await fetch(TAVILY_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, search_depth: "advanced", max_results: 5, include_answer: false, include_raw_content: false, topic: "general" }) });
  if (!response.ok) throw new Error(`Tavily request failed (${response.status}): ${await response.text()}`);
  const body = await response.json() as { results?: Array<{ title?: string; url?: string; content?: string; published_date?: string; score?: number }> };
  return (body.results || []).filter(r => r.url && r.title).map(r => ({ title: r.title!, url: r.url!, snippet: r.content || "", publishedAt: r.published_date, score: r.score }));
}
