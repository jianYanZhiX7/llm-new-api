# CLAUDE.md — Project Conventions for new-api

@AGENTS.md

## Claude Code

- Follow the shared project instructions imported from `AGENTS.md`.

## 渠道部署 Skill（newapi-deploy）

`deployer/skills/newapi-deploy/SKILL.md` 定义了 `newapi-deploy` 这个 agent skill，用于通过 `deployer/new-api-deployer` CLI 端到端地把渠道、模型、定价部署到线上 new-api 网关（全程走 REST API，不动 Web UI）。

**凭据**（环境变量）：
- `NEW_API_SERVER` — 网关地址（如 `https://www.aigotoken.com/`）
- `NEW_API_TOKEN` — 管理员 PAT（用于 add-channel / test-channel / set-price / list-prices）
- `NEW_API_USER_TOKEN` — 用户 `sk-` key（用于 verify-model / list-models）

**标准流程**：`add-channel` → `test-channel` → `set-price`（仅当需要）→ `verify-model` → `list-models`。

**能做到什么**：
- 新增渠道并发布模型（支持 openai / anthropic / gemini / deepseek / azure / aws 等 40+ 类型）
- 测试渠道连通性（`test-channel <id>`）
- 设置定价：按模型设 input/output ratio、缓存读写比、固定单价，或按用户组设倍率（`set-price`）
- 端到端验证模型走真实 relay 链路（`verify-model <model>`）
- 查看用户可见模型（`list-models`）与当前定价（`list-prices`）

**注意**：CLI 没有 `list-channels` 命令；查询渠道列表需直接调 `GET /api/channel/`（admin PAT 认证）。渠道的删除/禁用/状态管理也不在命令范围内。