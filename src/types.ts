export type Role = "user" | "assistant" | "system";
export interface ChatMessage { id: number; conversationId: string; role: Role; content: string; createdAt: string; }
export interface Source { id?: number; messageId?: number; title: string; url: string; snippet: string; publishedAt?: string; score?: number; }
export interface SearchPlan { shouldSearch: boolean; queries: string[]; rationale: string; }
