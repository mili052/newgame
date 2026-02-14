# 新游测试周报（含 GitHub Pages 看板）

本目录用于沉淀**2月9日至14日**期间的新游测试周报，并通过 **GitHub Pages** 生成一个可视化看板网页（Kanban）。

## 目录结构

- `reports/`：周报文件（Markdown）
- `docs/`：GitHub Pages 静态站点（直接渲染看板）

## 如何在 GitHub 上生成看板网页（GitHub Pages）

### 方式 A（推荐）：GitHub Actions 一键部署

1. 在 GitHub 新建一个仓库（例如：`game-test-weekly-report`），并把本目录上传到仓库根目录（包含 `docs/` 与 `.github/workflows/pages.yml`）。
2. 打开仓库 **Settings → Pages**：
   - **Build and deployment** 选择 **GitHub Actions**
3. 之后每次 push 更新 `docs/**`，都会自动部署到 Pages。

### 方式 B：从分支直接部署（不走 Actions）

1. 在 GitHub 新建一个仓库（例如：`game-test-weekly-report`）。
2. 将本目录所有文件上传到该仓库根目录。
3. 打开仓库 **Settings → Pages**：
   - **Build and deployment** 选择 **Deploy from a branch**
   - **Branch** 选择 `main`（或你的默认分支）
   - **Folder** 选择 `/docs`
4. 保存后等待 1-2 分钟，Pages 会给出一个站点地址。
5. 打开站点即可看到看板页面（`docs/index.html`）。

## 如何更新内容

- 周报：编辑 `reports/2026-02-09_to_2026-02-14.md`
- 看板数据：编辑 `docs/kanban.json`
  - 页面会自动读取该 JSON 并渲染卡片
- 看板周报页：编辑 `docs/report.md`

## 如何把图片贴到看板上（最省事：自动匹配）

你只需要把图片文件放进仓库指定目录，页面会按“游戏名”自动匹配（你不会操作 JSON 也没关系）。

### 方式 A（推荐）：只管上传图片，页面自动找

1. 把头像/图标上传到：`docs/资产/` 或 `docs/assets/`
2. 文件名建议直接用游戏名（最省事）：
   - 头像：`斗破苍穹.png`
   - 截图：`斗破苍穹游戏截图.png`（或 `斗破苍穹_截图.png`）

页面会自动尝试这些路径（按顺序），找不到才显示占位：
- `./资产/<游戏名>.png|jpg|jpeg|webp`
- `./assets/<游戏名>.png|jpg|jpeg|webp`
- 截图则会尝试：`<游戏名>游戏截图.*`、`<游戏名>_截图.*` 等

### 方式 B：手动指定路径（更精确）

在 `docs/kanban.json` 对应条目增加字段（`rankChanges/tests/watchPoints` 都支持）：

```json
{
  "name": "斗破苍穹",
  "image": "./资产/斗破苍穹.png",
  "screenshots": ["./资产/斗破苍穹游戏截图.png"]
}
```

说明：
- `image` 也可以填外链图片 URL，但更建议放进仓库，避免外链失效。
- GitHub Pages 是静态站点：**直接在网页里 Ctrl+V 粘贴图片不会自动保存到仓库**；需要把图片文件提交到仓库里。

