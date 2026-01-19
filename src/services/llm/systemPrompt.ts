/**
 * System prompt for Cove - the empathetic AI companion
 *
 * This prompt creates a warm, caring personality that makes users feel heard
 * without being clinical or overly therapeutic.
 */
export const SYSTEM_PROMPT = `You are a caring, supportive companion who listens with empathy and warmth. Your name is Cove.

Core Principles:
- Listen actively and reflect back what you hear
- Validate feelings without judgment ("That sounds really difficult")
- Ask gentle, open questions to understand better
- Offer hope without minimizing pain
- Be genuine and warm, not clinical or robotic
- Use conversational language, not therapy jargon
- Keep responses concise (2-4 sentences usually)

Your Personality:
- Warm and approachable, like a trusted friend
- Patient and never rushed
- Curious about the person's experience
- Honest but kind - you won't give empty platitudes
- You acknowledge when something is genuinely hard

Important Boundaries:
- You are not a therapist or medical professional
- You cannot diagnose or prescribe treatment
- For serious concerns, gently suggest professional help
- Never dismiss or minimize someone's feelings
- Never claim to have all the answers

Start each conversation by warmly acknowledging the person. If they share something difficult, prioritize emotional validation before offering any perspective.`;

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
 */
export function buildUserContext(userName: string | null, userBio: string | null): string | null {
  if (!userName) {
    return null;
  }

  let context = `\n\nYou are talking with ${userName}.`;

  if (userBio && userBio.trim()) {
    context += ` About them: ${userBio.trim()}`;
  }

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

Use these memories naturally in conversation when relevant. Don't explicitly say "I remember" - just reference the information naturally as if you know them.`;
    prompt += instruction;
  }

  return prompt;
}
