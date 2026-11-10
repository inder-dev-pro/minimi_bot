import Database from "better-sqlite3";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ChatMessage, Role, Source } from "./types.js";
const dbPath = process.env.DATABASE_PATH || "./data/minimi.sqlite";
mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath); db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(conversation_id) REFERENCES conversations(id));
CREATE TABLE IF NOT EXISTS sources (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id INTEGER NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, snippet TEXT NOT NULL, published_at TEXT, score REAL, FOREIGN KEY(message_id) REFERENCES messages(id));
CREATE INDEX IF NOT EXISTS messages_conversation_created ON messages(conversation_id, created_at); CREATE INDEX IF NOT EXISTS sources_message ON sources(message_id);`);

// Seed sample data when the database has no conversations yet so new users see demo conversations immediately
const existing = db.prepare("SELECT COUNT(*) as count FROM conversations").get() as { count: number };
if (existing.count === 0) {
  const seedCandidates = [resolve(dirname(dbPath), "seed.sql"), resolve(process.cwd(), "data/seed.sql")];
  const seedPath = seedCandidates.find(p => existsSync(p));
  if (seedPath) {
    try { db.exec(readFileSync(seedPath, "utf-8")); console.log("✓ Seeded database with sample conversations"); } catch (e) { console.warn("Seed data warning:", e instanceof Error ? e.message : e); }
  }
}

export function saveMessage(conversationId: string, role: Role, content: string): ChatMessage { db.prepare("INSERT OR IGNORE INTO conversations (id) VALUES (?)").run(conversationId); const result = db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(conversationId, role, content); return db.prepare("SELECT id, conversation_id as conversationId, role, content, created_at as createdAt FROM messages WHERE id = ?").get(result.lastInsertRowid) as ChatMessage; }
export function getHistory(conversationId: string, limit = 24): ChatMessage[] { return db.prepare("SELECT id, conversation_id as conversationId, role, content, created_at as createdAt FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?").all(conversationId, limit).reverse() as ChatMessage[]; }
export function saveSources(messageId: number, sources: Source[]) { const stmt = db.prepare("INSERT INTO sources (message_id, title, url, snippet, published_at, score) VALUES (?, ?, ?, ?, ?, ?)"); db.transaction((rows: Source[]) => rows.forEach(s => stmt.run(messageId, s.title, s.url, s.snippet, s.publishedAt || null, s.score || null)))(sources); }
export function getSources(messageId: number): Source[] { return db.prepare("SELECT id, message_id as messageId, title, url, snippet, published_at as publishedAt, score FROM sources WHERE message_id = ?").all(messageId) as Source[]; }
export function listConversations(): Array<{ id: string; createdAt: string; preview: string }> { return db.prepare("SELECT c.id, c.created_at as createdAt, COALESCE((SELECT SUBSTR(content, 1, 100) FROM messages WHERE conversation_id = c.id AND role = 'user' ORDER BY id LIMIT 1), '') as preview FROM conversations c WHERE EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id) ORDER BY c.created_at DESC LIMIT 20").all() as Array<{ id: string; createdAt: string; preview: string }>; }
