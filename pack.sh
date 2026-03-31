#!/bin/sh
set -e
mkdir -p dist

# Pack MCP server bundle
npx mcpb pack . dist/normattiva.mcpb

# Pack skill bundle (.skill = zip with skills/<name>/ structure)
SKILL_NAME="diritto-italiano"
SKILL_SRC="skill"
SKILL_OUT="dist/${SKILL_NAME}.skill"
(cd "${SKILL_SRC}" && zip -r - .) > "${SKILL_OUT}"

echo "Built: dist/normattiva.mcpb"
echo "Built: ${SKILL_OUT}"
