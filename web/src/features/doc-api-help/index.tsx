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
import { useMemo, useState } from 'react'

import { PublicLayout } from '@/components/layout'

import { ProtocolCard } from './components/protocol-card'
import { ProtocolDeck } from './components/protocol-deck'
import { QuickStartCard } from './components/quick-start-card'
import {
  buildAnthropicSamples,
  buildOpenAiSamples,
  OPENAI_BASE_PATH,
} from './lib/samples'
import { DOC_SECTION_IDS, type ProtocolId } from './lib/sections'
import { useApiBaseUrl } from './lib/use-api-base-url'
import { useApiKeySelection } from './lib/use-api-key-options'
import { useModelSelection } from './lib/use-model-options'
import { useTypewriter } from './lib/use-typewriter'

export function ApiHelpDocuments() {
  const baseUrl = useApiBaseUrl()
  const apiKeySelection = useApiKeySelection()
  const modelSelection = useModelSelection()
  const [activeProtocol, setActiveProtocol] = useState<ProtocolId>(
    DOC_SECTION_IDS.openai
  )

  const apiKey = useTypewriter(apiKeySelection.apiKey)
  const model = useTypewriter(modelSelection.model)

  const credentials = useMemo(() => ({ apiKey, model }), [apiKey, model])

  const openAiSamples = useMemo(
    () => buildOpenAiSamples(baseUrl, credentials),
    [baseUrl, credentials]
  )
  const anthropicSamples = useMemo(
    () => buildAnthropicSamples(baseUrl, credentials),
    [baseUrl, credentials]
  )

  const selectProtocol = (id: ProtocolId) => {
    setActiveProtocol(id)
    document
      .querySelector(`#${DOC_SECTION_IDS.protocols}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-6xl'>
        <header className='max-w-2xl'>
          <h1 className='text-2xl font-semibold tracking-tight'>帮助文档</h1>
        </header>

        <div className='mt-8 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]'>
          <div className='min-w-0 self-start xl:sticky xl:top-20'>
            <QuickStartCard
              activeProtocol={activeProtocol}
              onSelectProtocol={selectProtocol}
              apiKeySelection={apiKeySelection}
              modelSelection={modelSelection}
            />
          </div>

          <div className='min-w-0'>
            <ProtocolDeck
              id={DOC_SECTION_IDS.protocols}
              active={activeProtocol}
              layers={[
                {
                  id: DOC_SECTION_IDS.openai,
                  content: (
                    <ProtocolCard
                      id={DOC_SECTION_IDS.openai}
                      title='OpenAI 兼容接口'
                      baseUrl={`${baseUrl}${OPENAI_BASE_PATH}`}
                      samples={openAiSamples}
                      credentials={credentials}
                    />
                  ),
                },
                {
                  id: DOC_SECTION_IDS.anthropic,
                  content: (
                    <ProtocolCard
                      id={DOC_SECTION_IDS.anthropic}
                      title='Anthropic 兼容接口'
                      baseUrl={baseUrl}
                      samples={anthropicSamples}
                      credentials={credentials}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
