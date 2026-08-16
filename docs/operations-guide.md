# AigoToken（llm-new-api）实用操作手册

> 面向**普通用户**和**管理员**的实操指南，按控制台页面逐个讲解怎么用。
> 配套阅读：`docs/product-overview.md`（产品总览）。

---

## 目录

**用户篇**
1. [注册与登录安全](#一用户篇)
2. [令牌（API Key）管理](#2-令牌api-key管理)
3. [钱包：充值、兑换、签到](#3-钱包充值兑换签到)
4. [调用 API：从零跑通第一个请求](#4-调用-api从零跑通第一个请求)
5. [Playground 在线调试](#5-playground-在线调试)
6. [模型广场与价格页](#6-模型广场与价格页)
7. [用量日志与账单自查](#7-用量日志与账单自查)
8. [订阅计划](#8-订阅计划)

**管理员篇**
9. [渠道管理：接入上游](#9-渠道管理接入上游)
10. [模型与能力配置](#10-模型与能力配置)
11. [定价与倍率设置](#11-定价与倍率设置)
12. [用户与分组管理](#12-用户与分组管理)
13. [兑换码运营](#13-兑换码运营)
14. [系统设置速查](#14-系统设置速查)
15. [日志与渠道排障](#15-日志与渠道排障)
16. [CLI 自动化运维](#16-cli-自动化运维)

---

# 一、用户篇

## 1. 注册与登录安全

**注册**：打开站点首页 -> 注册（若管理员开启了注册开关）。支持 GitHub / Discord / LinuxDO / Telegram / OIDC 等 OAuth 登录（视管理员开启情况）。

**进入「个人中心 / Profile」建议立刻做三件事**：

1. **改密码**：默认无，但注册密码弱的话尽快更换。
2. **绑定 2FA**：安全卡片中开启两步验证（TOTP），生成后保存好备份码。
3. **生成 Access Token（PAT）**：点击 Security 卡片中的 "Access Token"。注意：**每次生成都会轮换，旧 PAT 立即失效**。PAT 用于调用管理 API 和 deployer CLI，不要和 `sk-` 调用 Key 混淆。

**会话管理**：可查看/撤销自己的活跃登录 Session；单账号默认最多 50 个活跃 Session。

## 2. 令牌（API Key）管理

页面：侧边栏 **「API 令牌 / Keys」**。这是用户最常用的页面。

### 2.1 创建令牌

点击「添加令牌」，关键字段：

| 字段 | 建议 | 说明 |
|------|------|------|
| 名称 | 如 `my-project-dev` | 便于在日志里区分用途 |
| 额度 | 按需 | 留空/勾选无限额度则跟随账户余额；设固定额度可控制单个项目上限 |
| 有效期 | 按需 | `-1` 永不过期；建议生产 Key 设 90 天轮换 |
| 分组 | default | 决定可用模型范围与计费倍率（分组由管理员定义） |
| 模型限制 | 建议开启 | 白名单机制：只允许 Key 调指定模型，防止误调高价模型 |
| 允许 IP | 建议 | CIDR 白名单，如 `203.0.113.0/24`；留空不限制 |
| 跨分组重试 | 默认关 | 开启后失败重试可临时借用其他分组的渠道 |

保存后**立即复制 `sk-...`**——完整 Key 只显示一次。

### 2.2 日常管理

- **状态一目了然**：列表中状态含义 `启用 / 已禁用 / 已过期 / 额度耗尽`。
- **实用操作**：复制 Key、编辑、启用/禁用、删除。
- **用量监控**：列表显示剩余额度、已用额度、最近访问时间。
- **排障技巧**：请求报 401 先看令牌状态；报"无可用渠道"看分组和模型限制是否匹配。

### 2.3 安全建议

- 一项目一 Key，最小权限（模型限制 + IP 白名单）。
- Key 泄露的处理顺序：禁用旧 Key -> 新建 Key -> 更新客户端配置。
- 查 Key 余额可用社区工具 [new-api-key-tool](https://github.com/Calcium-Ion/new-api-key-tool)，无需登录后台。

## 3. 钱包：充值、兑换、签到

页面：**「钱包 / Wallet」**。

- **在线充值**：输入金额（有最低充值额和预设档位），选择支付方式（易支付 / Stripe，视站点开通情况），支付成功后额度实时到账。
- **兑换码充值**：粘贴管理员发放的兑换码，兑换对应额度。
- **签到**：若站点开启签到功能，每日签到领取额度（额度由管理员配置）。
- **充值记录 / 订单**：钱包页可查历史充值订单（`top_ups`）。

额度换算：**$1 = 500,000 quota**，账单页一般直接显示美元。

## 4. 调用 API：从零跑通第一个请求

前提：已有一个启用状态的令牌。网关地址以 `https://www.aigotoken.com` 为例。

**curl**

```bash
curl https://www.aigotoken.com/v1/chat/completions \
  -H "Authorization: Bearer sk-你的key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

**Python（OpenAI SDK）**

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-你的key",
    base_url="https://www.aigotoken.com/v1",
)
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "你好"}],
    stream=True,   # 流式同样支持
)
for chunk in resp:
    print(chunk.choices[0].delta.content or "", end="")
```

**Claude / Gemini 原生格式也可直用**（SDK 里把 base_url 换成网关）：

```bash
# Claude Messages 格式
curl https://www.aigotoken.com/v1/messages \
  -H "x-api-key: sk-你的key" -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}'
```

**查可用模型与上下文窗口**（本 fork 增强，含 `context_window`）：

```bash
curl https://www.aigotoken.com/v1/models \
  -H "Authorization: Bearer sk-你的key"
```

**实用技巧**：

- 思考力度控制：模型名加后缀，如 `o3-mini-high`、`gemini-2.5-pro-thinking-128`。
- 图片等大响应被截断时是服务端流缓冲限制，联系管理员调 `STREAM_SCANNER_MAX_BUFFER_MB`。
- 413 = 请求体超限；401 = 令牌问题；"无可用渠道" = 模型未开放或渠道故障。

## 5. Playground 在线调试

页面：**「Playground / 聊天」**。不写代码即可验证模型是否可用：

1. 选择模型（下拉只显示你有权限的模型）
2. 填 System / User 消息，可调温度等参数
3. 发送，实时看流式回复

**用途**：新 Key 验活、对比不同模型、调试 system prompt。请求走真实 relay 链路并正常计费，日志里可查。

## 6. 模型广场与价格页

- **「模型 / Models」页**：浏览站点开放的模型、供应商、上下文窗口等元信息。
- **「价格 / Pricing」页**（`/pricing`，无需登录也可看，视配置）：每个模型的 **输入/输出/缓存读/缓存写 单价（USD / 1M tokens）**，以及固定单价模型（图像类）和分组倍率。
- **「排行榜 / Rankings」**：模型消耗榜等站点统计（视配置）。

**比价技巧**：缓存命中率高的场景（重复长上下文）优先选缓存读折扣大的 Claude 系模型，价格页的 `cache read` 列就是依据。

## 7. 用量日志与账单自查

页面：**「日志 / Usage Logs」**（用户只能看自己的）。

每条日志包含：时间、模型、令牌名、耗时、prompt/completion tokens、缓存 tokens、**本次费用**、分组、IP。支持按时间 / 模型 / 令牌筛选。

**对账方法**：

1. 日志页按令牌筛选 + 时间范围汇总 -> 应等于该 Key 的已用额度。
2. 余额 + 已用 ≈ 充值 + 兑换 + 签到 - 退款。
3. 单笔费用异常时：看该条日志的模型倍率是否变化（管理员可能调价），缓存命中是否生效。

**控制台首页（Dashboard）**：看个人今日/累计 token、消费曲线、Top 模型。

## 8. 订阅计划

页面：**「订阅 / Subscriptions」**（若站点开启）。购买套餐后可获得固定额度包或折扣权益，订阅期内自动生效；预扣与结余记录可在订单中追溯。适合用量稳定的团队按月预算。

---

# 二、管理员篇

## 9. 渠道管理：接入上游

页面：**「渠道 / Channels」**。渠道 = 一个上游服务商账号的接入配置。

### 9.1 添加渠道（表单要点）

| 字段 | 说明 |
|------|------|
| 类型 | 40+ 种：openai / anthropic / gemini / azure / aws / deepseek / ollama / openrouter / vertexai / 火山引擎 等 |
| 名称 | 建议含用途与地域，如 `openai-官方-优先` |
| 分组 | 哪些用户组可用：default、vip…… |
| 密钥 | 上游 API Key（多 Key 可填多行做轮询） |
| 代理 / Base URL | 自定义上游地址（中转、私有化 Ollama 等） |
| 模型 | 该渠道提供的模型列表（可从常用列表点选） |
| 模型重定向 | JSON 映射 `{"客户端名":"上游名"}`，如 `{"gpt-4o":"gpt-4o-2024-11-20"}` |
| 优先级 / 权重 | 同模型多渠道：先按优先级，同优先级按权重加权随机 |
| 自动禁用 | 上游连续报错自动摘除，恢复后可自动/手动启用 |

### 9.2 常用操作

- **测试**：渠道列表「测试」按钮 = 上游连通性检查，显示延迟。
- **批量操作**：批量启用/禁用/删除、批量测试。
- **盯指标**：列表显示每个渠道的成功率/响应时间；异常渠道及时降优先级或禁用。
- **多渠道容灾**：同一模型至少配 2 个不同上游渠道，配合「失败重试次数」（运营设置）实现自动切换。

## 10. 模型与能力配置

- **「模型 / Models」管理页**：维护模型元信息（供应商、上下文窗口等）；本 fork 的 `/v1/models` 会返回 `context_window` 及来源（接入 models.dev 数据）。
- **能力（abilities）**：添加渠道选好「分组 + 模型」后自动生成，无需手工操作；用户能否调某模型 = 其令牌分组 × 渠道分组 × 令牌模型白名单 三者交集。
- **模型隐藏/可见性**：系统设置中可控制某些模型仅对特定分组可见。

## 11. 定价与倍率设置

入口：**「设置 -> 运营设置 / 倍率设置」**（或用 CLI，见 §16）。

**核心公式**：

```
模型倍率 N  =  $2N / 1M tokens
实付        =  (输入 tokens×输入倍率 + 输出 tokens×输出倍率 + 缓存 tokens×缓存倍率)
             × 用户分组倍率
```

**实操场景**：

| 场景 | 操作 |
|------|------|
| 新模型上架定价 | 运营设置 -> 模型倍率 -> 添加 `model: ratio`；补全倍率设置输出/缓存倍率 |
| vip 组 8 折 | 分组倍率设 `vip: 0.8` |
| 图像/任务模型按次收费 | 固定价格（`price`），单位美元/次 |
| Claude 缓存计价 | 设置 cache-read 与 cache-write 倍率 |
| 复杂分层计价 | 表达式计费系统（设计文档 `pkg/billingexpr/expr.md`） |

**注意**：倍率是全局 option（整表读写），网页保存是全量覆盖；CLI 是读-合-写。**避免多人同时改价**，改完在价格页 `/pricing` 核对。

## 12. 用户与分组管理

页面：**「用户 / Users」**。

- **搜索/筛选**：按用户名、分组、状态查找。
- **常用操作**：改分组、加/减额度（直接操作余额）、封禁/解封、重置密码、查该用户日志。
- **权限体系**：普通用户 / 管理员 / Root 三级；后台细粒度权限走 Casbin（`authz_roles`）。
- **注册控制**：系统设置中可关闭注册、开启邮箱验证、配置 OAuth 登录。
- **分组规划建议**：`default`（标准价）-> `vip`（折扣 + 更多模型）-> `internal`（内部免费/特殊渠道）。分组同时决定：可用渠道、倍率、限流策略。

## 13. 兑换码运营

页面：**「兑换码 / Redemption Codes」**。

1. 「批量生成」：选择面额（quota）、数量、有效期、适用分组。
2. 导出分发（活动赠送、渠道商代充）。
3. 用户在钱包页兑换后额度即时入账；后台可查每个码的状态与兑换人。
4. 配合签到设置（运营设置）做日常留存。

## 14. 系统设置速查

页面：**「设置 / System Settings」**，分块如下：

| 设置块 | 常用项 |
|--------|--------|
| 通用 | 站点名、服务器地址、页脚、注册开关、**新版首页开关**（本 fork 定制） |
| 运营 | 充值（易支付/Stripe）、兑换码、签到、**失败重试次数**、额度显示模式 |
| 倍率 | 模型/补全/缓存/固定价/分组倍率（见 §11） |
| 模型 | 模型元数据、可见性、上下文窗口来源 |
| 安全 | 密码策略、2FA 强制、Session 限额、IP 限制 |
| 集成 | OAuth 提供商（GitHub/Discord/OIDC/...）、邮件、webhook |
| 请求限制 | 全局/用户级 RPM、TPM 限流 |
| 内容 | 内容安全与审查相关配置 |

**「系统信息 / System Info」**：版本、数据库、Redis、运行时长；**「性能指标 / Performance Metrics」**：实时性能观测。

## 15. 日志与渠道排障

**排障标准流程**（用户反馈"某模型不可用"时）：

1. **日志页**按模型/令牌筛选，看最近错误：上游报错会透传 error message 和 error_code。
2. **渠道页**「测试」该模型的所有渠道：
   - 测试失败 -> 上游 Key 失效/欠费/网络问题，换 Key 或禁用渠道。
   - 测试成功但用户失败 -> 查用户令牌的模型白名单、分组倍率、额度。
3. **"无可用渠道"** -> 模型没有挂到用户所在分组的渠道，或渠道全被自动禁用。
4. **流式卡住/超时** -> 调 `STREAMING_TIMEOUT`；大响应截断 -> 调 `STREAM_SCANNER_MAX_BUFFER_MB`。
5. **计费异常** -> 管理员视角查看该日志 `admin_info`，含 `quota_saturation` 饱和审计标记。

**日志库分离**：高流量站点建议把 `logs` 表移到独立数据库（支持 ClickHouse + TTL 自动清理），配置见环境变量文档。

## 16. CLI 自动化运维

不想点 Web UI 时，用 `deployer/new-api-deployer`（独立 Go CLI，走 REST API）：

```bash
cd deployer && go build -o new-api-deployer .

export NEW_API_SERVER="https://www.aigotoken.com/"
export NEW_API_TOKEN="管理员PAT"        # /profile 页生成
export NEW_API_USER_TOKEN="sk-用户key"  # 用于验证

# 上架一个新渠道并发布模型
./new-api-deployer add-channel --type deepseek --name "deepseek-官方" \
  --key "sk-xxx" --models "deepseek-chat,deepseek-reasoner" --group default

# 测试 + 定价 + 端到端验证
./new-api-deployer test-channel <ID>
./new-api-deployer set-price --model deepseek-chat --ratio 0.14 --completion 4
./new-api-deployer verify-model deepseek-chat
./new-api-deployer list-models && ./new-api-deployer list-prices
```

AI agent 可加载 `deployer/skills/newapi-deploy/` 里的 skill 执行同一标准流程。限制：无渠道列表/删除命令（用 `GET /api/channel/` 等管理 API 补齐）；改价是整表读-合-写，勿并发。

**每日巡检建议**（可 cron）：

1. `list-prices` 抽查定价是否被误改。
2. 渠道页批量测试，异常渠道自动禁用后通知。
3. Dashboard 看成功率/延迟环比。

---

## 附录：常见问题速查表

| 现象 | 先查什么 |
|------|----------|
| 401 无效令牌 | 令牌状态（禁用/过期/耗尽）、Key 是否复制完整 |
| 无可用渠道 | 令牌分组 × 渠道分组 × 模型白名单交集是否为空；渠道是否被自动禁用 |
| 余额充足仍报额度不足 | 令牌自身额度上限已耗尽（与账户余额独立） |
| 流式中断 | `STREAMING_TIMEOUT`、上游限流、网络 |
| 413 请求过大 | `MAX_REQUEST_BODY_MB` |
| 价格和预期不符 | 分组倍率、缓存命中、管理员近期调价 |
| Key 泄露 | 立即禁用该令牌 -> 换新 Key |

*文档版本：2026-08-16 · 页面名称以当前站点实际 UI 为准*
