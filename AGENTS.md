# AGENTS.md

本仓库是 `Killea/AgentChatBus` 的 fork（`origin` = `delubee/AgentChatBus`），以自研开发为主，同时需要随时合并上游更新。所有 AI 智能体在本仓库中工作时必须遵守以下约定。

## 远程与分支

- `upstream`：`https://github.com/Killea/AgentChatBus.git`，只读，用于同步，不向其提交 PR。
- `origin`：`git@github.com:delubee/AgentChatBus.git`，自己的 fork。
- `main`：上游镜像，只跟随 `upstream/main`，**不在 `main` 上做任何自研提交**。
- `dev`：自研开发分支，跟踪 `origin/dev`。所有自研工作都在 `dev`（或从 `dev` 切出的功能分支）上进行。

## 同步上游

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main   # main 无自研提交，应当能 fast-forward
git push origin main

git checkout dev
git merge main                      # 长期分支使用 merge，保留历史
```

- 如果 `--ff-only` 失败，说明 `main` 上出现了自研提交，应先把它们挪到 `dev`，不要强行合并到 `main`。
- 合并冲突时以保留自研功能为前提解决，并确认上游的修复没有被覆盖。
- `rerere` 已开启（`git config rerere.enabled true`），同样的冲突解决会被复用。

## 开发约定

- 新功能优先放在新文件或新目录中；修改上游核心文件时保持改动最小，便于后续同步。
- 避免改动 `shared-contracts`、生成文件、锁文件等高冲突区域；确需改动时单独提交，方便之后 rebase 或 merge。
- 不要对 `main` 或 `upstream/*` 执行 force push、reset 等改写历史的操作。
- 提交和推送只在用户明确要求时进行。
- 不要向 `Killea/AgentChatBus` 提交 PR，除非用户明确要求。
