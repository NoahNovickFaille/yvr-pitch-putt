import { initLlama, LlamaContext } from 'llama.rn';
import { getInfoAsync } from 'expo-file-system/legacy';
import { MODEL_CONFIG, type ModelDefinition } from '../../constants/model';
import { getModelPath } from '../download/ModelDownloadService';
import { CompletionQueueManager, Priority } from './CompletionQueue';

export type LLMStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'error'
  | 'unloaded';

export interface LLMState {
  status: LLMStatus;
  error?: string;
  context?: LlamaContext;
}

type StateListener = (state: LLMState) => void;

class LLMServiceImpl {
  private static instance: LLMServiceImpl | null = null;

  private state: LLMState = { status: 'idle' };
  private listeners: Set<StateListener> = new Set();
  private initPromise: Promise<void> | null = null;
  private completionQueue = new CompletionQueueManager();

  static getInstance(): LLMServiceImpl {
    if (!LLMServiceImpl.instance) {
      LLMServiceImpl.instance = new LLMServiceImpl();
    }
    return LLMServiceImpl.instance;
  }

  // Subscribe to state changes
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(state: LLMState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  getState(): LLMState {
    return this.state;
  }

  // Initialize the LLM context
  async initialize(model?: ModelDefinition): Promise<void> {
    // Already ready or initializing
    if (this.state.status === 'ready') {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize(model);
    return this.initPromise;
  }

  private async doInitialize(model?: ModelDefinition): Promise<void> {
    this.setState({ status: 'initializing' });

    try {
      // Use provided model config or fall back to defaults
      const modelConfig = model?.llm ?? MODEL_CONFIG.llm;
      const expectedSize = model?.sizeBytes ?? MODEL_CONFIG.expectedSizeBytes;
      const modelPath = getModelPath(model);

      // Verify file exists before attempting initialization
      const info = await getInfoAsync(modelPath);
      if (!info.exists) {
        throw new Error(
          'Model file not found. Please download the model first.'
        );
      }

      // Check file size is reasonable
      if (info.size && info.size < expectedSize * 0.9) {
        throw new Error(
          'Model file appears incomplete. Please re-download.'
        );
      }

      console.log('[LLMService] Initializing model from:', modelPath);
      console.log('[LLMService] Config:', modelConfig);

      // Initialize with model-specific settings
      const context = await initLlama({
        model: modelPath,
        n_ctx: modelConfig.n_ctx,
        n_gpu_layers: modelConfig.n_gpu_layers,
        use_mlock: modelConfig.use_mlock,
      });

      console.log('[LLMService] Model initialized successfully');

      this.setState({ status: 'ready', context });
      this.initPromise = null;
    } catch (error) {
      console.error('[LLMService] Initialization error:', error);

      const message = this.formatInitError(error);
      this.setState({ status: 'error', error: message });
      this.initPromise = null;
      throw new Error(message);
    }
  }

  // Format error messages for user display
  private formatInitError(error: unknown): string {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();

      // Common error patterns
      if (msg.includes('memory') || msg.includes('alloc')) {
        return 'Not enough memory to load the AI model. Please close other apps and try again.';
      }
      if (msg.includes('file') || msg.includes('not found') || msg.includes('path')) {
        return 'Model file not found or corrupted. Please re-download.';
      }
      if (msg.includes('format') || msg.includes('invalid') || msg.includes('gguf')) {
        return 'Model file is corrupted. Please delete and re-download.';
      }
      if (msg.includes('metal') || msg.includes('gpu')) {
        return 'GPU acceleration failed. The app will try using CPU instead.';
      }

      // Return original message if no pattern matched
      return error.message;
    }

    return 'An unexpected error occurred while loading the AI model.';
  }

  // Release the context (called on memory warning)
  release(): void {
    if (this.state.status === 'ready' && this.state.context) {
      console.log('[LLMService] Releasing context due to memory pressure');

      // Clear any pending completions
      this.completionQueue.clear();

      // The context will be garbage collected
      // llama.rn handles native cleanup internally
      this.setState({ status: 'unloaded' });
      this.initPromise = null;
    }
  }

  // Check if model is ready for inference
  isReady(): boolean {
    return this.state.status === 'ready' && this.state.context !== undefined;
  }

  // Get context for inference (throws if not ready)
  getContext(): LlamaContext {
    if (!this.isReady() || !this.state.context) {
      throw new Error('LLM not initialized. Call initialize() first.');
    }
    return this.state.context;
  }

  /**
   * Queue a completion request with priority handling
   * Prevents "Context is busy" errors by serializing all completion calls
   *
   * @param messages - Chat messages array
   * @param options - Completion options (n_predict, temperature, etc.)
   * @param onToken - Optional streaming callback
   * @param priority - 'high' for chat messages, 'low' for background tasks
   */
  async queuedCompletion(
    messages: any[],
    options: any,
    onToken?: (data: any) => void,
    priority: Priority = 'high'
  ): Promise<any> {
    if (!this.isReady() || !this.state.context) {
      throw new Error('LLM not initialized.');
    }
    return this.completionQueue.enqueue(
      this.state.context,
      messages,
      options,
      onToken,
      priority
    );
  }

  // Reset error state (to allow retry)
  resetError(): void {
    if (this.state.status === 'error') {
      this.setState({ status: 'idle' });
    }
  }
}

// Export singleton instance
export const LLMService = LLMServiceImpl.getInstance();
