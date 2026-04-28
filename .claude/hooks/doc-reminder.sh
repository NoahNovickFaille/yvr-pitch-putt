#!/bin/bash
# PostToolUse hook: Remind to update documentation when services/features change
# Triggers on Write|Edit tools, checks if modified file needs doc updates

set -e

# Read JSON input from stdin
INPUT=$(cat)

# Extract file path from tool_input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Exit early if no file path (shouldn't happen for Write/Edit)
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Get relative path from project root
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
REL_PATH="${FILE_PATH#$PROJECT_DIR/}"

# Skip if editing documentation files themselves (prevent loops)
if [[ "$REL_PATH" == *.md ]]; then
  exit 0
fi

# Skip test files, config files, and non-source files
if [[ "$REL_PATH" == *.test.* ]] || \
   [[ "$REL_PATH" == *.spec.* ]] || \
   [[ "$REL_PATH" == *.config.* ]] || \
   [[ "$REL_PATH" == package*.json ]] || \
   [[ "$REL_PATH" == tsconfig.json ]] || \
   [[ "$REL_PATH" == .* ]]; then
  exit 0
fi

# Check for service file changes
if [[ "$REL_PATH" == src/services/* ]]; then
  # Extract service name (e.g., src/services/memory/MemoryExtractor.ts -> memory)
  SERVICE_NAME=$(echo "$REL_PATH" | sed -n 's|src/services/\([^/]*\)/.*|\1|p')

  if [[ -n "$SERVICE_NAME" ]]; then
    README_PATH="src/services/$SERVICE_NAME/README.md"

    # Check if README exists for this service
    if [[ -f "$PROJECT_DIR/$README_PATH" ]]; then
      cat << EOF
{
  "decision": "block",
  "reason": "You modified $REL_PATH in the $SERVICE_NAME service. Please review $README_PATH and update it if this change affects the service's API, behavior, or architecture documented there."
}
EOF
      exit 0
    fi
  fi
fi

# Check for changes to key feature files that should update CLAUDE.md
# These are files that define major architectural patterns
CLAUDE_MD_TRIGGERS=(
  "src/constants/model.ts"
  "src/stores/"
  "src/hooks/useChat.ts"
  "src/hooks/useLLM.ts"
  "src/services/memory/SemanticRetrieval.ts"
  "src/services/memory/MemoryDecay.ts"
  "src/services/embedding/"
)

for TRIGGER in "${CLAUDE_MD_TRIGGERS[@]}"; do
  if [[ "$REL_PATH" == $TRIGGER* ]]; then
    cat << EOF
{
  "decision": "block",
  "reason": "You modified $REL_PATH which is a key architectural file. Please review CLAUDE.md and update any relevant sections (Architecture, Key Patterns, Memory System, Available Models, etc.) if this change affects the documented behavior."
}
EOF
    exit 0
  fi
done

# No documentation reminder needed
exit 0
