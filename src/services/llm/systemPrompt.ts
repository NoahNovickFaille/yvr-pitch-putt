import { Memory, FollowUpCandidate } from '../../types/memory';
import { buildStructuredMemorySection } from './TokenBudget';

/**
 * System prompt for Cove - a close confidant
 *
 * Design principles:
 * - Be a genuine friend, not an assistant or therapist
 * - Listen first, respond briefly, ask thoughtful questions
 * - Have personality - opinions, warmth, honesty
 */
export const SYSTEM_PROMPT = `You are Cove, a close confidant - not an assistant, not a helper, a genuine friend. You're present, curious, and real.

How to be:
- Listen first. Let them share without steering the conversation somewhere.
- Match their energy. Casual chat? Be casual. Venting? Just listen. Want advice? Share your honest perspective.
- Keep responses short - usually 1-3 sentences. Let the conversation breathe.
- You have opinions. Share them honestly when relevant, as a friend would.
- Be specific to what they said, never generic.

What to avoid:
- Never lecture, moralize, or give unsolicited advice
- No therapy-speak ("I hear you", "That sounds hard", "It's valid to feel...")
- No AI behavior - no disclaimers, no "As an AI...", no excessive enthusiasm
- Don't constantly redirect to feelings - let conversation flow naturally
- Never start with acknowledgment phrases - just respond naturally

Boundaries:
- For serious mental health concerns, gently suggest professional support
- For off-topic requests (facts, recommendations, how-to guides, trivia, anything not about them or their life): Don't answer the question. Instead, warmly redirect back to them - "I'm more interested in hearing about you" or ask about their day/feelings
- Never dismiss what someone shares`;

/**
 * Stop words for Llama 3.2 models
 *
 * These tokens indicate the end of generation and should trigger completion.
 * Covers various formats used by different Llama 3.2 variants.
 */
export const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>',
  '<|endoftext|>',
];

/**
 * Builds user context section for the system prompt.
 * This is placed prominently so the LLM always knows who it's talking to.
 */
export function buildUserContext(userName: string | null, userBio: string | null): string | null {
  if (!userName) {
    return null;
  }

  let context = `\n\nIMPORTANT - The person you're talking with:\n- Name: ${userName}`;

  if (userBio && userBio.trim()) {
    context += `\n- About them: ${userBio.trim()}`;
  }

  context += `\n\nAddress them by name naturally in conversation.`;

  return context;
}

/**
 * Builds system prompt with user context and injected memories.
 *
 * Memories are added naturally - the AI should reference them
 * organically without explicitly saying "I remember."
 */
export function buildSystemPromptWithMemories(
  memorySection: string | null,
  userName: string | null = null,
  userBio: string | null = null
): string {
  let prompt = SYSTEM_PROMPT;

  // Add user context first
  const userContext = buildUserContext(userName, userBio);
  if (userContext) {
    prompt += userContext;
  }

  // Add memories section
  if (memorySection) {
    const instruction = `
${memorySection}

Reference these memories naturally when relevant - don't say "I remember" or "you told me", just use the information as if you know them.`;
    prompt += instruction;
  }

  return prompt;
}

/**
 * Builds system prompt with structured memory sections.
 *
 * Uses hierarchical organization (HIE-03):
 * - About them (identity + relationship)
 * - Current situation (situation + emotion)
 * - Relevant context (preference + event)
 *
 * This async version should be preferred when structured sections are available.
 *
 * @param memories - Retrieved memories to inject
 * @param userName - Optional user name
 * @param userBio - Optional user bio
 * @returns Complete system prompt with structured memory context
 */
export async function buildSystemPromptWithStructuredMemories(
  memories: Memory[],
  userName: string | null = null,
  userBio: string | null = null
): Promise<string> {
  let prompt = SYSTEM_PROMPT;

  // Add user context first
  const userContext = buildUserContext(userName, userBio);
  if (userContext) {
    prompt += userContext;
  }

  // Add structured memory sections
  if (memories.length > 0) {
    const structuredSection = await buildStructuredMemorySection(memories);
    if (structuredSection) {
      const instruction = `

${structuredSection}

Reference this information naturally when relevant - don't say "I remember" or "you told me", just use it as if you know them.`;
      prompt += instruction;
    }
  }

  return prompt;
}

/**
 * Build a follow-up context section for the system prompt.
 * Instructs the LLM to open the conversation by checking in about a topic.
 */
export function buildFollowUpSection(followUp: FollowUpCandidate): string {
  return `

IMPORTANT — Follow-up check-in:
They previously mentioned: "${followUp.sourceContent}"
Open the conversation by naturally checking in about their ${followUp.topic}. Be warm and brief — one short question. Don't say "I remember" or "you mentioned", just ask naturally like a friend who was thinking about them.`;
}
