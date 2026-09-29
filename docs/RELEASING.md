# 发布流程 / Releasing

仓库：GitHub https://github.com/deepseekharness-dsh/agent-mode-change ｜ Gitee 镜像 https://gitee.com/deepseekharness/agent-mode-change
npm 包名：`agent-mode-change`（= `package.json` 的 `name`，也就是市场里的安装名）

三段链路，顺序是：**先推仓库 → 再发 npm → 最后提收录 PR**。

## 0. 前置

```sh
npm login                        # 或把 npm token 写进 ~/.npmrc（不要提交进仓库）
git config --local user.name  "deepseekharness"
git config --local user.email "deepseekharness@users.noreply.gitee.com"
```

## 1. Gitee（主仓）

```sh
git add .
git commit -m "feat: agent-mode floating window for DeepSeek Harness"
git branch -M main
git remote add origin https://gitee.com/deepseekharness/agent-mode-change.git
git push -u origin main
```

推送后到仓库设置里：

- 把仓库设为**公开**（Gitee 不允许空仓库设为公开，所以必须**先推送再改公开**）；
- 仓库简介与 **Topics** 至少加 `dsh-plugin`（精选列表明确要求这一项）。

## 2. 发布到 npm

```sh
npm test                         # 必须全绿
npm pack --dry-run               # 确认打包内容：index.js client.js cordis.patch.yml icon.svg locale/ README* CHANGELOG.md LICENSE
npm publish                      # 需要 npmjs 的 token；name 就是 agent-mode-change
```

发布后包页：https://www.npmjs.com/package/agent-mode-change

## 3. GitHub 镜像（精选列表需要）

精选列表只接受 **GitHub** 仓库地址，所以在 Gitee 主仓之外还要有一个 GitHub 镜像，两种做法：

- GitHub 网页端 **Import a repository**，源填 Gitee 公开仓库地址（最快，无需本地配置）；
- 或 `git remote add github https://github.com/deepseekharness-dsh/agent-mode-change.git && git push github main`。

推送后同样给 GitHub 仓库加 `dsh-plugin` topic。

## 4. 收录进精选列表（dsh 市场即来源于此）

向 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
提一个 **只新增一个文件** 的 PR：`data/plugins/deepseekharness-dsh__agent-mode-change.yml`

```yaml
url: https://github.com/deepseekharness-dsh/agent-mode-change
name: deepseekharness-dsh/agent-mode-change
category: ui
description:
  en: Floating Agent-mode window that switches a session between DeepSeek Harness and the archived prompts @deepseek-ai/dsh-agent-emulation ships.
  zh: Agent 模式悬浮窗：一键在当前会话的 DeepSeek Harness 与 @deepseek-ai/dsh-agent-emulation 提供的归档提示词之间切换。
```

- 只加这一个文件；两个 README 由脚本生成，**不要手工改**。
- 描述里出现 `: `（冒号加空格）必须给整行加引号。
- 硬性条件：`package.json` 声明 `dsh.bundle`（✅）+ 根目录 `cordis.patch.yml`（✅）+ **仓库创建满 1 天**
  （自动检查，所以建仓当天提的 PR 会被 CI 挡下）+ 真实可用代码（✅）+ 仓库带 `dsh-plugin` topic。
- 通过后 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com) 与 dshmarket.com 自动收录，
  市场里的安装命令为 `dsh plugin --profile web add agent-mode-change`。

另外两个注册表多为**自动采集**（发布 npm 包 + 打 `dsh-plugin` topic 后通常会被爬入）：

- https://github.com/imsai-sh/awesome-deepseek-harness-plugins
- https://github.com/dshworks/awesome-dsh-plugins

## 5. 发版检查单

- [ ] `npm test` 全绿
- [ ] `package.json` 版本号 + `CHANGELOG.md` 已更新
- [ ] `README.md` / `README.en.md` 与实际行为一致（精选列表会核对描述与代码）
- [ ] `git tag vX.Y.Z && git push --tags`（Gitee + GitHub 各推一次）
- [ ] `npm publish`
