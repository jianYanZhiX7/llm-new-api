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
import { useMemo } from 'react'

import { PublicLayout } from '@/components/layout'

import { DocToc } from './components/doc-toc'
import { ProtocolCard } from './components/protocol-card'
import { QuickStartSteps } from './components/quick-start-steps'
import {
  ANTHROPIC_MESSAGES_PATH,
  buildAnthropicSamples,
  buildOpenAiSamples,
  OPENAI_CHAT_PATH,
} from './lib/samples'
import { DOC_SECTION_IDS, SCROLL_ANCHOR_CLASS } from './lib/sections'
import { INLINE_CODE_CLASS } from './lib/styles'
import { useApiBaseUrl } from './lib/use-api-base-url'

const OPENAI_AUTH_HEADER = 'Authorization: Bearer <YOUR_API_KEY>'
const ANTHROPIC_AUTH_HEADER = 'x-api-key: <YOUR_API_KEY>'

export function ApiHelpDocuments() {
  const baseUrl = useApiBaseUrl()

  const openAiSamples = useMemo(() => buildOpenAiSamples(baseUrl), [baseUrl])
  const anthropicSamples = useMemo(
    () => buildAnthropicSamples(baseUrl),
    [baseUrl]
  )

  return (
    <PublicLayout>
      <div className='mx-auto grid max-w-5xl gap-8 xl:grid-cols-[176px_minmax(0,1fr)]'>
        <div className='sticky top-20 hidden self-start xl:block'>
          <DocToc />
        </div>

        <div className='min-w-0 space-y-10'>
          <header className='space-y-3'>
            <h1 className='text-2xl font-semibold tracking-tight'>
              API 帮助文档
            </h1>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              本站同时兼容 OpenAI 与 Anthropic 两套接口协议，替换官方 SDK 的
              base_url 与 api_key 即可接入。
            </p>
            <div className='flex flex-wrap items-baseline gap-2'>
              <span className='text-muted-foreground text-sm'>服务地址</span>
              <code className={INLINE_CODE_CLASS}>{baseUrl}</code>
            </div>
          </header>

          <section
            id={DOC_SECTION_IDS.quickStart}
            className={SCROLL_ANCHOR_CLASS}
          >
            <h2 className='mb-4 text-lg font-medium'>快速开始</h2>
            <QuickStartSteps />
          </section>

          <ProtocolCard
            id={DOC_SECTION_IDS.openai}
            title='OpenAI 兼容接口'
            description='与 Chat Completions 接口兼容，示例均为非流式调用。'
            endpoint={`${baseUrl}${OPENAI_CHAT_PATH}`}
            auth={OPENAI_AUTH_HEADER}
            samples={openAiSamples}
          />

          <ProtocolCard
            id={DOC_SECTION_IDS.anthropic}
            title='Anthropic 兼容接口'
            description='与 Messages 接口兼容，示例均为非流式调用。'
            endpoint={`${baseUrl}${ANTHROPIC_MESSAGES_PATH}`}
            auth={ANTHROPIC_AUTH_HEADER}
            samples={anthropicSamples}
          />
        </div>
      </div>
    </PublicLayout>
  )
}
