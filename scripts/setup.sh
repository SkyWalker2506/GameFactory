#!/usr/bin/env bash
# GameFactory bootstrap — installs everything a fresh clone needs.
#
# What it does (idempotent):
#   1. Checks Node >=20
#   2. Installs subscription CLIs (claude, codex, gemini) if missing
#   3. Creates GameFactory/secrets/ with secrets.env skeleton
#   4. Symlinks from ~/Projects/claude-config/claude-secrets/ if present
#   5. Prompts for any missing credential interactively
#   6. Installs OpenGame dependencies + npm links the `opengame` CLI
#   7. Writes ~/.qwen/settings.json pointing to chosen CLI adapter
#
# Re-run anytime; only missing pieces get installed.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CFG_SECRETS="$HOME/Projects/claude-config/claude-secrets/secrets.env"
LOCAL_SECRETS_DIR="$ROOT/secrets"
LOCAL_SECRETS="$LOCAL_SECRETS_DIR/secrets.env"
QWEN_DIR="$HOME/.qwen"
QWEN_SETTINGS="$QWEN_DIR/settings.json"

bold(){ printf "\033[1m%s\033[0m\n" "$*"; }
green(){ printf "\033[32m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }
red(){ printf "\033[31m%s\033[0m\n" "$*" >&2; }

bold "==> 1/6  Checking Node.js"
if ! command -v node >/dev/null; then
  red "Node not found. Install Node 20+ first (https://nodejs.org or: brew install node)"
  exit 1
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  red "Node $NODE_MAJOR detected. OpenGame needs >=20."
  exit 1
fi
green "  node $(node -v) ✓"

bold "==> 2/6  Subscription CLIs"
install_cli(){
  local name="$1" pkg="$2"
  if command -v "$name" >/dev/null; then
    green "  $name ✓ ($(command -v "$name"))"
  else
    yellow "  $name missing — installing $pkg"
    npm install -g "$pkg"
  fi
}
install_cli claude "@anthropic-ai/claude-code"
install_cli codex  "@openai/codex"
install_cli gemini "@google/gemini-cli"

bold "==> 3/6  Secrets directory"
mkdir -p "$LOCAL_SECRETS_DIR"
if [ ! -f "$LOCAL_SECRETS" ]; then
  cat > "$LOCAL_SECRETS" <<'EOF'
# GameFactory local secrets — NOT committed (.gitignore)
# Optional — CLI adapters don't need API keys, these are only for image/audio providers.

# Image generation (optional):
# DASHSCOPE_API_KEY=
# DOUBAO_API_KEY=
# OPENAI_API_KEY=

# Which CLI to use by default (claude-cli | codex-cli | gemini-cli):
GF_DEFAULT_AUTH=claude-cli

# Optional model overrides:
# CLAUDE_CLI_MODEL=claude-opus-4-7
# CODEX_CLI_MODEL=gpt-5.4
# GEMINI_CLI_MODEL=gemini-2.5-pro
EOF
  green "  created $LOCAL_SECRETS"
else
  green "  $LOCAL_SECRETS ✓ (exists)"
fi

bold "==> 4/6  Claude-config secrets link"
if [ -f "$CFG_SECRETS" ]; then
  LINK="$LOCAL_SECRETS_DIR/claude-config-secrets.env"
  ln -sf "$CFG_SECRETS" "$LINK"
  green "  linked → $LINK"
else
  yellow "  claude-config secrets not found at $CFG_SECRETS"
  yellow "  (skip — GameFactory works without it; image providers will ask on first use)"
fi

bold "==> 5/6  Prompt for any missing creds"
# Load what we have
set +e
set -a
[ -f "$LOCAL_SECRETS" ] && . "$LOCAL_SECRETS"
[ -f "$CFG_SECRETS" ] && . "$CFG_SECRETS"
set +a
set -e

prompt_if_missing(){
  local var="$1" label="$2"
  if [ -z "${!var}" ]; then
    if [ ! -t 0 ]; then
      yellow "  $label not set (non-interactive, skipping)"
      return
    fi
    yellow "  $label not set."
    read -r -p "    Enter $var (blank to skip): " val
    if [ -n "$val" ]; then
      echo "$var=$val" >> "$LOCAL_SECRETS"
      green "    saved to $LOCAL_SECRETS"
    fi
  else
    green "  $var ✓"
  fi
}
# Image generation is optional — only ask if user wants it.
yellow "  (image asset generation is optional — press Enter to skip any prompt)"
prompt_if_missing DASHSCOPE_API_KEY "DashScope (Tongyi image gen)"

bold "==> 6/6  OpenGame install + link"
cd "$ROOT/factory/opengame"
if [ ! -d node_modules ]; then
  yellow "  Running npm install (first time — 2-3 min)..."
  npm install
else
  green "  node_modules ✓ (delete to force reinstall)"
fi
if ! command -v opengame >/dev/null; then
  yellow "  Linking opengame CLI globally..."
  npm link
else
  green "  opengame ✓ ($(command -v opengame))"
fi

bold "==> Writing ~/.qwen/settings.json"
mkdir -p "$QWEN_DIR"
AUTH="${GF_DEFAULT_AUTH:-claude-cli}"
cat > "$QWEN_SETTINGS" <<EOF
{
  "authType": "$AUTH",
  "approvalMode": "yolo"
}
EOF
green "  authType = $AUTH"

echo ""
bold "✓ Setup complete."
echo ""
echo "Next steps:"
echo "  gf new my-puzzle --genre grid_logic"
echo "  gf generate my-puzzle"
echo ""
echo "Switch CLI any time by editing $LOCAL_SECRETS (GF_DEFAULT_AUTH)"
echo "  valid values: claude-cli | codex-cli | gemini-cli"
