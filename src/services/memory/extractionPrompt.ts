/**
 * Simplified memory extraction prompt optimized for small (3B) models
 * Uses few-shot examples to guide extraction
 */
export const MEMORY_EXTRACTION_PROMPT = `Extract key facts about the user from this conversation.

Examples:

Conversation:
User: Hi, I'm Sarah. I've been feeling stressed about my new job.
Assistant: Nice to meet you, Sarah. Starting a new job can be stressful. What's been the hardest part?

Output: {"memories":[{"content":"User's name is Sarah","type":"fact"},{"content":"User started a new job recently","type":"fact"},{"content":"User is feeling stressed about work","type":"emotion"}]}

Conversation:
User: My sister Emma is visiting next week. We're going hiking together.
Assistant: That sounds fun! Do you two hike often?

Output: {"memories":[{"content":"User has a sister named Emma","type":"fact"},{"content":"Emma is visiting next week","type":"event"},{"content":"User enjoys hiking","type":"fact"}]}

Conversation:
User: I had a rough day at work today.
Assistant: I'm sorry to hear that. Want to talk about it?
User: Just tired. My manager was being difficult.
Assistant: That's frustrating. How are you feeling now?

Output: {"memories":[{"content":"User had a difficult day at work","type":"event"},{"content":"User is feeling tired","type":"emotion"}]}

Now extract memories from this conversation. Only extract information the USER directly stated. Output valid JSON only:`;

/**
 * Simplified schema for 3B model compatibility
 * Removed complex importance/category scoring that causes "constraint collapse"
 */
export const MEMORY_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    memories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          type: { type: 'string', enum: ['fact', 'emotion', 'event'] }
        },
        required: ['content', 'type']
      }
    }
  },
  required: ['memories']
};
