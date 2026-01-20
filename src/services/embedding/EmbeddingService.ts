import { initLlama, LlamaContext } from 'llama.rn';
import { getInfoAsync } from 'expo-file-system/legacy';
import { EMBEDDING_MODEL, getEmbeddingModelPath } from '../../constants/embedding';
import type {
  EmbeddingServiceState,
  EmbeddingServiceStatus,
  EmbeddingVector,
} from '../../types/embedding';

type StateListener = (state: EmbeddingServiceState) => void;

/**
 * EmbeddingService singleton for generating semantic embeddings.
 * Uses a separate llama.rn context from the chat LLM with embedding mode enabled.
 *
 * Key differences from LLMService:
 * - Uses embedding: true in llama config
 * - Uses EMBEDDING_MODEL constants (not MODEL_CONFIG)
 * - No completion queue (just embed() method)
 * - Separate model file (all-MiniLM vs Llama)
 */
class EmbeddingServiceImpl {
  private static instance: EmbeddingServiceImpl | null = null;

  private state: EmbeddingServiceState = { status: 'idle' };
  private listeners: Set<StateListener> = new Set();
  private initPromise: Promise<void> | null = null;
  private context: LlamaContext | null = null;

  static getInstance(): EmbeddingServiceImpl {
    if (!EmbeddingServiceImpl.instance) {
      EmbeddingServiceImpl.instance = new EmbeddingServiceImpl();
    }
    return EmbeddingServiceImpl.instance;
  }

  /**
   * Subscribe to state changes.
   * @param listener Callback invoked on state change
   * @returns Unsubscribe function
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(state: EmbeddingServiceState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Get current service state.
   */
  getState(): EmbeddingServiceState {
    return this.state;
  }

  /**
   * Check if service is ready to generate embeddings.
   */
  isReady(): boolean {
    return this.state.status === 'ready' && this.context !== null;
  }

  /**
   * Check if embedding model file is downloaded.
   */
  async isModelDownloaded(): Promise<boolean> {
    const path = getEmbeddingModelPath();
    const info = await getInfoAsync(path);
    if (!info.exists) return false;

    // Check if file is at least 90% of expected size
    const minSize = EMBEDDING_MODEL.sizeBytes * 0.9;
    return info.size !== undefined && info.size >= minSize;
  }

  /**
   * Initialize the embedding context.
   * Call after model is downloaded.
   */
  async initialize(): Promise<void> {
    // Already ready
    if (this.state.status === 'ready') {
      return;
    }

    // Already initializing - return existing promise
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    this.setState({ status: 'initializing' });

    try {
      const modelPath = getEmbeddingModelPath();

      // Verify file exists before attempting initialization
      const info = await getInfoAsync(modelPath);
      if (!info.exists) {
        throw new Error('Embedding model not downloaded');
      }

      // Check file size is reasonable
      if (info.size && info.size < EMBEDDING_MODEL.sizeBytes * 0.9) {
        throw new Error('Embedding model file appears incomplete. Please re-download.');
      }

      console.log('[EmbeddingService] Initializing model from:', modelPath);
      console.log('[EmbeddingService] Config:', EMBEDDING_MODEL.llm);

      // Initialize with embedding mode enabled
      this.context = await initLlama({
        model: modelPath,
        n_ctx: EMBEDDING_MODEL.llm.n_ctx,
        n_gpu_layers: EMBEDDING_MODEL.llm.n_gpu_layers,
        use_mlock: EMBEDDING_MODEL.llm.use_mlock,
        embedding: EMBEDDING_MODEL.llm.embedding, // CRITICAL: Must be true
      });

      console.log('[EmbeddingService] Model initialized successfully');

      this.setState({ status: 'ready', context: this.context });
      this.initPromise = null;
    } catch (error) {
      console.error('[EmbeddingService] Initialization error:', error);

      const message = this.formatInitError(error);
      this.setState({ status: 'error', error: message });
      this.initPromise = null;
      throw new Error(message);
    }
  }

  /**
   * Format error messages for user display.
   */
  private formatInitError(error: unknown): string {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();

      // Common error patterns
      if (msg.includes('memory') || msg.includes('alloc')) {
        return 'Not enough memory to load the embedding model. Please close other apps and try again.';
      }
      if (msg.includes('file') || msg.includes('not found') || msg.includes('path')) {
        return 'Embedding model file not found or corrupted. Please re-download.';
      }
      if (msg.includes('format') || msg.includes('invalid') || msg.includes('gguf')) {
        return 'Embedding model file is corrupted. Please delete and re-download.';
      }
      if (msg.includes('metal') || msg.includes('gpu')) {
        return 'GPU acceleration failed. The app will try using CPU instead.';
      }

      // Return original message if no pattern matched
      return error.message;
    }

    return 'An unexpected error occurred while loading the embedding model.';
  }

  /**
   * Generate embedding vector for text.
   * @param text Input text to embed
   * @returns 256-dimensional embedding vector
   */
  async embed(text: string): Promise<EmbeddingVector> {
    if (!this.isReady() || !this.context) {
      throw new Error('EmbeddingService not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    const result = await this.context.embedding(text);

    if (__DEV__) {
      const duration = Date.now() - startTime;
      console.log(`[EmbeddingService] embed() took ${duration}ms for "${text.substring(0, 50)}..."`);
    }

    return result.embedding;
  }

  /**
   * Release the embedding context.
   * Called on memory pressure or when not needed.
   */
  release(): void {
    if (this.state.status === 'ready' && this.context) {
      console.log('[EmbeddingService] Releasing context');

      // The context will be garbage collected
      // llama.rn handles native cleanup internally
      this.context = null;
      this.setState({ status: 'unloaded' });
      this.initPromise = null;
    }
  }

  /**
   * Reset error state to allow retry.
   */
  resetError(): void {
    if (this.state.status === 'error') {
      this.setState({ status: 'idle' });
    }
  }
}

// Export singleton instance
export const EmbeddingService = EmbeddingServiceImpl.getInstance();
