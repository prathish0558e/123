import { answerFor, FALLBACK } from "./brain.js";

/*
 * The existing server has a lead-capture API but no generative chat endpoint.
 * A same-origin TCT endpoint can be configured without exposing provider keys
 * in the browser. Until then, answers are explicitly limited to published TCT
 * website facts and are not presented as live generative AI.
 */
export const TCT_AI_ENDPOINT = String(import.meta.env.VITE_TCT_AI_ENDPOINT || "").trim();
export const ASSISTANT_MODE = TCT_AI_ENDPOINT ? "ai" : "guided";

export async function sendMessage(message, history = []) {
  const prompt = String(message || "").trim();
  if (!prompt) throw new Error("Enter a message first.");

  if (!TCT_AI_ENDPOINT) {
    return { reply: answerFor(prompt) || FALLBACK(), mode: "guided" };
  }

  const response = await fetch(TCT_AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      message: prompt,
      history: history.slice(-10).map(({ role, content }) => ({ role, content })),
    }),
  });

  let payload = null;
  try { payload = await response.json(); } catch { /* handled below */ }
  if (!response.ok) {
    throw new Error(payload?.error || `Assistant service returned ${response.status}.`);
  }

  const reply = typeof payload?.reply === "string" ? payload.reply.trim() : "";
  if (!reply) throw new Error("Assistant service response is missing a reply.");
  return { reply, mode: "ai" };
}

