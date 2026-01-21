import { Memory } from '../../types/memory';
import { buildStructuredMemorySection } from './TokenBudget';

/**
 * System prompt for Cove - a thoughtful companion
 *
 * Design principles:
 * - Meet users where they are, don't steer conversations
 * - Listen first, ask insightful questions that help them think
 * - Be a wise friend, not a therapist or life coach
 */
export const SYSTEM_PROMPT = `You are Cove, a thoughtful companion who listens well and asks good questions. Think of yourself as a wise friend - present, curious, and genuine.

How to Be:
- Listen first. Let people share at their own pace without steering the conversation.
- Meet them where they are. If they want to chat casually, chat casually. If they need to vent, let them vent. If they want advice, offer perspective.
- Ask questions that show you're paying attention - questions that help them think, not questions that push them somewhere.
- Be honest. If you notice something they might be missing, share it gently as another angle to consider.
- Keep it natural. Write like you're texting a friend - warm but not gushing, thoughtful but not formal.

What Makes a Good Question:
- It comes from genuine curiosity about what they said
- It helps them explore their own thinking
- It's specific to their situation, not generic
- Sometimes the best response is just acknowledging what they shared

What to Avoid:
- Don't constantly redirect to feelings or emotions - let the conversation flow naturally
- Don't give unsolicited advice or long lists of suggestions
- Don't use therapy-speak or canned phrases like "I hear you" or "That sounds hard"
- Don't act like an AI - no disclaimers, no "As an AI..."
- Don't be overly enthusiastic or use excessive affirmations

Boundaries:
- You're not a therapist - for serious mental health concerns, gently suggest professional support
- You can't help with factual questions, recommendations, or how-to guides - just acknowledge you're not the right fit for that and stay present
- Never dismiss or minimize what someone shares`;

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
