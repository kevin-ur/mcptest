#!/bin/bash
# 将当前项目推送到 GitHub
# 用法: ./push-to-github.sh [仓库名] [描述] [public|private]
# 示例: ./push-to-github.sh myproject "项目描述" public

set -e

REPO_NAME="${1:-$(basename "$PWD")}"
REPO_DESC="${2:-}"
VISIBILITY="${3:-public}"

PRIVATE_FLAG="false"
[[ "$VISIBILITY" == "private" ]] && PRIVATE_FLAG="true"

# 获取 GitHub 凭据
get_token() {
  git credential-osxkeychain get <<EOF 2>/dev/null | grep password | cut -d= -f2
host=github.com
protocol=https
EOF
}

TOKEN=$(get_token)
if [[ -z "$TOKEN" ]]; then
  echo "错误: 未找到 GitHub 凭据，请先配置 git credential-osxkeychain"
  exit 1
fi

# 获取 GitHub 用户名
GITHUB_USER=$(curl -s -H "Authorization: Bearer $TOKEN" https://api.github.com/user | grep '"login"' | cut -d'"' -f4)
if [[ -z "$GITHUB_USER" ]]; then
  echo "错误: 无法获取 GitHub 用户名，请检查凭据是否有效"
  exit 1
fi

echo "GitHub 用户: $GITHUB_USER"
echo "仓库名称: $REPO_NAME"
echo "可见性: $VISIBILITY"

# 初始化 git（如果尚未初始化）
if [[ ! -d .git ]]; then
  echo "初始化 git 仓库..."
  git init
fi

# 暂存并提交（如果有未提交的更改）
if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
  git add -A
  git commit -m "feat: 初始提交"
fi

# 创建 GitHub 仓库
echo "创建 GitHub 仓库..."
HTTP_CODE=$(curl -s -o /tmp/gh-create-repo.json -w "%{http_code}" -X POST https://api.github.com/user/repos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"private\":$PRIVATE_FLAG}")

if [[ "$HTTP_CODE" == "201" ]]; then
  echo "仓库创建成功"
elif [[ "$HTTP_CODE" == "422" ]]; then
  echo "仓库已存在，跳过创建"
else
  echo "创建仓库失败 (HTTP $HTTP_CODE):"
  cat /tmp/gh-create-repo.json
  exit 1
fi

# 添加 remote（如果不存在）
REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
if git remote get-url origin &>/dev/null; then
  echo "Remote origin 已存在，更新为: $REMOTE_URL"
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

# 推送
BRANCH=$(git branch --show-current)
echo "推送分支 $BRANCH 到 origin..."
git push -u origin "$BRANCH"

echo ""
echo "完成! 仓库地址: https://github.com/${GITHUB_USER}/${REPO_NAME}"
