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
import { QuickStartCard } from './components/quick-start-card'
import {
  ANTHROPIC_MESSAGES_PATH,
  buildAnthropicSamples,
  buildOpenAiSamples,
  OPENAI_CHAT_PATH,
} from './lib/samples'
import { DOC_SECTION_IDS } from './lib/sections'
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
      <div className='mx-auto max-w-6xl'>
        <header className='max-w-2xl space-y-3'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            API 帮助文档
          </h1>
          <div className='flex flex-wrap items-baseline gap-2'>
            <span className='text-muted-foreground text-sm'>服务地址</span>
            <code className={INLINE_CODE_CLASS}>{baseUrl}</code>
          </div>
        </header>

        <div className='mt-8 grid gap-8 xl:grid-cols-[160px_minmax(0,1fr)_260px]'>
          <div className='order-2 hidden self-start xl:sticky xl:top-20 xl:order-1 xl:block'>
            <DocToc />
          </div>

          <div className='order-3 min-w-0 space-y-8 xl:order-2'>
            <ProtocolCard
              id={DOC_SECTION_IDS.openai}
              title='OpenAI 兼容接口'
              endpoint={`${baseUrl}${OPENAI_CHAT_PATH}`}
              auth={OPENAI_AUTH_HEADER}
              samples={openAiSamples}
            />

            <ProtocolCard
              id={DOC_SECTION_IDS.anthropic}
              title='Anthropic 兼容接口'
              endpoint={`${baseUrl}${ANTHROPIC_MESSAGES_PATH}`}
              auth={ANTHROPIC_AUTH_HEADER}
              samples={anthropicSamples}
            />
          </div>

          <div className='order-1 self-start xl:sticky xl:top-20 xl:order-3'>
            <QuickStartCard baseUrl={baseUrl} />
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
