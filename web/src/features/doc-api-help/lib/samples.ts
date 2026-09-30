/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import type { CodeSamples, SampleCredentials } from '../types'

export const API_KEY_PLACEHOLDER = '<YOUR_API_KEY>'
export const MODEL_PLACEHOLDER = '<YOUR_MODEL>'
export const OPENAI_BASE_PATH = '/v1'
export const OPENAI_CHAT_PATH = `${OPENAI_BASE_PATH}/chat/completions`
export const ANTHROPIC_MESSAGES_PATH = '/v1/messages'
export const ANTHROPIC_VERSION = '2023-06-01'
export const MAX_TOKENS = 1024

export const DEFAULT_CREDENTIALS: SampleCredentials = {
  apiKey: API_KEY_PLACEHOLDER,
  model: MODEL_PLACEHOLDER,
}

const PROMPT = '你好，请用一句话介绍你自己。'

const curlIndent = '\n      '

const openAiBody = (model: string): string =>
  [
    '{',
    `  "model": "${model}",`,
    '  "messages": [',
    `    { "role": "user", "content": "${PROMPT}" }`,
    '  ]',
    '}',
  ].join('\n')

const anthropicBody = (model: string): string =>
  [
    '{',
    `  "model": "${model}",`,
    `  "max_tokens": ${MAX_TOKENS},`,
    '  "messages": [',
    `    { "role": "user", "content": "${PROMPT}" }`,
    '  ]',
    '}',
  ].join('\n')

function openAiPython(
  baseUrl: string,
  { apiKey, model }: SampleCredentials
): string {
  return [
    'from openai import OpenAI',
    '',
    'client = OpenAI(',
    `    base_url="${baseUrl}${OPENAI_BASE_PATH}",`,
    `    api_key="${apiKey}",`,
    ')',
    '',
    'completion = client.chat.completions.create(',
    `    model="${model}",`,
    '    messages=[',
    `        {"role": "user", "content": "${PROMPT}"}`,
    '    ],',
    ')',
    '',
    'print(completion.choices[0].message.content)',
  ].join('\n')
}

function openAiTypescript(
  baseUrl: string,
  { apiKey, model }: SampleCredentials
): string {
  return [
    "import OpenAI from 'openai'",
    '',
    'const client = new OpenAI({',
    `  baseURL: '${baseUrl}${OPENAI_BASE_PATH}',`,
    `  apiKey: '${apiKey}',`,
    '})',
    '',
    'const completion = await client.chat.completions.create({',
    `  model: '${model}',`,
    `  messages: [{ role: 'user', content: '${PROMPT}' }],`,
    '})',
    '',
    'console.log(completion.choices[0].message.content)',
  ].join('\n')
}

function openAiCurl(baseUrl: string, { apiKey, model }: SampleCredentials) {
  return [
    `curl ${baseUrl}${OPENAI_CHAT_PATH} \\`,
    `  -H "Authorization: Bearer ${apiKey}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '${openAiBody(model).replaceAll('\n', curlIndent)}'`,
  ].join('\n')
}

function anthropicPython(
  baseUrl: string,
  { apiKey, model }: SampleCredentials
): string {
  return [
    'import anthropic',
    '',
    'client = anthropic.Anthropic(',
    `    base_url="${baseUrl}",`,
    `    api_key="${apiKey}",`,
    ')',
    '',
    'message = client.messages.create(',
    `    model="${model}",`,
    `    max_tokens=${MAX_TOKENS},`,
    '    messages=[',
    `        {"role": "user", "content": "${PROMPT}"}`,
    '    ],',
    ')',
    '',
    'reply = next(block for block in message.content if block.type == "text")',
    'print(reply.text)',
  ].join('\n')
}

function anthropicTypescript(
  baseUrl: string,
  { apiKey, model }: SampleCredentials
): string {
  return [
    "import Anthropic from '@anthropic-ai/sdk'",
    '',
    'const client = new Anthropic({',
    `  baseURL: '${baseUrl}',`,
    `  apiKey: '${apiKey}',`,
    '})',
    '',
    'const message = await client.messages.create({',
    `  model: '${model}',`,
    `  max_tokens: ${MAX_TOKENS},`,
    `  messages: [{ role: 'user', content: '${PROMPT}' }],`,
    '})',
    '',
    "const reply = message.content.find((block) => block.type === 'text')",
    'console.log(reply?.text)',
  ].join('\n')
}

function anthropicCurl(baseUrl: string, { apiKey, model }: SampleCredentials) {
  return [
    `curl ${baseUrl}${ANTHROPIC_MESSAGES_PATH} \\`,
    `  -H "x-api-key: ${apiKey}" \\`,
    `  -H "anthropic-version: ${ANTHROPIC_VERSION}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '${anthropicBody(model).replaceAll('\n', curlIndent)}'`,
  ].join('\n')
}

export function buildOpenAiSamples(
  baseUrl: string,
  credentials: SampleCredentials = DEFAULT_CREDENTIALS
): CodeSamples {
  return {
    python3: openAiPython(baseUrl, credentials),
    typescript: openAiTypescript(baseUrl, credentials),
    curl: openAiCurl(baseUrl, credentials),
  }
}

export function buildAnthropicSamples(
  baseUrl: string,
  credentials: SampleCredentials = DEFAULT_CREDENTIALS
): CodeSamples {
  return {
    python3: anthropicPython(baseUrl, credentials),
    typescript: anthropicTypescript(baseUrl, credentials),
    curl: anthropicCurl(baseUrl, credentials),
  }
}
