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
import { useState } from 'react'

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  DEFAULT_LANG,
  LANG_HIGHLIGHT,
  LANG_LABELS,
  LANGUAGES,
} from '../lib/languages'
import type { CodeSamples, Lang } from '../types'

type CodeSampleCardProps = {
  samples: CodeSamples
}

export function CodeSampleCard({ samples }: CodeSampleCardProps) {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG)

  return (
    <div className='space-y-3'>
      <Tabs value={lang} onValueChange={(value) => setLang(value as Lang)}>
        <TabsList className='bg-muted/40 h-8 p-0.5'>
          {LANGUAGES.map((item) => (
            <TabsTrigger key={item} value={item} className='h-7 px-3 text-xs'>
              {LANG_LABELS[item]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <CodeBlock code={samples[lang]} language={LANG_HIGHLIGHT[lang]}>
        <CodeBlockCopyButton />
      </CodeBlock>
    </div>
  )
}
