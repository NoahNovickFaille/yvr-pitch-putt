/**
 * Memory extraction prompt with category classification.
 * Optimized for small (3B) models with clear few-shot examples.
 *
 * Categories:
 * - identity: Core facts (name, age, job, traits)
 * - relationship: People (family, friends, partners)
 * - situation: Current circumstances (challenges, changes)
 * - preference: Likes/dislikes (activities, habits)
 * - event: Specific happenings (appointments, milestones)
 * - emotion: Current feelings (moods, emotional states)
 *
 * Reference: HIE-02 requirement
 */
export const MEMORY_EXTRACTION_PROMPT = `Extract key information about the user from this conversation.
Categorize each memory:
- identity: name, age, job, core traits
- relationship: family, friends, partners
- situation: current challenges, life circumstances
- preference: likes, dislikes, habits
- event: specific happenings, milestones
- emotion: current feelings

Examples:

User: I'm Sarah, 28, and I work as a nurse. My mom has been sick lately.
Assistant: That sounds tough. How is she doing?

Output: {"memories":[{"content":"User's name is Sarah","category":"identity"},{"content":"User is 28 years old","category":"identity"},{"content":"User works as a nurse","category":"identity"},{"content":"User's mom has been sick recently","category":"relationship"}]}

User: I've been feeling anxious about my presentation next week.
Assistant: Presentations can be nerve-wracking. What's it about?

Output: {"memories":[{"content":"User has a presentation next week","category":"event"},{"content":"User is feeling anxious about the presentation","category":"emotion"}]}

User: I love hiking on weekends. My partner Alex and I usually go together.
Assistant: That sounds like a great way to spend time together!

Output: {"memories":[{"content":"User enjoys hiking on weekends","category":"preference"},{"content":"User has a partner named Alex","category":"relationship"},{"content":"User and partner Alex hike together on weekends","category":"preference"}]}

User: Things have been stressful at work - they're doing layoffs and I'm worried.
Assistant: That uncertainty must be difficult to deal with.

Output: {"memories":[{"content":"User's workplace is doing layoffs","category":"situation"},{"content":"User is worried about potential layoffs","category":"emotion"}]}

Now extract memories from this conversation. Only extract information the USER directly stated. Output valid JSON only:`;

/**
 * JSON schema for memory extraction output.
 * Uses category field with 6 semantic values.
 *
 * Simplified for 3B model - no importance/type scoring.
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
          category: {
            type: 'string',
            enum: ['identity', 'relationship', 'situation', 'preference', 'event', 'emotion']
          }
        },
        required: ['content', 'category']
      }
    }
  },
  required: ['memories']
};
