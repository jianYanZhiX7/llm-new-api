# new-api-deployer

A standalone CLI tool that automates channel and model management on a new-api gateway instance through its REST API, without touching the web UI.

## Install

```bash
cd deployer
go build -o new-api-deployer .
```

## Authentication

The tool uses two kinds of credentials:

| Credential | Used by | How to set |
|---|---|---|
| Root PAT | `set-price`, `list-prices` | `--token` or `NEW_API_TOKEN` |
| Admin PAT | `add-channel`, `test-channel` | `--token` or `NEW_API_TOKEN` |
| User API key (`sk-...`) | `verify-model`, `list-models` | `--user-token` or `NEW_API_USER_TOKEN` |
| Server URL | all commands | `--server` or `NEW_API_SERVER` |

Generate a PAT in the new-api dashboard: log in as admin and open the profile page (`/profile`), then click the "Access Token" button in the Security card. Or call `GET /api/user/token` with a logged-in session cookie. Each call/regeneration rotates the token and invalidates the old one.

Generate a user API key on the tokens page (`/token`): "Add Token", then copy the `sk-...` value.

## Configured Instance

The live gateway this repository deploys to is `https://www.aigotoken.com/`.
Its credentials are exported in `~/.bashrc` on the deployment host:

```bash
export NEW_API_SERVER="https://www.aigotoken.com/"
export NEW_API_TOKEN="<root PAT>"          # value in ~/.bashrc
export NEW_API_USER_TOKEN="sk-<user key>"  # value in ~/.bashrc
```

Run `source ~/.bashrc` (or re-open the shell) before invoking any
`new-api-deployer` command, so the three variables are present.

The real values are deliberately not recorded here. `NEW_API_TOKEN` is a root
PAT and `NEW_API_USER_TOKEN` is a user API key, and this file is tracked by
git, so writing them down would publish live credentials. Read them from
`~/.bashrc` when needed. `NEW_API_TOKEN` also rotates on every call to
`GET /api/user/token`, so re-read it from `~/.bashrc` after a rotation.

## Quick Start

```bash
export NEW_API_SERVER="https://your-new-api-host"
export NEW_API_TOKEN="your-admin-pat"
export NEW_API_USER_TOKEN="sk-your-user-api-key"
```

### 1. Create a channel + publish models

```bash
./new-api-deployer add-channel \
  --type openai \
  --name "openai-official" \
  --key "sk-xxxxxxxx" \
  --base-url "https://api.openai.com" \
  --models "gpt-4o,gpt-4o-mini" \
  --group "default"
```

Models are immediately accessible to the `default` group. The server API does not return the new channel ID, so the tool looks it up by channel name right after creation and prints it.

### 2. Test channel connectivity

```bash
./new-api-deployer test-channel 123
```

### 3. Verify a model responds

```bash
./new-api-deployer verify-model gpt-4o
```

Sends a minimal chat completion through the relay API. A successful response confirms end-to-end routing, billing, and upstream connectivity.

### 4. List available models

```bash
./new-api-deployer list-models
```

### 5. Set model pricing

Prices are stored server-side as ratios; ratio N = $2N per 1M tokens
(= $0.002N/1K). `list-prices` and the web pricing page both display
USD per 1M tokens.

```bash
# Input token ratio (--ratio 0.5 = $1/1M input)
./new-api-deployer set-price --model gpt-4o --ratio 2.5

# Input + output ratios together (output = 4x input)
./new-api-deployer set-price --model gpt-4o --ratio 2.5 --completion 4

# Fixed per-call price (for image/task models)
./new-api-deployer set-price --model midjourney --price 0.1

# Cache ratios (Claude-style)
./new-api-deployer set-price --model claude-3-5-sonnet --cache 0.1 --create-cache 1.25

# Group multiplier (0.8 = 20% discount for vip group)
./new-api-deployer set-price --group vip --ratio 0.8
```

### 6. View current pricing

```bash
./new-api-deployer list-prices
```

### 7. Verify the whole model list on both relay endpoints

```bash
./new-api-deployer verify-endpoints
```

Fetches the models visible to the user token, then probes each one on both
`/v1/chat/completions` (OpenAI format) and `/v1/messages` (Anthropic format).
A model passes only when both endpoints return a valid payload. Exits
non-zero when any check fails, so it can gate a deployment.

```
MODEL                 openai                    anthropic
------------------------------------------------------------------------
Kimi-K2.6             ok 1.098s                 ok 826ms
GLM-5.2               ok 950ms                  FAIL HTTP 503

Failures (1)
  GLM-5.2 @ anthropic: HTTP 503: model_not_found: No available channel for model GLM-5.2
```

Flags: `--prompt` (default `ping`), `--max-tokens` (default `5`),
`--concurrency` (default `4`).

## Commands

### `add-channel`

```
Flags:
      --type string        channel type: name or numeric ID (required)
      --name string        channel name (required)
      --key string         upstream API key (required)
      --models string      comma-separated model names (required)
      --base-url string    upstream base URL
      --group string       user groups (default "default")
      --priority int       routing priority (default 0)
      --weight int         load-balancing weight (default 1)
      --auto-ban           auto-disable on errors (default true)
      --tag string         channel tag
      --status int         1=enabled, 2=disabled (default 1)
      --model-mapping str  JSON object: {"client":"upstream"}
      --remark string      admin note
```

Supported `--type` names: `openai`, `anthropic`, `gemini`, `azure`, `aws`, `deepseek`, `ollama`, `moonshot`, `openrouter`, `xai`, `mistral`, `cohere`, `minimax`, `siliconflow`, `vertexai`, `volcengine`, `coze`, `kling`, `replicate`, `codex`, `newapi`, and more. Numeric IDs also accepted (see `constant/channel.go`).

### `test-channel <id>`

Tests connectivity to the upstream provider for the given channel. On success prints the latency (`Time`); on failure prints the server error message and `error_code` if present.

### `verify-model <model-name>`

```
Flags:
      --max-tokens int   max tokens for test response (default 5)
      --prompt string    test prompt (default "ping")
```

### `list-models`

Lists all model IDs visible to the user token via `/v1/models`.

### `verify-endpoints`

```
Flags:
      --prompt string        test prompt message (default "ping")
      --max-tokens int       max tokens for the test response (default 5)
      --concurrency int      endpoints probed in parallel (default 4)
```

Reads the model list from `/v1/models` and sends one minimal request per model
to each endpoint in `relayEndpoints` (OpenAI `/v1/chat/completions` with
`Authorization: Bearer`, Anthropic `/v1/messages` with `x-api-key` and
`anthropic-version`). Each response is checked for transport success (HTTP 2xx)
and payload validity (`choices` for OpenAI, a `message` with content blocks for
Anthropic); an `error` object in the body fails the check even on HTTP 200.
Checks are ordered model-major, endpoint-minor. Results are printed as a table
plus a failure detail list, and the command returns a non-zero exit code when
any check fails. Requires a user API key, not a PAT.

### `set-price`

```
Flags:
      --model string         model name to price
      --group string         user group name to price
      --ratio float          model ratio (ratio N = $2N/1M tokens) or group ratio
      --completion float     output token ratio relative to input
      --price float          fixed per-call price (mutually exclusive with
                             --ratio, --completion, --cache, --create-cache)
      --cache float          cache-read ratio
      --create-cache float   cache-write ratio
```

Uses `PUT /api/option/` to update pricing maps. Existing entries are merged; only the specified model/group entry is changed. The tool aborts before writing anything if the current option value cannot be parsed, so existing entries are never wiped by a malformed value. Updates are a read-merge-write of the whole option map: concurrent edits to the same option on the server may be lost. Requires a Root-level PAT.

### `list-prices`

Displays current pricing in USD per 1M tokens (input/output/cache-read/cache-write per model), plus fixed per-call prices and group multipliers - the same convention as the web pricing page. The server stores these as ratios internally; see `set-price` for the conversion.

## Full Automation Example

```bash
#!/bin/bash
set -e

SERVER="https://your-host"
PAT="admin-pat"
SK="sk-user-key"

CHANNEL_ID=$(./new-api-deployer add-channel \
  -s "$SERVER" -t "$PAT" \
  --type openai \
  --name "auto-$(date +%s)" \
  --key "sk-xxx" \
  --models "gpt-4o,gpt-4o-mini" \
  --group default \
  2>&1 | grep "ID:" | awk '{print $2}')

./new-api-deployer test-channel -s "$SERVER" -t "$PAT" "$CHANNEL_ID"
./new-api-deployer set-price -s "$SERVER" -t "$PAT" --model gpt-4o --ratio 2.5 --completion 4
./new-api-deployer verify-model -s "$SERVER" --user-token "$SK" gpt-4o
./new-api-deployer list-models -s "$SERVER" --user-token "$SK"
./new-api-deployer list-prices -s "$SERVER" -t "$PAT"
```

## Help

```bash
./new-api-deployer --help
./new-api-deployer add-channel --help
```

## Architecture

This is a **standalone Go module** (`github.com/aigotoken/deployer`) with no dependency on the main new-api codebase. It only calls the public REST API.

```
deployer/
├── go.mod              independent module (only depends on cobra)
├── main.go             entry point
├── root.go             root command, global flags, channel type map
├── client.go           HTTP client wrapping admin + relay API
├── relay_endpoint.go   relay endpoint definitions and response validators
├── pricing.go          option map fetch/update helpers
├── add_channel.go      add-channel command
├── test_channel.go     test-channel command
├── verify_model.go     verify-model command
├── verify_endpoints.go verify-endpoints command
├── list_models.go      list-models command
├── set_price.go        set-price command
├── list_prices.go      list-prices command
└── README.md
```
