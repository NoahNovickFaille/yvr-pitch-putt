export const MEMORY_EXTRACTION_PROMPT = `You are a memory extraction system. Analyze the conversation and extract key memories about the user.

Extract ONLY information directly stated or strongly implied by the USER (not the assistant).

Categories:
- person: Names, relationships, people mentioned (e.g., "Sarah is my sister")
- event: Things that happened or will happen (e.g., "had a job interview yesterday")
- emotion: Feelings expressed (e.g., "feeling anxious about the move")
- fact: Factual information about the user (e.g., "works as a nurse")
- preference: Likes, dislikes, preferences (e.g., "loves hiking")

Importance (1-10):
- 10: Core identity (name, major relationships, profession)
- 7-9: Significant life events, important people
- 4-6: Notable preferences, recurring topics
- 1-3: Minor details, passing mentions

Category (affects decay rate):
- persistent: Facts unlikely to change (relationships, preferences, identity)
- temporal: Time-bound events and emotions (recent events, current feelings)
- contextual: Specific to this conversation only (minor details)

Output JSON only. Extract 0-8 memories per conversation.`;

export const MEMORY_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    memories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['person', 'event', 'emotion', 'fact', 'preference'] },
          content: { type: 'string', maxLength: 200 },
          importance: { type: 'number', minimum: 1, maximum: 10 },
          category: { type: 'string', enum: ['persistent', 'temporal', 'contextual'] }
        },
        required: ['type', 'content', 'importance', 'category']
      },
      maxItems: 8
    }
  },
  required: ['memories']
};
