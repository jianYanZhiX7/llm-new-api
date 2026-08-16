# AigoToken（llm-new-api）产品文档

> 基于 [QuantumNous/new-api](https://github.com/QuantumNous/new-api) 二次开发的大模型网关与 AI 资产管理系统。
> 本文档面向产品、运营、运维与接入开发者，描述本 fork（`jianYanZhiX7/llm-new-api`，品牌 **AigoToken**）的完整产品能力。

---

## 目录

1. [产品定位](#1-产品定位)
2. [目标用户与使用场景](#2-目标用户与使用场景)
3. [产品架构](#3-产品架构)
4. [核心概念](#4-核心概念)
5. [功能清单](#5-功能清单)
6. [用户与权限体系](#6-用户与权限体系)
7. [API 能力与接口列表](#7-api-能力与接口列表)
8. [计费与定价体系](#8-计费与定价体系)
9. [运营与数据看板](#9-运营与数据看板)
10. [部署指南](#10-部署指南)
11. [配置参考（环境变量）](#11-配置参考环境变量)
12. [new-api-deployer 部署 CLI](#12-new-api-deployer-部署-cli)
13. [本 fork 的定制改动](#13-本-fork-的定制改动)
14. [多机部署与高可用](#14-多机部署与高可用)
15. [合规声明](#15-合规声明)
16. [FAQ](#16-faq)

---

## 1. 产品定位

AigoToken 是一个**自托管的大模型 API 网关与 AI 资产管理系统**：

- **统一入口**：把 40+ 上游 AI 服务商（OpenAI、Anthropic Claude、Google Gemini、Azure、AWS Bedrock、DeepSeek、Moonshot、Ollama、VertexAI、火山引擎等）聚合到一个 OpenAI 兼容 API 后面。
- **资产管理**：对组织内的 API Key、额度、用户、分组、定价进行集中管理。
- **计量计费**：按 token / 按次计费，支持缓存读写计价、用户组倍率、订阅计划，可对接易支付、Stripe 充值。
- **可观测**：可视化数据看板、用量统计、成本核算、日志审计。

一句话：**面向企业内部或商业化运营的「AI API 中台」**。

## 2. 目标用户与使用场景

| 角色 | 使用方式 |
|------|----------|
| **终端开发者** | 拿到一个 `sk-` Key，用 OpenAI SDK 直接调用网关，无需关心上游是谁 |
| **团队管理者** | 为成员分配额度（令牌）、限制可用模型、查看团队用量与成本 |
| **平台管理员** | 配置上游渠道、设置定价与倍率、管理用户与权限、监控渠道健康 |
| **运维 / DevOps** | Docker / systemd 部署、Redis 与多节点扩展、日志库分离 |
| **自动化流水线** | 通过 `new-api-deployer` CLI 或管理 REST API 全自动上架渠道与模型 |

**典型场景**

- 组织内部统一鉴权：员工共用一套企业级 Key，按部门分组核算成本。
- 多模型管理：一个入口同时暴露 GPT、Claude、Gemini、国产模型，客户端零改造。
- 商业化 API 转售（需自行完成合规义务）：用户注册、充值、按量计费、分组定价。
- 私有化部署：数据不出内网，支持 SQLite / MySQL / PostgreSQL。

## 3. 产品架构

```
┌─────────────────────────────────────────────────────┐
│  客户端（OpenAI SDK / Claude SDK / Gemini SDK / 自定义） │
└──────────────────────┬──────────────────────────────┘
                       │ sk-xxx（令牌）
┌──────────────────────▼──────────────────────────────┐
│                    AigoToken 网关                     │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Web 控制台│ │ 管理 API │ │ Relay API │ │ WebSocket│  │
│  │ (React) │ │ /api/*   │ │ /v1/* 等  │ │ (Realtime)│  │
│  └─────────┘ └─────────┘ └────┬─────┘ └──────────┘  │
│  middleware：鉴权/限流/分发/日志/CORS                  │
│  relay：格式转换 + 40+ 上游适配器（relay/channel/*）    │
│  service/model：用户、令牌、渠道、日志、计费、订阅        │
└───────┬──────────────┬──────────────┬───────────────┘
        │              │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌────▼─────┐
   │ SQLite/ │   │   Redis   │  │ 上游 AI   │
   │ MySQL/PG│   │ (可选缓存) │  │ 服务商    │
   └─────────┘   └───────────┘  └──────────┘
```

**技术栈**

| 层 | 技术 |
|----|------|
| 后端 | Go 1.22+，Gin，GORM v2 |
| 前端 | React 19 + TypeScript，Rsbuild，Base UI，Tailwind CSS，i18next（7 种语言） |
| 数据库 | SQLite / MySQL ≥ 5.7.8 / PostgreSQL ≥ 9.6（三者同时支持）；日志库可分离（含 ClickHouse） |
| 缓存 | Redis（可选）+ 内存缓存 |
| 认证 | JWT Session、PAT、WebAuthn/Passkeys、OAuth（GitHub/Discord/LinuxDO/Telegram/OIDC） |

**代码分层**：`Router -> Controller -> Service -> Model`，目录职责见 `AGENTS.md`。

## 4. 核心概念

| 概念 | 说明 |
|------|------|
| **渠道（Channel）** | 一个上游服务商的接入配置（类型、Base URL、上游 Key、模型列表、分组、优先级、权重）。同一模型可挂多个渠道实现负载均衡与故障转移。 |
| **模型（Model）** | 渠道对外发布的模型 ID，如 `gpt-4o`、`claude-sonnet-4`。支持模型名映射（客户端名 → 上游名）。 |
| **令牌（Token）** | 发给用户的 `sk-` Key。可设置额度、过期时间、可用模型、可用 IP、所属分组。 |
| **用户 / 用户组** | 用户归属分组（default/vip/...），分组决定可用模型与计费倍率。 |
| **额度（Quota）** | 内部记账单位，500000 quota = $1。用户与令牌均有额度，请求时预扣、结束后按实结算。 |
| **倍率（Ratio）** | 定价核心：模型倍率 × 用户组倍率 = 实际价格。模型倍率 N = $2N / 1M tokens。 |
| **能力（Ability）** | 渠道-模型-分组的路由三元组，网关据此把请求分发到正确渠道。 |

## 5. 功能清单

### 5.1 网关核心

- 40+ 上游渠道类型适配（openai / anthropic / gemini / azure / aws / deepseek / ollama / moonshot / openrouter / vertexai / volcengine / kling / replicate / coze 等，见 `constant/channel.go`）
- 统一 OpenAI 兼容入口，客户端只需改 `base_url` 和 Key
- 渠道加权随机、优先级路由、失败自动重试（重试次数在 设置 → 运营设置 配置）
- 渠道自动禁用 / 手动管理，渠道连通性测试
- 流式（SSE）与 WebSocket（Realtime）转发
- 格式转换：
  - OpenAI Compatible ⇄ Claude Messages
  - OpenAI Compatible → Google Gemini
  - Google Gemini → OpenAI Compatible（文本）
  - 思考（thinking）内容转普通内容
- Reasoning Effort 支持：模型名后缀 `-high/-medium/-low` 控制思考力度（o3-mini、gpt-5、Claude thinking、Gemini thinking 等）

### 5.2 模型类型与任务

| 类型 | 说明 |
|------|------|
| Chat Completions | `/v1/chat/completions`，OpenAI 格式 |
| Responses | `/v1/responses`，OpenAI 新格式 |
| Claude Messages | `/v1/messages`，Claude 原生格式 |
| Gemini | `generateContent`，Gemini 原生格式 |
| Embeddings | `/v1/embeddings` |
| 图像 | 文生图 / 图生图 / 编辑，Midjourney-Proxy(Plus)、Suno-API |
| 音频 | 语音合成（TTS）、转写（ASR） |
| 视频 | 视频生成异步任务（Kling 等） |
| Rerank | Cohere / Jina 重排序 |
| Realtime | 实时语音/多模态对话（含 Azure） |

### 5.3 计费与资产

- 按量（token）计费：input / output / 缓存读 / 缓存写 四档倍率
- 按次计费：固定单价（图像、任务类模型）
- 用户组倍率：分组折扣 / 加价
- 表达式计费：分层/动态计费表达式系统（见 `pkg/billingexpr/expr.md`）
- 订阅计划：`subscription_plans` 等表支持套餐订阅
- 充值：易支付、Stripe；兑换码（redemption）、签到（checkin）发放额度
- 计费安全：预扣费 + 结算差额，防溢出、防负数、饱和钳制可审计（`admin_info.quota_saturation`）

### 5.4 安全与鉴权

- 登录方式：账号密码、GitHub / Discord / LinuxDO / Telegram / OIDC / 自定义 OAuth
- 双因素认证（2FA + 备份码）、WebAuthn / Passkeys
- 登录会话管理：单用户活跃 Session 上限、签发窗口限额、撤销审计
- 令牌安全：额度限制、模型白名单、IP 白名单、过期时间
- Key 额度自助查询（配合 new-api-key-tool）

### 5.5 管理与运维

- 多语言控制台（中/英/繁/法/俄/日/越）
- 数据看板：用量、成本、渠道耗时、错误率可视化
- 日志：全量请求日志，可分离到独立 LOG_DB（含 ClickHouse + TTL）
- 系统任务与实例管理、性能指标（perf_metrics）
- Casbin 细粒度后台权限（RBAC）

## 6. 用户与权限体系

| 角色 | 能力 |
|------|------|
| 普通用户 | 管理自己的令牌、查看自己的用量日志与余额、充值/兑换、订阅 |
| 管理员（Admin） | 渠道管理、用户管理、全量日志、定价设置 |
| 超级管理员（Root） | 系统设置、运营设置、倍率设置、PAT 签发 |

**PAT（Access Token）**：管理员在 `/profile` 页生成，用于调用管理 REST API（如 deployer CLI）。每次重新生成会轮换并使旧值失效。

**API 鉴权链**：请求带 `Authorization: Bearer sk-xxx` → 中间件校验令牌 → 校验用户额度/分组/模型权限 → 分发中间件选渠道 → relay 转发。

## 7. API 能力与接口列表

**面向终端用户（用 `sk-` Key）：**

| 接口 | 路径 |
|------|------|
| 聊天补全 | `POST /v1/chat/completions` |
| Responses | `POST /v1/responses` |
| Claude Messages | `POST /v1/messages` |
| Gemini 原生 | `POST /v1beta/models/{model}:generateContent`（等价路径） |
| 嵌入 | `POST /v1/embeddings` |
| 图像生成 | `POST /v1/images/generations` |
| 音频转写/合成 | `POST /v1/audio/transcriptions` / `POST /v1/audio/speech` |
| 重排序 | `POST /v1/rerank` |
| Realtime | `wss://.../v1/realtime` |
| 模型列表 | `GET /v1/models`（本 fork 额外返回 `context_window` 及来源，见 §13） |
| 用量/余额 | `GET /v1/dashboard/billing/*` |

**面向管理自动化（用 PAT + Cookie Session）：** `/api/user/*`、`/api/channel/*`、`/api/token/*`、`/api/option/*`、`/api/log/*` 等，OpenAPI 规范见 `docs/openapi/`。

**调用示例：**

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-你的令牌",
    base_url="https://www.aigotoken.com/v1"
)
resp = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "你好"}]
)
print(resp.choices[0].message.content)
```

```bash
curl https://www.aigotoken.com/v1/chat/completions \
  -H "Authorization: Bearer sk-你的令牌" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4","messages":[{"role":"user","content":"hi"}]}'
```

## 8. 计费与定价体系

**换算关系**

- 内部记账：`500000 quota = $1`
- 模型倍率：`ratio N = $2N / 1M tokens`（即 $0.002N / 1K tokens）
- 实际扣费 = `(input_tokens × input_ratio + output_tokens × output_ratio + 缓存 tokens × 缓存倍率) × 用户组倍率`
- 输出倍率以输入倍率为基准：`--completion 4` 表示输出单价是输入的 4 倍

**设置入口**

- Web UI：设置 → 运营设置 / 倍率设置（模型倍率、补全倍率、缓存倍率、固定价格、分组倍率）
- CLI：`new-api-deployer set-price`（见 §12）
- REST：`PUT /api/option/`（整体读写倍率 option map）

**扣费流程**

```
请求进入 → 校验令牌/额度 → 预扣费（按估算上限）→ 上游调用
→ 按真实 usage 结算差额 → 写入 logs（含 admin_info 审计字段）→ 更新 quota_data 统计
```

预扣费失败（余额不足）直接拒绝；结算时差额退回，保证不超扣、不漏扣、永不为负。

## 9. 运营与数据看板

- **控制台首页**：今日/累计用量、请求量、消耗、Top 模型 / 用户 / 渠道
- **数据看板**：按时间维度的 token 用量、消费额、rpm、渠道延迟与成功率
- **日志**：每次请求的模型、令牌、渠道、耗时、prompt/completion tokens、费用、错误信息；管理员可见 `admin_info`（含计费饱和审计）
- **渠道监控**：响应时间、成功率测试，自动禁用告警
- **签到 / 兑换码 / 充值订单**：运营发放与核销记录（`top_ups`、`redemptions`、`checkins`）

## 10. 部署指南

### 10.1 部署要求

| 组件 | 要求 |
|------|------|
| 数据库 | SQLite（零配置）或 MySQL ≥ 5.7.8 或 PostgreSQL ≥ 9.6 |
| 容器 | Docker / Docker Compose（推荐） |
| 架构 | 仅 64 位（amd64 / arm64） |
| 缓存 | Redis（可选，多节点必配） |

### 10.2 Docker Compose（推荐）

```bash
git clone git@github.com:jianYanZhiX7/llm-new-api.git
cd llm-new-api
# 按需编辑 docker-compose.yml（端口、数据库、Redis、SESSION_SECRET）
docker-compose up -d
# 访问 http://localhost:3000 ，默认账号 root / 123456（首次登录务必改密）
```

### 10.3 Docker 单容器

```bash
# SQLite
docker run --name new-api -d --restart always \
  -p 3000:3000 -e TZ=Asia/Shanghai \
  -v ./data:/data \
  calciumion/new-api:latest

# MySQL
docker run --name new-api -d --restart always \
  -p 3000:3000 -e TZ=Asia/Shanghai \
  -e SQL_DSN="root:123456@tcp(localhost:3306)/oneapi" \
  -v ./data:/data \
  calciumion/new-api:latest
```

### 10.4 源码构建 / systemd

```bash
# 前端
cd web && bun install && bun run build
# 后端
go build -o new-api
# 服务（仓库已带 new-api.service 模板，及 deploy.sh / deploy_restart.sh）
sudo systemctl enable --now new-api
```

### 10.5 首次初始化清单

1. 修改 root 默认密码，配置站点名称 / 服务器地址
2. 添加渠道（管理台 → 渠道 → 添加，或用 deployer CLI）
3. 测试渠道连通性
4. 设置模型定价与分组倍率
5. 创建用户组并发放令牌
6. （对外运营前）完成备案、内容安全、实名、日志留存等合规义务

## 11. 配置参考（环境变量）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SESSION_SECRET` | 鉴权签名密钥；**所有节点必须一致** | - |
| `CRYPTO_SECRET` | 缓存键 HMAC 密钥；共享 Redis 的节点必须一致 | 跟随 `SESSION_SECRET` |
| `SQL_DSN` | 数据库连接串（MySQL/PG） | SQLite |
| `REDIS_CONN_STRING` | Redis 连接串 | - |
| `MEMORY_CACHE_ENABLED` | 内存缓存开关 | `false` |
| `SYNC_FREQUENCY` | 缓存同步间隔（秒） | `60` |
| `STREAMING_TIMEOUT` | 流式超时（秒） | `300` |
| `STREAM_SCANNER_MAX_BUFFER_MB` | 流式单行最大缓冲（MB），超大 base64 片段需调大 | `64` |
| `MAX_REQUEST_BODY_MB` | 请求体上限（MB，解压后计），超限返回 413 | `32` |
| `SESSION_COOKIE_SECURE` | HTTPS Secure Cookie + 严格 Origin 校验开关 | `false` |
| `SESSION_COOKIE_TRUSTED_URL` | Secure 模式下允许 refresh/logout 的 HTTPS Origin 白名单 | - |
| `TRUSTED_PROXIES` | 信任的代理 IP/CIDR；`none` 表示全不信任 | 回环 + 内网段 |
| `USER_SESSION_ACTIVE_LIMIT` | 单用户最大活跃 Session 数 | `50` |
| `AZURE_DEFAULT_API_VERSION` | Azure API 版本 | `2025-04-01-preview` |
| `PYROSCOPE_URL` 等 | Pyroscope 持续性能剖析 | - |

完整列表见官方 [环境变量文档](https://docs.newapi.pro/zh/docs/installation/config-maintenance/environment-variables)，鉴权契约见 `docs/authentication.md`，数据库结构见 `docs/database-schema.md`。

## 12. new-api-deployer 部署 CLI

独立 Go 模块（`github.com/aigotoken/deployer`，仅依赖 cobra），通过公开 REST API 全自动管理渠道与定价，不碰 Web UI。详细用法见 `deployer/README.md`，配套 agent skill 见 `deployer/skills/newapi-deploy/SKILL.md`。

**凭据**

| 凭据 | 用途 | 设置方式 |
|------|------|----------|
| `NEW_API_SERVER` | 网关地址 | `--server` 或环境变量 |
| `NEW_API_TOKEN` | 管理员/Root PAT（add/test-channel、set/list-prices） | `--token` |
| `NEW_API_USER_TOKEN` | 用户 `sk-` Key（verify/list-models） | `--user-token` |

**标准流程**：`add-channel` → `test-channel` → `set-price`（可选）→ `verify-model` → `list-models`

```bash
cd deployer && go build -o new-api-deployer .

export NEW_API_SERVER="https://www.aigotoken.com/"
export NEW_API_TOKEN="管理员PAT"
export NEW_API_USER_TOKEN="sk-用户Key"

# 1. 新增渠道并发布模型
./new-api-deployer add-channel --type openai --name "openai-official" \
  --key "sk-xxx" --base-url "https://api.openai.com" \
  --models "gpt-4o,gpt-4o-mini" --group default

# 2. 测试连通性（用返回的渠道 ID）
./new-api-deployer test-channel 123

# 3. 定价（ratio 2.5 = $5/1M 输入；输出 4 倍）
./new-api-deployer set-price --model gpt-4o --ratio 2.5 --completion 4
# 固定单价 / 缓存倍率 / 分组折扣
./new-api-deployer set-price --model midjourney --price 0.1
./new-api-deployer set-price --model claude-3-5-sonnet --cache 0.1 --create-cache 1.25
./new-api-deployer set-price --group vip --ratio 0.8

# 4. 端到端验证（走真实 relay 链路）
./new-api-deployer verify-model gpt-4o

# 5. 查看用户可见模型与当前定价
./new-api-deployer list-models
./new-api-deployer list-prices
```

**已知限制**：无 `list-channels` 命令（查列表需直接 `GET /api/channel/`）；不支持渠道删除/禁用；`set-price` 是整表读-合-写，并发编辑同 option 可能互相覆盖；需要 Root 级 PAT。

## 13. 本 fork 的定制改动

相对上游 QuantumNous/new-api，本仓库（AigoToken）的主要差异：

| 改动 | 说明 |
|------|------|
| **品牌化** | 品牌、favicon/logo 全量替换为 AigoToken（SVG），站点为 www.aigotoken.com |
| **新版首页开关** | 新增「启用新版首页」设置项，移植 classic 营销风格首页与页脚 |
| **`/v1/models` 增强** | 返回每个模型的 `context_window`（上下文窗口）及数据来源，数据接入 models.dev |
| **new-api-deployer CLI** | `deployer/` 独立模块 + `newapi-deploy` agent skill，实现渠道/模型/定价全自动 API 化部署（见 §12） |
| **部署脚本** | 仓库内置 `deploy.sh` / `deploy_restart.sh` / `new-api.service` / docker-compose 配置 |

## 14. 多机部署与高可用

**硬性要求**

- 所有节点共用同一个主数据库，并设置**相同**的 `SESSION_SECRET`
- 共享 Redis 的节点还必须设置**相同**的 `CRYPTO_SECRET`

**Session 与限流语义**

| Redis 拓扑 | Session 状态传播 | 限流语义 |
|------------|------------------|----------|
| 所有节点共享 Redis | 撤销/版本发布通常即时传播 | 限流额度节点间共享 |
| 每节点独立 Redis | 最迟 `SYNC_FREQUENCY` 内回源收敛；版本轮换后短暂可能 401 | 各节点独立计数，总额度最坏 × 节点数 |
| 不用 Redis | 每次 Session 校验直读数据库 | 各节点独立内存限流 |

**日志库**：`logs` 表可迁移到独立 LOG_DB（支持 ClickHouse，原生 `CREATE TABLE` + TTL）。建议高流量场景将日志与业务库分离。

## 15. 合规声明

> [!IMPORTANT]
> - 本项目仅面向**合法授权**的 AI API 网关、组织内部鉴权、多模型管理、用量统计、成本核算和私有化部署场景。
> - 使用者必须合法取得上游 API Key、账号、模型服务或接口权限，并遵守上游服务条款及适用法律法规。
> - 面向公众提供生成式 AI 服务或 API 转售时，应遵守《生成式人工智能服务管理暂行办法》等监管要求，自行完成备案、许可、内容安全、实名、日志留存、税务和上游授权等合规义务。

## 16. FAQ

**Q: 默认登录账号？**
root / 123456，部署后立即修改。

**Q: 客户端如何从 OpenAI 官方迁移？**
只需把 `base_url` 指向网关 `/v1`、`api_key` 换成网关令牌，SDK 与请求体无需改动。

**Q: 请求 401 / 无可用渠道？**
检查令牌是否启用、用户额度是否充足、令牌分组是否包含目标模型（能力表）、渠道是否被自动禁用。

**Q: 上游返回 413 或超大响应中断？**
调大 `MAX_REQUEST_BODY_MB` 或 `STREAM_SCANNER_MAX_BUFFER_MB`。

**Q: 价格显示的美元怎么来的？**
服务端存的是倍率，ratio N = $2N/1M tokens；页面与 `list-prices` 统一展示为 USD / 1M tokens。

**Q: 想自动批量上架模型怎么办？**
用 `new-api-deployer`（§12）或直接调管理 REST API；AI agent 可加载 `newapi-deploy` skill 执行标准流程。

---

*文档版本：2026-08-16 · 基于 `jianYanZhiX7/llm-new-api` · 上游：QuantumNous/new-api（Apache-2.0）*
