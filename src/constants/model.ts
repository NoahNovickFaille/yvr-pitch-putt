// Model configuration - Llama 3.2 3B Instruct Q4_K_M
export const MODEL_CONFIG = {
  url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  expectedSizeBytes: 2_020_000_000, // ~2.02 GB
  // SHA256 from Hugging Face (to be verified after first successful download)
  sha256: '6c1a2b41161032677be168d354123594c0e6e67d2b9227c84f296ad037c728ff',
  // LLM initialization config
  llm: {
    n_ctx: 2048, // Conservative context size for memory
    n_gpu_layers: 99, // Use Metal on iOS
    use_mlock: true, // Lock model in memory
  },
} as const;

// Storage keys
export const STORAGE_KEYS = {
  DOWNLOAD_STATE: 'model_download_state',
  CHECKSUM_VERIFIED: 'model_checksum_verified',
  MODEL_INITIALIZED_ONCE: 'model_initialized_once',
} as const;

// Download task ID
export const DOWNLOAD_TASK_ID = 'llama-model-download';
