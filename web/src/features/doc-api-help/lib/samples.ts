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
import type { CodeSamples } from '../types'

export const API_KEY_PLACEHOLDER = '<YOUR_API_KEY>'
export const MODEL_PLACEHOLDER = '<YOUR_MODEL>'
export const OPENAI_CHAT_PATH = '/v1/chat/completions'
export const ANTHROPIC_MESSAGES_PATH = '/v1/messages'
export const ANTHROPIC_VERSION = '2023-06-01'
export const MAX_TOKENS = 1024

const PROMPT = '你好，请用一句话介绍你自己。'

const openAiBody = (): string =>
  [
    '{',
    `  "model": "${MODEL_PLACEHOLDER}",`,
    '  "messages": [',
    `    { "role": "user", "content": "${PROMPT}" }`,
    '  ]',
    '}',
  ].join('\n')

const anthropicBody = (): string =>
  [
    '{',
    `  "model": "${MODEL_PLACEHOLDER}",`,
    `  "max_tokens": ${MAX_TOKENS},`,
    '  "messages": [',
    `    { "role": "user", "content": "${PROMPT}" }`,
    '  ]',
    '}',
  ].join('\n')

const curlIndent = '\n      '

function openAiPython(baseUrl: string): string {
  return [
    'from openai import OpenAI',
    '',
    'client = OpenAI(',
    `    base_url="${baseUrl}/v1",`,
    `    api_key="${API_KEY_PLACEHOLDER}",`,
    ')',
    '',
    'completion = client.chat.completions.create(',
    `    model="${MODEL_PLACEHOLDER}",`,
    '    messages=[',
    `        {"role": "user", "content": "${PROMPT}"}`,
    '    ],',
    ')',
    '',
    'print(completion.choices[0].message.content)',
  ].join('\n')
}

function openAiTypescript(baseUrl: string): string {
  return [
    "import OpenAI from 'openai'",
    '',
    'const client = new OpenAI({',
    `  baseURL: '${baseUrl}/v1',`,
    `  apiKey: '${API_KEY_PLACEHOLDER}',`,
    '})',
    '',
    'const completion = await client.chat.completions.create({',
    `  model: '${MODEL_PLACEHOLDER}',`,
    `  messages: [{ role: 'user', content: '${PROMPT}' }],`,
    '})',
    '',
    'console.log(completion.choices[0].message.content)',
  ].join('\n')
}

function openAiCurl(baseUrl: string): string {
  return [
    `curl ${baseUrl}${OPENAI_CHAT_PATH} \\`,
    `  -H "Authorization: Bearer ${API_KEY_PLACEHOLDER}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '${openAiBody().replaceAll('\n', curlIndent)}'`,
  ].join('\n')
}

function anthropicPython(baseUrl: string): string {
  return [
    'import anthropic',
    '',
    'client = anthropic.Anthropic(',
    `    base_url="${baseUrl}",`,
    `    api_key="${API_KEY_PLACEHOLDER}",`,
    ')',
    '',
    'message = client.messages.create(',
    `    model="${MODEL_PLACEHOLDER}",`,
    `    max_tokens=${MAX_TOKENS},`,
    '    messages=[',
    `        {"role": "user", "content": "${PROMPT}"}`,
    '    ],',
    ')',
    '',
    'print(message.content[0].text)',
  ].join('\n')
}

function anthropicTypescript(baseUrl: string): string {
  return [
    "import Anthropic from '@anthropic-ai/sdk'",
    '',
    'const client = new Anthropic({',
    `  baseURL: '${baseUrl}',`,
    `  apiKey: '${API_KEY_PLACEHOLDER}',`,
    '})',
    '',
    'const message = await client.messages.create({',
    `  model: '${MODEL_PLACEHOLDER}',`,
    `  max_tokens: ${MAX_TOKENS},`,
    `  messages: [{ role: 'user', content: '${PROMPT}' }],`,
    '})',
    '',
    'console.log(message.content[0].text)',
  ].join('\n')
}

function anthropicCurl(baseUrl: string): string {
  return [
    `curl ${baseUrl}${ANTHROPIC_MESSAGES_PATH} \\`,
    `  -H "x-api-key: ${API_KEY_PLACEHOLDER}" \\`,
    `  -H "anthropic-version: ${ANTHROPIC_VERSION}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '${anthropicBody().replaceAll('\n', curlIndent)}'`,
  ].join('\n')
}

export function buildOpenAiSamples(baseUrl: string): CodeSamples {
  return {
    python3: openAiPython(baseUrl),
    typescript: openAiTypescript(baseUrl),
    curl: openAiCurl(baseUrl),
  }
}

export function buildAnthropicSamples(baseUrl: string): CodeSamples {
  return {
    python3: anthropicPython(baseUrl),
    typescript: anthropicTypescript(baseUrl),
    curl: anthropicCurl(baseUrl),
  }
}
