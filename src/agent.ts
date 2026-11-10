import { getHistory, saveMessage, saveSources } from "./db.js";
import { groq, hasGroq, hasTavily, planSearch, searchWeb } from "./providers.js";
import type { Source } from "./types.js";

export type Emit = (event: string, payload: unknown) => void;
const date = () => new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", dateStyle: "full" }).format(new Date());
const compact = (value: string, n = 6000) => value.length > n ? `${value.slice(0, n)}\n[trimmed]` : value;

function context(history: ReturnType<typeof getHistory>) {
  return history.map(m => `[${m.createdAt}] ${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
}
function dedupe(sources: Source[]) { const seen = new Set<string>(); return sources.filter(s => !seen.has(s.url) && seen.add(s.url)).slice(0, 10); }

export async function runAgent(conversationId: string, userMessage: string, emit: Emit) {
  if (!hasGroq()) throw new Error("GROQ_API_KEY is not configured. Copy .env.example to .env and add your free key from console.groq.com.");
  const user = saveMessage(conversationId, "user", userMessage);
  const history = getHistory(conversationId);
  const prior = context(history.slice(0, -1));
  emit("status", { label: "Reviewing conversation memory" });
  const today = date();
  const plan = await planSearch(compact(prior), userMessage, today);
  emit("plan", { ...plan, today });
  let sources: Source[] = [];
  if (plan.shouldSearch) {
    emit("status", { label: `Searching ${plan.queries.length} live source${plan.queries.length === 1 ? "" : "s"}` });
    const results = await Promise.allSettled(plan.queries.map(searchWeb));
    sources = dedupe(results.flatMap(r => r.status === "fulfilled" ? r.value : []));
    emit("sources", sources);
  }
  emit("status", { label: "Writing a grounded answer" });
  const searchDisabledNote = !hasTavily() && plan.rationale.includes("TAVILY_API_KEY")
    ? "Live web search is unavailable because TAVILY_API_KEY is not configured. Note clearly if up-to-date verification requires web search."
    : "No web search was needed or no live sources were returned.";
  const evidence = sources.length ? sources.map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\nPublished: ${s.publishedAt || "unknown"}\n${s.snippet}`).join("\n\n") : searchDisabledNote;
  const answer = await groq([
    { role: "system", content: `You are Minimi, a sharp, candid web research agent. Current date: ${today}. You have exactly one external capability: web search. Answer the user directly and conversationally. Treat stored conversation as the record of prior asks; distinguish its timestamp from today's facts. If evidence is provided, use it faithfully, note uncertainty or stale publication dates, and cite claims inline as [1], [2]. Never invent citations. If there is no evidence, do not pretend you searched. Keep the answer practical and concise.` },
    { role: "user", content: `Relevant conversation record:\n${compact(context(history))}\n\nLive web evidence:\n${compact(evidence, 12000)}\n\nAnswer the latest message.` }
  ]);
  // Chunking preserves the streaming UI contract even though this provider endpoint returns one completion.
  for (const token of answer.match(/\S+\s*/g) || []) emit("token", token);
  const assistant = saveMessage(conversationId, "assistant", answer);
  saveSources(assistant.id, sources);
  emit("done", { messageId: assistant.id, conversationId, sources });
}
