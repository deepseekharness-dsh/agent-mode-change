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

> ⚠️ 直接 `npm publish` 在账号未启用 2FA 时会被注册表拒绝，正确的凭据做法见文末 **§6.1**。

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

## 文档渲染注意（血的教训）

1. **README 里不要写裸 HTML**（`<div align="center">…</div>`、`<!-- 注释 -->` 都不行）。
   Gitee 的 README 是**客户端**用 markdown-it 渲染的（服务端 HTML 里只有
   `<blob-markdown-renderer><textarea class='content'>原文</textarea>`），它的 HTML 配置与 GitHub 不同，
   HTML 有可能被原样显示出来。
2. **跨文件链接一律写绝对地址**：`https://github.com/deepseekharness-dsh/agent-mode-change/blob/main/README.en.md`。
   实测相对链接 `README.en.md` 在 Gitee 上会按页面地址解析成
   `https://gitee.com/deepseekharness/README.en.md` → **404**；若渲染器改用默认分支解析，
   `blob/master/...` 也是 **404**（本仓库默认分支是 `main`，`blob/main/...` 已验证 200）。
3. **远程图片徽章默认不启用**：`img.shields.io` 与 `github.com/*.svg` 在国内网络常超时变成裂图。
   发布 npm 之后如需徽章，直接用 markdown 图片语法加回即可。
4. 验证渲染别只看服务端 HTML：抓 `/blob/<sha>/<file>` 拿到的是**源码视图**。要看渲染结果必须在浏览器里看，
   或检查链接目标 URL 是否 200。

## 6. 实际发布记录与两条已验证的路（2026-09-29）

首版 `agent-mode-change@1.0.0` 已发布，maintainer `helihuo919`。下面是把首版发出去的过程，照抄可用。

### 6.1 已发布用法：bypass-2FA 的 granular token（一次性）

**`npm login` 的网页会话令牌不算"满足 2FA 的发布凭据"**，用它发布必然返回：

    403 Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.

参考 [npm/cli#9268](https://github.com/npm/cli/issues/9268)（2026-04 开、至今 open）。可行做法：

1. <https://www.npmjs.com/settings/helihuo919/tokens> → Generate New Token → **Granular Access Token**
   - Permissions：**Read and write (publish and stage)** —— 不是 "stage only"
   - **Bypass two-factor authentication (2FA)** ✅ 必须勾（不勾就是上面那个 403）
   - Organizations：**No access**（账号没有组织时选别的会报
     "You must select at least one organization if granting organization permissions to this token."）
   - Allowed IP ranges：留空；Expiration：7 days
2. 令牌写进**独立的** userconfig（不要与 `npm login` 的会话令牌混用，否则 npm 会用会话令牌）：

       printf '//registry.npmjs.org/:_authToken=%s\n' '<token>' > /tmp/.npmrc-gat && chmod 600 /tmp/.npmrc-gat
       NPM_CONFIG_USERCONFIG=/tmp/.npmrc-gat npm whoami
       NPM_CONFIG_USERCONFIG=/tmp/.npmrc-gat npm publish --access public --cache /tmp/npm-cache

3. **发完立刻撤销该令牌**。并注意 npm 的时间表：bypass-2FA 令牌用于**账号变更自 2026-08 起受限**、
   用于**直接发布自 2027-01 起受限** —— 所以别把它当长期方案。

### 6.2 以后（推荐）：OIDC Trusted Publishing，零令牌零验证码

仓库已带 [`.github/workflows/publish.yml`](../.github/workflows/publish.yml)。在 npm 包设置页配置一次
（**包必须已存在才能配**，所以首版只能手工发）：

| 字段 | 值 |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `deepseekharness-dsh` |
| Repository | `agent-mode-change` |
| Workflow filename | `publish.yml`（必须逐字一致） |
| Environment name | 留空（或与 workflow 里的 `environment:` 对齐） |

之后发版：改 `package.json` 的 `version` → 提交 → `git tag vX.Y.Z && git push --tags`。
workflow 会先校验 tag 与 version 一致、跑 `npm test`，再用 OIDC 发布
（`permissions: id-token: write`，不需要任何 secret，也不需要 2FA 交互）。
