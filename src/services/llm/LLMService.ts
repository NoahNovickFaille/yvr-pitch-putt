import { initLlama, LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system';
import { MODEL_CONFIG } from '../../constants/model';
import { getModelPath } from '../download/ModelDownloadService';

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
  async initialize(): Promise<void> {
    // Already ready or initializing
    if (this.state.status === 'ready') {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    this.setState({ status: 'initializing' });

    try {
      const modelPath = getModelPath();

      // Verify file exists before attempting initialization
      const info = await FileSystem.getInfoAsync(modelPath);
      if (!info.exists) {
        throw new Error(
          'Model file not found. Please download the model first.'
        );
      }

      // Check file size is reasonable
      if (info.size && info.size < MODEL_CONFIG.expectedSizeBytes * 0.9) {
        throw new Error(
          'Model file appears incomplete. Please re-download.'
        );
      }

      console.log('[LLMService] Initializing model from:', modelPath);
      console.log('[LLMService] Config:', MODEL_CONFIG.llm);

      // Initialize with conservative settings
      const context = await initLlama({
        model: `file://${modelPath}`,
        n_ctx: MODEL_CONFIG.llm.n_ctx,
        n_gpu_layers: MODEL_CONFIG.llm.n_gpu_layers,
        use_mlock: MODEL_CONFIG.llm.use_mlock,
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

  // Reset error state (to allow retry)
  resetError(): void {
    if (this.state.status === 'error') {
      this.setState({ status: 'idle' });
    }
  }
}

// Export singleton instance
export const LLMService = LLMServiceImpl.getInstance();
