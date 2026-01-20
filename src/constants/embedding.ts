import { documentDirectory } from 'expo-file-system/legacy';

/**
 * Embedding model definition for semantic similarity operations.
 * Uses llama.rn with embedding mode enabled.
 */
export interface EmbeddingModelDefinition {
  /** Unique identifier for the model */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of model purpose */
  description: string;
  /** Expected file size in bytes */
  sizeBytes: number;
  /** Download URL for the GGUF file */
  url: string;
  /** Local filename after download */
  filename: string;
  /** Output vector dimensions */
  dimensions: number;
  /** Maximum input token context */
  maxTokens: number;
  /** llama.rn initialization config */
  llm: {
    n_ctx: number;
    n_gpu_layers: number;
    use_mlock: boolean;
    embedding: true;
  };
}

/**
 * All-MiniLM-L6-v2 embedding model (Q4_K_M quantization).
 * Small (21MB), fast inference, 256-dimensional output vectors.
 * Used for memory deduplication via semantic similarity.
 */
export const EMBEDDING_MODEL: EmbeddingModelDefinition = {
  id: 'all-minilm-l6-v2',
  name: 'All-MiniLM-L6-v2',
  description: 'Semantic similarity model for memory deduplication',
  sizeBytes: 22_000_000, // ~21MB with buffer
  url: 'https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF/resolve/main/all-MiniLM-L6-v2-Q4_K_M.gguf',
  filename: 'all-MiniLM-L6-v2-Q4_K_M.gguf',
  dimensions: 256,
  maxTokens: 384,
  llm: {
    n_ctx: 384,
    n_gpu_layers: 99,
    use_mlock: true,
    embedding: true,
  },
};

/**
 * Storage keys for embedding-related state persistence.
 */
export const EMBEDDING_STORAGE_KEYS = {
  /** Download progress state */
  DOWNLOAD_STATE: 'embedding_download_state',
  /** Whether model is ready for use */
  MODEL_READY: 'embedding_model_ready',
} as const;

/**
 * Cosine similarity threshold for considering memories as duplicates.
 * 0.85 is empirically good for short text deduplication.
 * Lower values create false duplicates, higher values miss real duplicates.
 */
export const DEDUPLICATION_THRESHOLD = 0.85;

/**
 * Get the local file path for the embedding model.
 * @returns Full path to the model file in the app's document directory
 */
export function getEmbeddingModelPath(): string {
  return `${documentDirectory}${EMBEDDING_MODEL.filename}`;
}
