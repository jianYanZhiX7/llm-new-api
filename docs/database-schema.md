# 数据库表结构文档

本文档列出 new-api 项目在 PostgreSQL（同时兼容 MySQL/SQLite）中通过 GORM `AutoMigrate` 注册的全部数据表、字段定义及其作用。

> 字段定义来源于 `model/` 目录下各 Go 结构体的 GORM 标签。`gorm:"-:all"` 的字段不会落库，仅用于业务逻辑，表中不再列出；`json:"-"` 的字段表示不返回给前端但会落库。

---

## 1. `users` — 用户表

文件：`model/user.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 ID |
| Username | string | unique;index;max=20 | 用户名 |
| Password | string | not null | 密码哈希 |
| DisplayName | string | index;max=20 | 显示名称 |
| Role | int | type:int;default:1 | 角色：普通/管理员/超级管理员 |
| Status | int | type:int;default:1 | 状态：启用/禁用 |
| Email | string | index;max=50 | 邮箱（小写存储） |
| GitHubId | string | column:github_id;index | GitHub 绑定 ID |
| DiscordId | string | column:discord_id;index | Discord 绑定 ID |
| OidcId | string | column:oidc_id;index | OIDC 绑定 ID |
| WeChatId | string | column:wechat_id;index | WeChat 绑定 ID |
| TelegramId | string | column:telegram_id;index | Telegram 绑定 ID |
| LinuxDOId | string | column:linux_do_id;index | LinuxDO 绑定 ID |
| AccessToken | *string | type:char(32);column:access_token;uniqueIndex | 系统管理令牌（不返回前端） |
| Quota | int | type:int;default:0 | 剩余额度 |
| UsedQuota | int | type:int;default:0;column:used_quota | 已用额度 |
| RequestCount | int | type:int;default:0 | 请求总数 |
| Group | string | type:varchar(64);default:'default' | 用户分组 |
| AffCode | string | type:varchar(32);column:aff_code;uniqueIndex | 邀请码 |
| AffCount | int | type:int;default:0;column:aff_count | 已邀请人数 |
| AffQuota | int | type:int;default:0;column:aff_quota | 邀请剩余额度 |
| AffHistoryQuota | int | type:int;default:0;column:aff_history | 邀请历史额度 |
| InviterId | int | type:int;column:inviter_id;index | 邀请人 ID |
| Setting | string | type:text;column:setting | 用户设置 JSON（边栏等） |
| Remark | string | type:varchar(255);max=255 | 备注 |
| StripeCustomer | string | type:varchar(64);column:stripe_customer;index | Stripe 客户 ID |
| CreatedAt | int64 | autoCreateTime;column:created_at | 创建时间 |
| LastLoginAt | int64 | default:0;column:last_login_at | 最近登录时间 |
| AuthVersion | int64 | type:bigint;not null;default:1;column:auth_version | 认证版本（变更会使所有会话失效） |
| DeletedAt | gorm.DeletedAt | index | 软删除时间 |

作用：保存系统所有用户的账户、认证绑定、额度、分组与邀请关系。

---

## 2. `channels` — 渠道表

文件：`model/channel.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 ID |
| Type | int | default:0 | 渠道类型（OpenAI/Claude/Gemini 等） |
| Key | string | not null | 上游 API Key（可能为多 Key，以换行或 JSON 数组分隔） |
| OpenAIOrganization | *string | - | OpenAI 组织 |
| TestModel | *string | - | 测试用模型名 |
| Status | int | default:1 | 渠道状态 |
| Name | string | index | 渠道名称 |
| Weight | *uint | default:0 | 权重 |
| CreatedTime | int64 | bigint | 创建时间 |
| TestTime | int64 | bigint | 最近测试时间 |
| ResponseTime | int | - | 响应耗时（毫秒） |
| BaseURL | *string | column:base_url;default:'' | 上游 BaseURL |
| Other | string | - | 其他信息 |
| Balance | float64 | - | 余额（美元） |
| BalanceUpdatedTime | int64 | bigint | 余额更新时间 |
| Models | string | - | 支持模型列表（逗号分隔） |
| Group | string | type:varchar(64);default:'default' | 渠道分组 |
| UsedQuota | int64 | bigint;default:0 | 已用额度 |
| ModelMapping | *string | type:text | 模型名映射 JSON |
| StatusCodeMapping | *string | type:varchar(1024);default:'' | 上游状态码映射 |
| Priority | *int64 | bigint;default:0 | 优先级 |
| AutoBan | *int | default:1 | 是否自动禁用 |
| OtherInfo | string | - | 其他信息（JSON 字符串） |
| Tag | *string | index | 标签 |
| Setting | *string | type:text | 渠道额外设置（代理等） |
| ParamOverride | *string | type:text | 参数覆盖 JSON |
| HeaderOverride | *string | type:text | 请求头覆盖 JSON |
| Remark | *string | type:varchar(255);max=255 | 备注 |
| ChannelInfo | ChannelInfo | type:json | 多 Key 模式信息（嵌入式 JSON） |
| OtherSettings | string | column:settings | 其他设置（如 Azure 版本等） |

`ChannelInfo` 内嵌 JSON 结构：`is_multi_key`、`multi_key_size`、`multi_key_status_list`、`multi_key_disabled_reason`、`multi_key_disabled_time`、`multi_key_polling_index`、`multi_key_mode`。

作用：保存每个上游供应商渠道的连接、密钥、模型、分组、多 Key 轮询、状态等配置。

---

## 3. `tokens` — API 令牌表

文件：`model/token.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 ID |
| UserId | int | index | 用户 ID |
| Key | string | type:varchar(128);uniqueIndex | 令牌 Key |
| Status | int | default:1 | 状态 |
| Name | string | index | 名称 |
| CreatedTime | int64 | bigint | 创建时间 |
| AccessedTime | int64 | bigint | 最近访问时间 |
| ExpiredTime | int64 | bigint;default:-1 | 过期时间（-1 永不过期） |
| RemainQuota | int | default:0 | 剩余额度 |
| UnlimitedQuota | bool | - | 是否无限额度 |
| ModelLimitsEnabled | bool | - | 是否启用模型限制 |
| ModelLimits | string | type:text | 允许的模型列表 |
| AllowIps | *string | default:'' | 允许 IP 列表 |
| UsedQuota | int | default:0 | 已用额度 |
| Group | string | default:'' | 令牌分组覆盖 |
| CrossGroupRetry | bool | - | 是否允许跨分组重试 |
| DeletedAt | gorm.DeletedAt | index | 软删除 |

作用：用户对外暴露的访问令牌，控制额度、模型权限、IP 白名单等。

---

## 4. `logs` — 请求日志表

文件：`model/log.go`（可独立存放于 LOG_DB / ClickHouse）

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | 多个复合索引 | 日志 ID |
| UserId | int | index | 用户 ID |
| CreatedAt | int64 | bigint;复合索引 | 创建时间 |
| Type | int | index | 日志类型（充值/消费/管理/系统/错误/退款/登录） |
| Content | string | - | 内容 |
| Username | string | index;default:'' | 用户名 |
| TokenName | string | index;default:'' | 令牌名 |
| ModelName | string | index;default:'' | 模型名 |
| Quota | int | default:0 | 消耗额度 |
| PromptTokens | int | default:0 | 输入 token |
| CompletionTokens | int | default:0 | 输出 token |
| UseTime | int | default:0 | 耗时 |
| IsStream | bool | - | 是否流式 |
| ChannelId | int | index | 渠道 ID |
| ChannelName | string | ->（只读，不入库） | 渠道名（联表填充） |
| TokenId | int | default:0;index | 令牌 ID |
| Group | string | index | 分组 |
| Ip | string | index;default:'' | 请求 IP |
| RequestId | string | type:varchar(64);index;default:'' | 请求 ID |
| UpstreamRequestId | string | type:varchar(128);index;default:'' | 上游请求 ID |
| Other | string | - | 其他信息（JSON 字符串） |

作用：记录所有 API 请求的消费、错误、登录、充值等日志，支持多数据库与 ClickHouse。

---

## 5. `options` — 配置项表

文件：`model/option.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Key | string | primaryKey | 配置键 |
| Value | string | - | 配置值 |

作用：以键值对方式持久化系统配置（系统名、SMTP、登录开关、模型倍率等）。

---

## 6. `abilities` — 模型能力表

文件：`model/ability.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Group | string | type:varchar(64);primaryKey | 分组 |
| Model | string | type:varchar(255);primaryKey | 模型名 |
| ChannelId | int | primaryKey;index | 渠道 ID |
| Enabled | bool | - | 是否启用 |
| Priority | *int64 | bigint;default:0;index | 优先级 |
| Weight | uint | default:0;index | 权重 |
| Tag | *string | index | 标签 |

作用：维护「分组 × 模型 × 渠道」三元组，决定某分组下某模型可由哪些渠道服务，是渠道调度核心索引。

---

## 7. `top_ups` — 充值订单表

文件：`model/topup.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 |
| UserId | int | index | 用户 ID |
| Amount | int64 | - | 充值额度 |
| Money | float64 | - | 支付金额 |
| TradeNo | string | unique;type:varchar(255);index | 订单号 |
| PaymentMethod | string | type:varchar(50) | 支付方式 |
| PaymentProvider | string | type:varchar(50);default:'' | 支付提供方 |
| CreateTime | int64 | - | 创建时间 |
| CompleteTime | int64 | - | 完成时间 |
| Status | string | - | 状态 |

作用：记录用户钱包充值订单及其支付状态。

---

## 8. `subscription_plans` — 订阅套餐表

文件：`model/subscription.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 |
| Title | string | type:varchar(128);not null | 标题 |
| Subtitle | string | type:varchar(255);default:'' | 副标题 |
| PriceAmount | float64 | type:decimal(10,6);not null;default:0 | 价格 |
| Currency | string | type:varchar(8);not null;default:'USD' | 币种 |
| DurationUnit | string | type:varchar(16);not null;default:'month' | 时长单位（year/month/day/hour/custom） |
| DurationValue | int | type:int;not null;default:1 | 时长值 |
| CustomSeconds | int64 | type:bigint;not null;default:0 | 自定义秒数 |
| Enabled | bool | - | 是否启用 |
| SortOrder | int | type:int;default:0 | 排序 |
| AllowBalancePay | *bool | - | 允许余额支付 |
| AllowWalletOverflow | *bool | - | 订阅额度耗尽后允许回退到钱包 |
| StripePriceId | string | type:varchar(128);default:'' | Stripe 价格 ID |
| CreemProductId | string | type:varchar(128);default:'' | Creem 产品 ID |
| WaffoPancakeProductId | string | type:varchar(128);default:'' | Waffo Pancake 产品 ID |
| MaxPurchasePerUser | int | type:int;default:0 | 每用户最大购买数（0 不限） |
| UpgradeGroup | string | type:varchar(64);default:'' | 购买后升级到的分组 |
| DowngradeGroup | string | type:varchar(64);default:'' | 到期后降级到的分组 |
| TotalAmount | int64 | type:bigint;not null;default:0 | 总额度（0 不限） |
| QuotaResetPeriod | string | type:varchar(16);default:'never' | 额度重置周期 |
| QuotaResetCustomSeconds | int64 | type:bigint;default:0 | 自定义重置秒数 |
| CreatedAt | int64 | bigint | 创建时间 |
| UpdatedAt | int64 | bigint | 更新时间 |

作用：定义可购买的订阅套餐，包含价格、时长、额度、分组升降级、支付平台关联等。

---

## 9. `subscription_orders` — 订阅订单表

文件：`model/subscription.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 |
| UserId | int | index | 用户 ID |
| PlanId | int | index | 套餐 ID |
| Money | float64 | - | 支付金额 |
| TradeNo | string | unique;type:varchar(255);index | 订单号 |
| PaymentMethod | string | type:varchar(50) | 支付方式 |
| PaymentProvider | string | type:varchar(50);default:'' | 支付提供方 |
| Status | string | - | 状态 |
| CreateTime | int64 | - | 创建时间 |
| CompleteTime | int64 | - | 完成时间 |
| ProviderPayload | string | type:text | 支付提供方原始载荷 |

作用：记录用户购买订阅的订单，支付成功后由 webhook 生成 `user_subscriptions`。

---

## 10. `user_subscriptions` — 用户订阅实例表

文件：`model/subscription.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 |
| UserId | int | index;复合索引 | 用户 ID |
| PlanId | int | index | 套餐 ID |
| AmountTotal | int64 | type:bigint;not null;default:0 | 总额度 |
| AmountUsed | int64 | type:bigint;not null;default:0 | 已用额度 |
| StartTime | int64 | bigint | 开始时间 |
| EndTime | int64 | bigint;index | 结束时间 |
| Status | string | type:varchar(32);index | 状态：active/expired/cancelled |
| Source | string | type:varchar(32);default:'order' | 来源：order/admin |
| LastResetTime | int64 | type:bigint;default:0 | 上次额度重置时间 |
| NextResetTime | int64 | type:bigint;default:0;index | 下次额度重置时间 |
| UpgradeGroup | string | type:varchar(64);default:'' | 升级到的分组 |
| PrevUserGroup | string | type:varchar(64);default:'' | 购买前用户分组 |
| DowngradeGroup | string | type:varchar(64);default:'' | 到期降级分组 |
| AllowWalletOverflow | bool | - | 是否允许回退钱包 |
| CreatedAt | int64 | bigint | 创建时间 |
| UpdatedAt | int64 | bigint | 更新时间 |

作用：用户购买套餐后的订阅实例，记录额度使用、重置周期、分组升降级快照。

---

## 11. `subscription_pre_consume_records` — 订阅预扣记录表

文件：`model/subscription.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 |
| RequestId | string | type:varchar(64);uniqueIndex | 请求 ID |
| UserId | int | index | 用户 ID |
| UserSubscriptionId | int | index | 订阅实例 ID |
| PreConsumed | int64 | type:bigint;not null;default:0 | 预扣额度 |
| Status | string | type:varchar(32);index | 状态：consumed/refunded |
| CreatedAt | int64 | bigint | 创建时间 |
| UpdatedAt | int64 | bigint;index | 更新时间 |

作用：记录请求开始时从订阅额度中预扣的额度，结算失败/超额时用于退款差额。

---

## 12. `redemptions` — 兑换码表

文件：`model/redemption.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 |
| UserId | int | - | 创建者 ID |
| Key | string | type:char(32);uniqueIndex | 兑换码 |
| Status | int | default:1 | 状态 |
| Name | string | index | 名称 |
| Quota | int | default:100 | 额度 |
| CreatedTime | int64 | bigint | 创建时间 |
| RedeemedTime | int64 | bigint | 兑换时间 |
| UsedUserId | int | - | 兑换者 ID |
| ExpiredTime | int64 | bigint | 过期时间（0 不过期） |
| DeletedAt | gorm.DeletedAt | index | 软删除 |

作用：管理员生成的可兑换额度码。

---

## 13. `midjourneys` — Midjourney 任务表

文件：`model/midjourney.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 |
| Code | int | - | 状态码 |
| UserId | int | index | 用户 ID |
| Action | string | type:varchar(40);index | 动作类型 |
| MjId | string | index | Midjourney 任务 ID |
| Prompt | string | - | 提示词 |
| PromptEn | string | - | 英文提示词 |
| Description | string | - | 描述 |
| State | string | - | 状态字符串 |
| SubmitTime | int64 | index | 提交时间 |
| StartTime | int64 | index | 开始时间 |
| FinishTime | int64 | index | 完成时间 |
| ImageUrl | string | - | 图片 URL |
| VideoUrl | string | - | 视频 URL |
| VideoUrls | string | - | 视频列表 |
| Status | string | type:varchar(20);index | 任务状态 |
| Progress | string | type:varchar(30);index | 进度 |
| FailReason | string | - | 失败原因 |
| ChannelId | int | - | 渠道 ID |
| Quota | int | - | 消耗额度 |
| Buttons | string | - | 按钮 JSON |
| Properties | string | - | 属性 JSON |

作用：保存 Midjourney 异步任务的提交、轮询、产物与计费信息。

---

## 14. `tasks` — 异步任务表

文件：`model/task.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| ID | int64 | primary_key;AUTO_INCREMENT | 主键 |
| CreatedAt | int64 | index | 创建时间 |
| UpdatedAt | int64 | - | 更新时间 |
| TaskID | string | type:varchar(191);index | 第三方任务 ID |
| Platform | constant.TaskPlatform | type:varchar(30);index | 平台 |
| UserId | int | index | 用户 ID |
| Group | string | type:varchar(50) | 分组（计费用） |
| ChannelId | int | index | 渠道 ID |
| Quota | int | - | 预扣额度 |
| Action | string | type:varchar(40);index | 任务类型 |
| Status | TaskStatus | type:varchar(20);index | 任务状态 |
| FailReason | string | - | 失败原因 |
| SubmitTime | int64 | index | 提交时间 |
| StartTime | int64 | index | 开始时间 |
| FinishTime | int64 | index | 完成时间 |
| Progress | string | type:varchar(20);index | 进度 |
| Properties | Properties | type:json | 输入/模型名属性（嵌入式 JSON） |
| PrivateData | TaskPrivateData | column:private_data;type:json | 私有数据（含 key、计费上下文等） |
| Data | json.RawMessage | type:json | 任务结果数据 |

`Properties` 嵌入式 JSON：`input`、`upstream_model_name`、`origin_model_name`。
`TaskPrivateData` 嵌入式 JSON：`key`、`upstream_task_id`、`result_url`、`billing_source`、`subscription_id`、`token_id`、`node_name`、`billing_context`（含 `model_price`、`group_ratio`、`model_ratio`、`other_ratios`、`origin_model_name`、`per_call_billing`）。

作用：统一保存视频/音频等异步任务的提交、轮询、计费上下文与结果。

---

## 15. `prefill_groups` — 预填充组表

文件：`model/prefill_group.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 |
| Name | string | size:64;not null;uniqueIndex(条件) | 组名（唯一） |
| Type | string | size:32;index;not null | 类型：model/tag/endpoint |
| Items | JSONValue | type:json | 字符串集合 JSON 数组 |
| Description | string | type:varchar(255) | 描述 |
| CreatedTime | int64 | bigint | 创建时间 |
| UpdatedTime | int64 | bigint | 更新时间 |
| DeletedAt | gorm.DeletedAt | index | 软删除 |

作用：保存可复用的模型/标签/端点组合，供前端下拉复用。

---

## 16. `two_fas` — 双因素认证表

文件：`model/twofa.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | primaryKey | 主键 |
| UserId | int | unique;not null;index | 用户 ID |
| Secret | string | type:varchar(255);not null | TOTP 密钥（不返回前端） |
| IsEnabled | bool | - | 是否启用 |
| FailedAttempts | int | default:0 | 失败尝试次数 |
| LockedUntil | *time.Time | - | 锁定截止时间 |
| LastUsedAt | *time.Time | - | 最近使用时间 |
| CreatedAt | time.Time | - | 创建时间 |
| UpdatedAt | time.Time | - | 更新时间 |
| DeletedAt | gorm.DeletedAt | index | 软删除 |

作用：用户 TOTP 2FA 设置及锁定状态。

---

## 17. `two_fa_backup_codes` — 2FA 备用码表

文件：`model/twofa.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | primaryKey | 主键 |
| UserId | int | not null;index | 用户 ID |
| CodeHash | string | type:varchar(255);not null | 备用码哈希（不返回前端） |
| IsUsed | bool | - | 是否已使用 |
| UsedAt | *time.Time | - | 使用时间 |
| CreatedAt | time.Time | - | 创建时间 |
| DeletedAt | gorm.DeletedAt | index | 软删除 |

作用：保存 2FA 备用码哈希及使用情况。

---

## 18. `passkey_credentials` — Passkey 凭证表

文件：`model/passkey.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| ID | int | primaryKey | 主键 |
| UserID | int | uniqueIndex;not null | 用户 ID |
| CredentialID | string | type:varchar(512);uniqueIndex;not null | 凭证 ID（base64） |
| PublicKey | string | type:text;not null | 公钥（base64） |
| AttestationType | string | type:varchar(255) | 认证类型 |
| AAGUID | string | type:varchar(512) | 认证器 AAGUID（base64） |
| SignCount | uint32 | default:0 | 签名计数 |
| CloneWarning | bool | - | 克隆告警 |
| UserPresent | bool | - | UP 标志 |
| UserVerified | bool | - | UV 标志 |
| BackupEligible | bool | - | 是否可备份 |
| BackupState | bool | - | 备份状态 |
| Transports | string | type:text | 传输方式 JSON |
| Attachment | string | type:varchar(32) | 附件类型 |
| LastUsedAt | *time.Time | - | 最近使用时间 |
| CreatedAt | time.Time | - | 创建时间 |
| UpdatedAt | time.Time | - | 更新时间 |
| DeletedAt | gorm.DeletedAt | index | 软删除 |

作用：WebAuthn/Passkey 凭证存储，用于无密码登录与提权。

---

## 19. `vendors` — 供应商元数据表

文件：`model/vendor_meta.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 |
| Name | string | size:128;not null;uniqueIndex(带 deleted_at) | 供应商名（唯一） |
| Description | string | type:text | 描述 |
| Icon | string | type:varchar(128) | 图标名 |
| Status | int | default:1 | 状态 |
| CreatedTime | int64 | bigint | 创建时间 |
| UpdatedTime | int64 | bigint | 更新时间 |
| DeletedAt | gorm.DeletedAt | index;复合唯一索引 | 软删除 |

作用：维护上游供应商的元信息，供模型引用。

---

## 20. `system_tasks` — 系统任务表

文件：`model/system_task.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| ID | int64 | primary_key | 主键 |
| TaskID | string | type:varchar(64);uniqueIndex | 任务 ID（systask_xxx） |
| Type | string | type:varchar(64);index | 类型：log_cleanup/channel_test/model_update/midjourney_poll/async_task_poll |
| Status | SystemTaskStatus | type:varchar(32);index | 状态：pending/running/succeeded/failed |
| ActiveKey | *string | type:varchar(64);uniqueIndex | 活跃键 |
| Payload | string | type:text | 输入载荷 JSON |
| State | string | type:text | 中间状态 JSON |
| Result | string | type:text | 结果 JSON |
| Error | string | type:text | 错误信息 |
| LockedBy | string | type:varchar(128);index | 持有锁节点 |
| CreatedAt | int64 | bigint;index | 创建时间 |
| UpdatedAt | int64 | bigint;index | 更新时间 |

作用：跨节点调度的后台任务记录（日志清理、渠道测试、模型更新、轮询等）。

---

## 21. `system_task_locks` — 系统任务锁表

文件：`model/system_task.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Type | string | type:varchar(64);primaryKey | 任务类型 |
| TaskID | string | type:varchar(64);index | 任务 ID |
| LockedBy | string | type:varchar(128);index | 持有锁节点 |
| LockedUntil | int64 | bigint;index | 锁截止时间 |
| UpdatedAt | int64 | bigint;index | 更新时间 |

作用：跨节点分布式锁，确保同一类型任务同一时刻只在一个节点执行。

---

## 22. `system_instances` — 系统实例表

文件：`model/system_instance.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| NodeName | string | type:varchar(128);primaryKey | 节点名 |
| Info | string | type:text | 节点信息 JSON |
| StartedAt | int64 | bigint;index | 启动时间 |
| LastSeenAt | int64 | bigint;index | 最近心跳时间 |
| CreatedAt | int64 | bigint;index | 创建时间 |
| UpdatedAt | int64 | bigint;index | 更新时间 |

作用：注册存活节点，用于多实例任务调度与心跳检测。

---

## 23. `models` — 模型元数据表

文件：`model/model_meta.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 |
| ModelName | string | size:128;not null;uniqueIndex(带 deleted_at) | 模型名（唯一） |
| Description | string | type:text | 描述 |
| Icon | string | type:varchar(128) | 图标 |
| Tags | string | type:varchar(255) | 标签 |
| VendorID | int | index | 供应商 ID |
| Endpoints | string | type:text | 支持端点 |
| Status | int | default:1 | 状态 |
| SyncOfficial | int | default:1 | 是否同步官方 |
| CreatedTime | int64 | bigint | 创建时间 |
| UpdatedTime | int64 | bigint | 更新时间 |
| DeletedAt | gorm.DeletedAt | index;复合唯一索引 | 软删除 |
| NameRule | int | default:0 | 名称匹配规则（精确/前缀/包含/后缀） |

`BoundChannels`、`EnableGroups`、`QuotaTypes`、`MatchedModels`、`MatchedCount` 为 `gorm:"-"`，不入库。

作用：维护系统对外展示的模型清单、绑定渠道与启用分组。

---

## 24. `setups` — 安装标记表

文件：`model/setup.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| ID | uint | primaryKey | 主键 |
| Version | string | type:varchar(50);not null | 版本 |
| InitializedAt | int64 | type:bigint;not null | 初始化时间 |

作用：记录系统是否已初始化及版本信息。

---

## 25. `quota_data` — 用量看板表

文件：`model/usedata.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | - | 主键 |
| UserID | int | index | 用户 ID |
| Username | string | index(复合);size:64;default:'' | 用户名 |
| ModelName | string | index(复合);size:64;default:'' | 模型名 |
| CreatedAt | int64 | bigint;index(复合) | 创建时间（按小时对齐） |
| UseGroup | string | index;size:64;default:'' | 使用分组 |
| TokenID | int | index;default:0 | 令牌 ID |
| ChannelID | int | index;default:0 | 渠道 ID |
| NodeName | string | index;size:64;default:'' | 节点名 |
| TokenUsed | int | default:0 | token 用量 |
| Count | int | default:0 | 请求次数 |
| Quota | int | default:0 | 额度消耗 |

作用：按小时聚合的用量统计，供数据看板柱状图展示。

---

## 26. `casbin_rule` — Casbin 权限规则表

文件：`model/casbin_rule.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | uint | primaryKey;autoIncrement | 主键 |
| Ptype | string | size:100;复合索引 | 策略类型（p/g） |
| V0 | string | size:100;复合索引 | 字段 0 |
| V1 | string | size:100;复合索引 | 字段 1 |
| V2 | string | size:100;复合索引 | 字段 2 |
| V3 | string | size:100;复合索引 | 字段 3 |
| V4 | string | size:100;复合索引 | 字段 4 |
| V5 | string | size:100;复合索引 | 字段 5 |

作用：Casbin RBAC/ABAC 权限策略持久化。

---

## 27. `authz_roles` — 授权角色表

文件：`model/authz_role.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | uint | primaryKey;autoIncrement | 主键 |
| Key | string | size:64;uniqueIndex;not null | 角色键 |
| Name | string | size:100;not null | 角色名 |
| Description | string | type:text | 描述 |
| BuiltIn | bool | - | 是否内置 |
| Enabled | bool | - | 是否启用 |
| Sort | int | - | 排序 |
| CreatedAt | int64 | autoCreateTime | 创建时间 |
| UpdatedAt | int64 | autoUpdateTime | 更新时间 |

作用：自定义授权角色定义。

---

## 28. `user_oauth_bindings` — 用户 OAuth 绑定表

文件：`model/user_oauth_binding.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | primaryKey | 主键 |
| UserId | int | not null;uniqueIndex(ux_user_provider) | 用户 ID |
| ProviderId | int | not null;uniqueIndex(ux_user_provider);uniqueIndex(ux_provider_userid) | 自定义 OAuth 提供方 ID |
| ProviderUserId | string | type:varchar(256);not null;uniqueIndex(ux_provider_userid) | 提供方用户 ID |
| CreatedAt | time.Time | - | 创建时间 |

作用：保存用户与自定义 OAuth 提供方的绑定关系。

---

## 29. `custom_oauth_providers` — 自定义 OAuth 提供方表

文件：`model/custom_oauth_provider.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | primaryKey | 主键 |
| Name | string | type:varchar(64);not null | 显示名 |
| Slug | string | type:varchar(64);uniqueIndex;not null | URL 标识 |
| Icon | string | type:varchar(128);default:'' | 图标名 |
| Enabled | bool | - | 是否启用 |
| ClientId | string | type:varchar(256) | OAuth Client ID |
| ClientSecret | string | type:varchar(512) | OAuth Client Secret（不返回前端） |
| AuthorizationEndpoint | string | type:varchar(512) | 授权 URL |
| TokenEndpoint | string | type:varchar(512) | Token URL |
| UserInfoEndpoint | string | type:varchar(512) | 用户信息 URL |
| Scopes | string | type:varchar(256);default:'openid profile email' | OAuth scopes |
| UserIdField | string | type:varchar(128);default:'sub' | 用户 ID 字段路径 |
| UsernameField | string | type:varchar(128);default:'preferred_username' | 用户名字段路径 |
| DisplayNameField | string | type:varchar(128);default:'name' | 显示名字段路径 |
| EmailField | string | type:varchar(128);default:'email' | 邮箱字段路径 |
| WellKnown | string | type:varchar(512) | OIDC discovery URL |
| AuthStyle | int | default:0 | 认证风格（0 自动/1 参数/2 Header） |
| AccessPolicy | string | type:text | 访问策略 JSON |
| AccessDeniedMessage | string | type:varchar(512) | 拒绝访问提示模板 |
| CreatedAt | time.Time | - | 创建时间 |
| UpdatedAt | time.Time | - | 更新时间 |

作用：自定义 OAuth/OIDC 提供方配置，支持字段映射与访问策略。

---

## 30. `perf_metrics` — 性能指标表

文件：`model/perf_metric.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | primaryKey | 主键 |
| ModelName | string | size:128;uniqueIndex(复合) | 模型名 |
| Group | string | column:group;size:64;uniqueIndex(复合) | 分组 |
| BucketTs | int64 | uniqueIndex(复合);index | 时间桶时间戳 |
| RequestCount | int64 | default:0 | 请求总数 |
| SuccessCount | int64 | default:0 | 成功数 |
| TotalLatencyMs | int64 | default:0 | 总延迟 |
| TtftSumMs | int64 | default:0 | TTFT 之和 |
| TtftCount | int64 | default:0 | TTFT 样本数 |
| OutputTokens | int64 | default:0 | 输出 token 数 |
| GenerationMs | int64 | default:0 | 生成耗时 |

作用：按「模型 × 分组 × 时间桶」聚合 relay 性能数据，供模型广场展示。

---

## 31. `checkins` — 签到表

文件：`model/checkin.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int | primaryKey;autoIncrement | 主键 |
| UserId | int | not null;uniqueIndex(复合) | 用户 ID |
| CheckinDate | string | type:varchar(10);not null;uniqueIndex(复合) | 签到日期（YYYY-MM-DD） |
| QuotaAwarded | int | not null | 奖励额度 |
| CreatedAt | int64 | bigint | 创建时间 |

作用：用户每日签到记录与奖励额度。

---

## 32. `external_identity_claims` — 外部身份声明表

文件：`model/external_identity_claim.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int64 | primaryKey | 主键 |
| Provider | string | type:varchar(32);not null;uniqueIndex(复合) | 提供方（如 telegram） |
| Subject | string | type:varchar(128);not null;uniqueIndex(复合) | 提供方主体 |
| UserId | int | not null;index;uniqueIndex(复合) | 用户 ID |
| CreatedAt | time.Time | - | 创建时间 |

作用：外部身份（如 Telegram）的归属声明，两个唯一索引保证「提供方主体唯一」与「用户每提供方唯一」。

---

## 33. `auth_flows` — 认证流程表

文件：`model/auth_flow.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int64 | primaryKey | 主键 |
| TokenHash | string | type:char(64);not null;uniqueIndex | 令牌 HMAC 哈希（不存原值） |
| Purpose | string | type:varchar(32);not null;复合索引 | 用途：oauth/2fa_login/passkey_*/telegram_* |
| Provider | string | type:varchar(64) | 提供方 |
| Intent | string | type:varchar(16) | 意图：login/bind |
| UserId | int | index | 用户 ID |
| SessionId | string | type:varchar(64);index | 关联会话 ID |
| Payload | string | type:text | 载荷（不返回前端） |
| CreatedAt | time.Time | - | 创建时间 |
| ExpiresAt | time.Time | not null;复合索引 | 过期时间 |
| ConsumedAt | *time.Time | index | 消费时间 |

作用：保存一次性、短生命周期的认证流程状态（OAuth/2FA/Passkey/Telegram 绑定）。

---

## 34. `user_sessions` — 用户会话表

文件：`model/user_session.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| SID | string | type:varchar(64);primaryKey | 会话 ID |
| UserID | int | not null;复合索引 | 用户 ID |
| Version | int64 | type:bigint;not null;default:1 | 会话版本 |
| UserAuthVersion | int64 | type:bigint;not null | 用户认证版本（变更即失效） |
| Status | string | type:varchar(16);not null;复合索引 | 状态：active/revoking/revoked |
| RefreshHash | string | type:char(64);not null | 刷新令牌哈希 |
| PreviousRefreshHash | string | type:varchar(64) | 上一次刷新哈希 |
| PreviousValidUntil | int64 | type:bigint;not null;default:0 | 上一次刷新有效期 |
| LoginMethod | string | type:varchar(32);not null | 登录方式 |
| IP | string | type:varchar(64) | 登录 IP |
| UserAgent | string | type:text | User-Agent |
| CreatedAt | int64 | autoCreateTime;复合索引 | 创建时间 |
| LastActiveAt | int64 | type:bigint;not null | 最近活跃时间 |
| ExpiresAt | int64 | type:bigint;not null;复合索引 | 过期时间 |
| RevokedAt | int64 | type:bigint;not null;default:0;复合索引 | 撤销时间 |
| RevokedReason | string | type:varchar(64) | 撤销原因 |

作用：服务端会话控制面，管理短期 access JWT 的刷新、撤销与多设备登录。

---

## 35. `payment_audit_logs` - 支付审计追溯表

文件：`model/payment_audit_log.go`

| 字段 | 类型 | 约束 / GORM 标签 | 说明 |
| --- | --- | --- | --- |
| Id | int64 | primaryKey;autoIncrement | 主键 |
| TradeNo | string | type:varchar(255);index | 订单号 |
| EventType | string | type:varchar(64);index | 事件类型：create/notify/query/recharge |
| Provider | string | type:varchar(50);default:'' | 支付提供方（如 alipay_direct） |
| Status | string | type:varchar(32) | 状态：success/failed/info |
| RawPayload | string | type:text（`json:"-"`） | 原始报文（不返回前端，仅管理员可查） |
| Detail | string | type:text | 人类可读详情或错误信息 |
| ClientIP | string | type:varchar(64);default:'' | 客户端 IP |
| CreatedAt | int64 | bigint;index | 创建时间 |

作用：记录支付全链路关键事件（订单创建、webhook 通知、主动查询、加款结果），用于争议解决与安全审计。`RawPayload` 字段存储原始 webhook 报文和查询响应，不返回前端。

---

## 表与功能模块对应关系

| 模块 | 相关表 |
| --- | --- |
| 用户与认证 | `users`、`user_sessions`、`auth_flows`、`two_fas`、`two_fa_backup_codes`、`passkey_credentials`、`external_identity_claims`、`user_oauth_bindings`、`custom_oauth_providers` |
| 渠道与调度 | `channels`、`abilities`、`vendors`、`models`、`prefill_groups` |
| 令牌与计费 | `tokens`、`logs`、`quota_data`、`top_ups`、`redemptions`、`checkins`、`payment_audit_logs` |
| 订阅 | `subscription_plans`、`subscription_orders`、`user_subscriptions`、`subscription_pre_consume_records` |
| 异步任务 | `midjourneys`、`tasks` |
| 系统运维 | `options`、`setups`、`system_tasks`、`system_task_locks`、`system_instances`、`perf_metrics` |
| 权限 | `casbin_rule`、`authz_roles` |

---

## 备注

- 所有表通过 `model/main.go` 的 `AutoMigrate` 注册，可在 SQLite/MySQL/PostgreSQL 上自动建表与加列。
- `logs` 表可独立存放于 LOG_DB，并支持 ClickHouse（使用原生 `CREATE TABLE` 带 TTL）。
- 软删除字段 `DeletedAt`（`gorm.DeletedAt`）会被 GORM 自动加上 `deleted_at IS NULL` 过滤。
- 含 `gorm:"-"` 的字段（如 `User.OriginalPassword`、`Channel.Keys` 等）不入库，仅用于业务逻辑。
- JSON 列（如 `ChannelInfo`、`Properties`、`TaskPrivateData`、`Items`）在三种数据库中统一以 `TEXT`/`JSON` 文本存储。
