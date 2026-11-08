#!/usr/bin/env bash
# Build the fork's VS Code extension and force-install it over the marketplace release.
#
# The fork keeps the upstream extension ID (AgentChatBus.agentchatbus) and version, so
# installing replaces the marketplace copy instead of adding a second extension. The
# installed build is identified by its commit, shown as e.g. "0.2.46 (dev@016d353)" in
# the AgentChatBus status panel and the "AgentChatBus Server" output channel.
#
# Usage: ./install-fork.sh [--skip-build] [IDE_CLI ...]
#   --skip-build   install the existing VSIX from vscode-agentchatbus/dist without rebuilding
#   IDE_CLI        editor CLIs to install into (default: every one found of code, cursor, code-insiders)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$REPO_ROOT/vscode-agentchatbus"

SKIP_BUILD=0
IDE_CLIS=()
for arg in "$@"; do
    case "$arg" in
        --skip-build) SKIP_BUILD=1 ;;
        -h|--help) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        -*) echo "[ERROR] Unknown option: $arg" >&2; exit 1 ;;
        *) IDE_CLIS+=("$arg") ;;
    esac
done

if [ ${#IDE_CLIS[@]} -eq 0 ]; then
    for cli in code cursor code-insiders; do
        command -v "$cli" >/dev/null 2>&1 && IDE_CLIS+=("$cli")
    done
fi

BRANCH="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)"
COMMIT="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
echo "[INFO] Branch: $BRANCH  Commit: $COMMIT"
if [ "$BRANCH" != "dev" ]; then
    echo "[WARN] Not on the 'dev' branch; the installed build will not contain fork changes from dev."
fi
# vscode-agentchatbus/out is tracked upstream build output that every build rewrites; it is
# excluded here and restored after packaging so the fork never commits or conflicts on it.
OUT_PATHSPEC="vscode-agentchatbus/out"
if [ -n "$(git -C "$REPO_ROOT" status --porcelain -- ':(top)' ":(top,exclude)$OUT_PATHSPEC")" ]; then
    echo "[WARN] Working tree has uncommitted changes; the build will be labelled '+dirty'."
fi
OUT_WAS_CLEAN=0
if [ -z "$(git -C "$REPO_ROOT" status --porcelain -- ":(top)$OUT_PATHSPEC")" ]; then
    OUT_WAS_CLEAN=1
fi

if [ "$SKIP_BUILD" -eq 0 ]; then
    if [ ! -d "$REPO_ROOT/agentchatbus-ts/node_modules" ]; then
        echo "[INFO] Installing agentchatbus-ts dependencies..."
        (cd "$REPO_ROOT/agentchatbus-ts" && npm ci --no-audit --no-fund)
    fi
    if [ ! -d "$EXT_DIR/node_modules" ]; then
        echo "[INFO] Installing extension dependencies..."
        (cd "$EXT_DIR" && npm ci --no-audit --no-fund)
    fi
    echo "[INFO] Building VSIX (version unchanged)..."
    bash "$EXT_DIR/scripts/build.sh" none
    if [ "$OUT_WAS_CLEAN" -eq 1 ]; then
        git -C "$REPO_ROOT" checkout -- ":(top)$OUT_PATHSPEC"
        echo "[INFO] Restored tracked build output in $OUT_PATHSPEC (already packaged into the VSIX)."
    else
        echo "[WARN] $OUT_PATHSPEC had local changes before the build; left as is."
    fi
fi

VERSION="$(node -p "require('$EXT_DIR/package.json').version")"
VSIX="$EXT_DIR/dist/agentchatbus-$VERSION.vsix"
if [ ! -f "$VSIX" ]; then
    echo "[ERROR] VSIX not found: $VSIX" >&2
    exit 1
fi

if [ ${#IDE_CLIS[@]} -eq 0 ]; then
    echo "[WARN] No editor CLI found (code, cursor, code-insiders). Install manually:"
    echo "       code --install-extension \"$VSIX\" --force"
    exit 0
fi

for cli in "${IDE_CLIS[@]}"; do
    if ! command -v "$cli" >/dev/null 2>&1; then
        echo "[WARN] '$cli' not found on PATH; skipping."
        continue
    fi
    echo "[INFO] Installing into $cli..."
    # --force is required: the marketplace release has the same version number.
    "$cli" --install-extension "$VSIX" --force
done

cat <<EOF

[DONE] Installed $VSIX ($BRANCH@$COMMIT).
Next steps:
  1. Reload the editor window so the bundled backend restarts with the new code.
  2. Check the AgentChatBus status panel or the "AgentChatBus Server" output channel:
     the version should read "$VERSION ($BRANCH@$COMMIT...)".
  3. Turn off auto update for this extension (Extensions view → right-click AgentChatBus →
     uncheck "Auto Update"), or the next marketplace release will replace this build.
EOF
