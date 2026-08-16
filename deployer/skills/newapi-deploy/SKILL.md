---
name: newapi-deploy
description: Deploy AI provider channels, models, and pricing to a new-api gateway end-to-end using the new-api-deployer CLI. Use when asked to add/create a channel, publish models, test channel connectivity, set model or group pricing, or verify a model works on a new-api instance.
compatibility: Requires Go 1.22+ to build the CLI, network access to the new-api server, an admin PAT and a user API key.
---

# Deploy channels, models, and pricing via new-api-deployer

`new-api-deployer` is a standalone Go CLI in `deployer/` that automates the
new-api admin + relay REST APIs without the web UI.

## Prerequisites

Build the binary once per session (from repo root):

```bash
cd deployer && go build -o new-api-deployer .
```

Credentials (never guess keys; guide the user through the steps below if
they don't have them yet):

| Credential | Env var | Used by |
|---|---|---|
| Server URL | `NEW_API_SERVER` | all commands |
| Admin PAT | `NEW_API_TOKEN` | add-channel, test-channel, set-price, list-prices |
| User API key (`sk-...`) | `NEW_API_USER_TOKEN` | verify-model, list-models |

### How the user obtains each credential

**Admin PAT** (`NEW_API_TOKEN`) - from the dashboard, not the relay:

1. Log in to the dashboard as an admin/root user.
2. Open the profile page: `<server>/profile`.
3. In the "Security" card, click the "Access Token" button (key icon; NOT
   "Change Password" or "Delete Account", and NOT a Passkey - Passkeys are
   only a login method and cannot be copied into a CLI).
4. The dialog auto-generates a token on first open; copy it. "Regenerate"
   rotates the token and invalidates the old one.

Equivalent API: `GET /api/user/token` with a logged-in session cookie.
The path is `/api/user/token`, not `/api/user/self/token` - the latter
falls through to the relay and returns an OpenAI-style "Invalid URL".
Calling it without a session returns `AUTH_UNAUTHORIZED` ("access token
无效").

**User API key** (`NEW_API_USER_TOKEN`):

1. Log in and open the tokens page: `<server>/token`.
2. Click "Add Token", set name/quota/expiry, create it.
3. Copy the full `sk-...` string immediately.

## Standard deployment workflow

Follow this checklist for every "deploy a new model/channel" request:

- [ ] 0. Credentials – confirm `NEW_API_SERVER` / `NEW_API_TOKEN` /
  `NEW_API_USER_TOKEN` are set. If missing or invalid, actively guide the
  user through "How the user obtains each credential" above instead of
  failing silently. Auth errors usually mean the wrong credential type:
  admin endpoints (`/api/...`) reject `sk-` user keys, and relay endpoints
  (`/v1/...`) reject PATs.
- [ ] 1. `add-channel` — create the channel and publish its models
- [ ] 2. `test-channel` — confirm upstream connectivity and key validity
- [ ] 3. `set-price` — only if the user asked for pricing
- [ ] 4. `verify-model` — end-to-end confirmation through the relay
- [ ] 5. `list-models` — only if the user wants to see what's now visible

Stop and report to the user if any step fails; do not continue deploying on
top of a broken channel.

## Commands

### 1. Create a channel

```bash
./deployer/new-api-deployer add-channel \
  --type openai \
  --name "openai-official" \
  --key "sk-xxxxxxxx" \
  --models "gpt-4o,gpt-4o-mini" \
  --group "default"
```

Common `--type` names: openai, anthropic, gemini, azure, aws, deepseek,
moonshot, openrouter, xai, mistral, cohere, siliconflow, vertexai, volcengine,
newapi. Numeric IDs are also accepted. For an OpenAI-compatible third-party
endpoint, add `--base-url https://...`.

Models become user-accessible immediately (abilities are auto-generated);
no restart is needed.

### 2. Test the channel

```bash
./deployer/new-api-deployer test-channel <id>
```

Success prints `Time:` (seconds). Failure prints the server message and
`error_code` if present. A failed test usually means a bad key, wrong
`--base-url`, or an upstream outage — report the message verbatim.

### 3. Set pricing (only when requested)

Discuss prices with the user in USD per 1M tokens - the same convention as
the web pricing page (`list-prices` also displays this way). The server
stores ratios internally (ratio N = $2N/1M tokens); only `--ratio` is
affected by the conversion, relative multipliers pass through as-is.

```bash
# Per-token: --ratio is the input ratio (0.5 = $1/1M input);
# --completion is output relative to input
./deployer/new-api-deployer set-price --model gpt-4o --ratio 2.5 --completion 4

# Fixed per-call (image/task models) — mutually exclusive with the ratio flags
./deployer/new-api-deployer set-price --model midjourney --price 0.1

# Group multiplier (0.8 = 20% discount)
./deployer/new-api-deployer set-price --group vip --ratio 0.8
```

Inspect current values first with `list-prices` (prints USD per 1M tokens)
if unsure. Updates merge into the existing map; other entries are never
touched.

### 4. Verify a model end-to-end

```bash
./deployer/new-api-deployer verify-model gpt-4o
```

Success prints `OK`, a truncated response, and token usage. This exercises
the exact relay path a real caller uses (auth, routing, billing).

### 5. List visible models

```bash
./deployer/new-api-deployer list-models
```

## Gotchas

- **The server API does not return the new channel's ID.** `add-channel`
  looks it up by exact channel name after creation. Consequence: channel
  names must be unique — if you reuse an existing name, the printed ID may
  belong to the older channel. Verify with the name the user gave.
- **Two different credentials.** Admin operations (channel/pricing) need a
  PAT from an admin/root user; relay operations (verify/list) need a user
  API key. Mixing them up yields auth errors.
- **`--price` and `--ratio`/`--completion`/`--cache`/`--create-cache` are
  mutually exclusive** for a model. A fixed `ModelPrice` silently overrides
  ratio-based billing server-side; never set both.
- **`set-price` is a read-merge-write** of the whole option map. Concurrent
  edits through the web UI while the CLI runs may be lost — avoid running
  both at once.
- **`verify-model --max-tokens` default is 5.** Some reasoning models emit
  only thinking tokens and return empty content; raise `--max-tokens` before
  concluding a model is broken.
- `test-channel` only proves the channel's key/endpoint works. It does not
  prove user-visible routing or billing — that's what `verify-model` does.
  Run both.
- **Two ways to express the same price.** The web pricing page and
  `list-prices` show USD per 1M tokens; the server stores ratios
  (ratio N = $2N/1M). Ratio 0.5 and "$1/1M" are the same price - do not
  "fix" one to match the other. Only `--ratio` needs conversion; relative
  multipliers (`--completion`, `--cache`, `--create-cache`) pass through.
- **Server-side hardcoded completion ratios.** For model families like
  `gpt-*`, `claude-*`, `gemini-*`, `o1`/`o3`, `mistral-*`, `command*`,
  the server ignores the configured completion ratio and uses a hardcoded
  one (see `getHardcodedCompletionModelRatio` in
  `setting/ratio_setting/model_ratio.go`). `list-prices` cannot know these;
  the real output price for such models may differ from the table.
- **PAT is not a Passkey.** Passkeys are a login method only and cannot be
  copied into the CLI. If the user offers a Passkey, redirect them to the
  "Access Token" button on `/profile`.
- **The PAT endpoint is `GET /api/user/token`**, not
  `/api/user/self/token` (that path falls through to the relay and returns
  an OpenAI-style "Invalid URL"). It requires a logged-in session cookie;
  without one it returns `AUTH_UNAUTHORIZED`.
- **Regenerating a PAT invalidates the old one.** The "Access Token" dialog
  and `GET /api/user/token` rotate the token on every call - call once,
  save it, and update `NEW_API_TOKEN` everywhere it is used.

## Reference

Full flag list and a complete automation script: `deployer/README.md`.
