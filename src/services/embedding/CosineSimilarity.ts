import type { EmbeddingVector } from '../../types/embedding';

/**
 * Calculate cosine similarity between two embedding vectors.
 *
 * Cosine similarity measures the angle between vectors, returning 1 for
 * identical directions, 0 for orthogonal vectors, and -1 for opposite directions.
 * For normalized embedding outputs, values typically range from 0 to 1.
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Cosine similarity score (-1 to 1, typically 0 to 1 for embeddings)
 * @throws Error if vectors have different dimensions
 *
 * @example
 * const similarity = cosineSimilarity(embeddingA, embeddingB);
 * if (similarity > 0.85) {
 *   console.log('Vectors are highly similar');
 * }
 */
export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) {
    throw new Error(
      `Dimension mismatch: vector a has ${a.length} dimensions, vector b has ${b.length} dimensions`
    );
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // Handle zero vectors - return 0 similarity
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate cosine similarity for normalized (unit) vectors.
 *
 * This is an optimized version for vectors with magnitude 1.
 * Since |a| = |b| = 1 for unit vectors, cosine similarity equals the dot product.
 * all-MiniLM-L6-v2 outputs normalized vectors, making this the preferred function.
 *
 * WARNING: Only use this with normalized vectors. For non-unit vectors,
 * results will be incorrect. Use cosineSimilarity() for general purpose comparison.
 *
 * @param a - First normalized embedding vector (magnitude = 1)
 * @param b - Second normalized embedding vector (magnitude = 1)
 * @returns Cosine similarity score (dot product of unit vectors)
 * @throws Error if vectors have different dimensions
 *
 * @example
 * // For embeddings from all-MiniLM-L6-v2 (already normalized)
 * const similarity = cosineSimilarityNormalized(embeddingA, embeddingB);
 */
export function cosineSimilarityNormalized(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) {
    throw new Error(
      `Dimension mismatch: vector a has ${a.length} dimensions, vector b has ${b.length} dimensions`
    );
  }

  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }

  return dotProduct;
}
