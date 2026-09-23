# AGENTS.md

基于 vue-vben-admin v5.7.0 定制的魔改仓库（pnpm + turbo monorepo），用于「云南体育中考」平台。业务代码在 `apps/*`；其余基本都是上游框架代码。

## 目录结构

- `apps/web-admin`（`@vben/web-admin`）— 平台端，dev 端口 9527
- `apps/web-front`（`@vben/web-front`）— 业务端，dev 端口 9528
- `apps/backend-mock`（`@vben/backend-mock`）— 上游 Nitro mock 服务（端口 5320），仅供 playground 使用
- `playground`（`@vben/playground`）— 上游演示项目（dev 端口 5555），与上游 v5.7.0 保持一致
- `packages/*` — vben 框架包（`@core`、`effects`、`stores` 等）
- `internal/*` — 共享构建工具（`vite-config`、`tsconfig`、lint 配置）
- `scripts/*` — 仓库 CLI：`vsh`（驱动 `pnpm lint`/`check:*`）、`turbo-run`（交互式应用选择器）

## 常用命令

```bash
pnpm install                # 仅允许 pnpm（强制）；postinstall 会 stub 内部包
pnpm dev:web-admin          # 或 pnpm dev:web-front（"pnpm dev" 是交互式选择器）
pnpm lint                   # oxfmt --check + oxlint + eslint + stylelint（并行）
pnpm format                 # 同样的 linter 加 --fix
pnpm check:type             # turbo typecheck（每个包跑 vue-tsc）
pnpm check                  # 循环依赖 + 依赖 + 类型 + cspell
pnpm test:unit              # vitest run --dom，根配置覆盖所有包
pnpm vitest run <path> --dom   # 单个测试文件/目录（如 packages/@core/base/shared/src/utils）
pnpm build:web-admin        # 或 build:web-front；VITE_ARCHIVER=true 时还会产出 dist.zip
pnpm dev:play               # 启动 playground 演示项目（5555），进程内自动起 Nitro mock（5320）
```

用 `pnpm -F @vben/web-admin run <script>` 只针对单个包执行（如 Playwright 的 `test:e2e`）。

## 注意事项

- `apps/web-admin` 和 `apps/web-front` 都由 `playground` 复制修改而来；新增或修改功能时，先查找并优先参考 `playground` 中相近的演示代码，沿用适用的目录组织与实现风格。没有对应示例或示例与现有业务契约冲突时，以业务契约和仓库约定为准。
- Lefthook pre-commit 每次提交都跑完整 `pnpm lint` + `pnpm check:type`；commit-msg 跑 commitlint（约定式提交，如 `feat(@vben/web-admin): ...`）。提交信息可以用中文。
- 应用内导入别名是 `#/*` → `./src/*`（不是 `@/`）。
- dev 需要本地后端运行在 `http://127.0.0.1:8006`。两个业务应用都代理 `/api` 并重写：web-admin → `/api/admin`，web-front → `/api/front`（见 `apps/*/vite.config.ts`），业务端的 Nitro mock 已关闭（`VITE_NITRO_MOCK=false`）。只有 playground 使用 Nitro mock（`VITE_NITRO_MOCK=true`，dev 时由 vite 插件在 5320 端口进程内启动 `apps/backend-mock`）。
- `apps/backend-mock` 的 eslint 豁免（`no-console`、`n/*` 规则）在根 `eslint.config.mjs` 中维护（上游放在 internal/lint-configs，本仓库不改 internal）。
- `pnpm check:cspell` 会检查所有 `**/*.ts` 以及 README 和 changesets（测试文件被忽略）。新增领域术语要加进 `cspell.json` 的 `words`。
- UI 库是 `antdv-next`；路由使用 hash 模式；API 响应中的 BigInt ID 由 `json-bigint` 处理（见 `apps/*/src/api/request.ts`）。
- 业务代码、注释、菜单/路由命名均为中文 — 保持一致。

## 强制规则

- 不要修改 `node_modules/`。
- 不要修改 `internal/`。
- 不要修改 `packages/`。
- 只能修改 `apps/` 目录下代码，如必须修改其它目录文件则必须由我授权。

## 后端 API 规范

统一使用 HTTP 状态码表达请求结果。

---

### 成功响应

成功时：

- HTTP 状态码返回 200、201、202、204 等标准状态码。
- 直接返回业务数据。
- 不使用 code 字段包装响应。

示例：

```json
{
  "id": 1,
  "name": "张三",
  "email": "test@example.com"
}
```

分页示例（列表字段为 `items`，分页元信息统一放在 `meta` 中，顶层同时保留 `total`，与后端 `/api/admin` 分页规范一致）：

```json
{
  "items": [],
  "meta": {
    "current_page": 1,
    "last_page": 10,
    "per_page": 20,
    "total": 200
  },
  "total": 200
}
```

---

### 失败响应

根据实际情况返回：

| 场景         | HTTP状态码 |
| ------------ | ---------- |
| 参数错误     | 422        |
| 未登录       | 401        |
| 无权限       | 403        |
| 数据不存在   | 404        |
| 业务错误     | 400        |
| 数据冲突     | 409        |
| 请求频率限制 | 429        |
| 服务器错误   | 500        |

返回格式：

```json
{
  "message": "错误信息"
}
```

示例：

```json
{
  "message": "用户不存在"
}
```

---
