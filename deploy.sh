#!/bin/bash
# === GitHub Pages 部署脚本 ===
# 使用方法：
# 1. 在 GitHub 上创建一个新仓库（例如名为 animal-protection-legislation）
# 2. 将下面的 REPO_URL 替换为你的仓库地址
# 3. 运行：bash deploy.sh

REPO_URL="https://github.com/你的用户名/你的仓库名.git"

# 添加远程仓库
git remote add origin "$REPO_URL"

# 推送到 GitHub
git push -u origin main

echo ""
echo "========================================="
echo "  推送完成！接下来启用 GitHub Pages："
echo "========================================="
echo ""
echo "1. 打开你的 GitHub 仓库页面"
echo "2. 点击 Settings 标签"
echo "3. 左侧菜单找到 Pages"
echo "4. Source 选择 Deploy from a branch"
echo "5. Branch 选择 main，文件夹选择 / (root)"
echo "6. 点击 Save"
echo ""
echo "等待 1-2 分钟后，你的网站将可通过以下地址访问："
echo "https://你的用户名.github.io/你的仓库名/"
echo ""
