// Model definition interface for multi-model support
export interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  quantization: string;
  parameterCount: string;
  sizeBytes: number;
  url: string;
  filename: string;
  sha256?: string;
  llm: {
    n_ctx: number;
    n_gpu_layers: number;
    use_mlock: boolean;
  };
}

// Available models for selection
export const AVAILABLE_MODELS: ModelDefinition[] = [
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    description: 'Balanced performance and quality',
    quantization: 'Q4_K_M',
    parameterCount: '3B',
    sizeBytes: 2_020_000_000, // ~2GB
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    sha256: '6c1a2b41161032677be168d354123594c0e6e67d2b9227c84f296ad037c728ff',
    llm: {
      n_ctx: 4096,
      n_gpu_layers: 99,
      use_mlock: true,
    },
  },
  {
    id: 'lfm-1.2b',
    name: 'LFM 2.5 1.2B',
    description: 'Fast and lightweight (LiquidAI)',
    quantization: 'Q4_K_M',
    parameterCount: '1.2B',
    sizeBytes: 731_000_000, // ~731MB
    url: 'https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF/resolve/main/LFM2.5-1.2B-Instruct-Q4_K_M.gguf',
    filename: 'LFM2.5-1.2B-Instruct-Q4_K_M.gguf',
    llm: {
      n_ctx: 4096,
      n_gpu_layers: 99,
      use_mlock: true,
    },
  },
];

// Helper to get model by ID
export function getModelById(id: string): ModelDefinition | undefined {
  return AVAILABLE_MODELS.find((model) => model.id === id);
}

// Default model ID
export const DEFAULT_MODEL_ID = 'llama-3.2-3b';

// Legacy MODEL_CONFIG for backward compatibility (points to default Llama 3.2 3B)
const defaultModel = AVAILABLE_MODELS[0];
export const MODEL_CONFIG = {
  url: defaultModel.url,
  filename: defaultModel.filename,
  expectedSizeBytes: defaultModel.sizeBytes,
  sha256: defaultModel.sha256,
  llm: defaultModel.llm,
} as const;

// Storage keys
export const STORAGE_KEYS = {
  DOWNLOAD_STATE: 'model_download_state', // Legacy - use getDownloadStateKey() for model-specific
  CHECKSUM_VERIFIED: 'model_checksum_verified',
  MODEL_INITIALIZED_ONCE: 'model_initialized_once',
} as const;

// Download task ID (legacy - use getDownloadTaskId() for model-specific)
export const DOWNLOAD_TASK_ID = 'llama-model-download';

// Model-specific storage key helpers (prevents cross-model download state conflicts)
export function getDownloadStateKey(modelId: string): string {
  return `model_download_state_${modelId}`;
}

export function getDownloadTaskId(modelId: string): string {
  return `model-download-${modelId}`;
}
