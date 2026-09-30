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
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { API_KEY_PLACEHOLDER, MODEL_PLACEHOLDER } from '../lib/samples'
import { SCROLL_ANCHOR_CLASS } from '../lib/sections'
import { INLINE_CODE_CLASS } from '../lib/styles'
import type { CodeSamples } from '../types'
import { CodeSampleCard } from './code-sample-card'

type ProtocolCardProps = {
  id: string
  title: string
  description: string
  endpoint: string
  auth: string
  samples: CodeSamples
}

export function ProtocolCard({
  id,
  title,
  description,
  endpoint,
  auth,
  samples,
}: ProtocolCardProps) {
  return (
    <Card id={id} className={SCROLL_ANCHOR_CLASS}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className='space-y-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='secondary' className='font-mono text-[11px]'>
            POST
          </Badge>
          <code className={INLINE_CODE_CLASS}>{endpoint}</code>
        </div>

        <div className='flex flex-wrap items-baseline gap-2'>
          <span className='text-muted-foreground text-sm'>鉴权请求头</span>
          <code className={INLINE_CODE_CLASS}>{auth}</code>
        </div>

        <CodeSampleCard samples={samples} />

        <p className='text-muted-foreground text-xs leading-relaxed'>
          将 <code className={INLINE_CODE_CLASS}>{API_KEY_PLACEHOLDER}</code>{' '}
          换成你的 API Key，将{' '}
          <code className={INLINE_CODE_CLASS}>{MODEL_PLACEHOLDER}</code>{' '}
          换成模型名称。
        </p>
      </CardContent>
    </Card>
  )
}
