export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateAnswer(_messages: ChatMessage[]): Promise<string> {
  throw new Error("Answer generation is implemented in Phase 4.");
}