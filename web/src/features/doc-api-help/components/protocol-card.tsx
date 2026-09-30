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
import type { CodeSamples } from '../types'
import { CodeSampleCard } from './code-sample-card'

type ProtocolCardProps = {
  title: string
  description: string
  endpoint: string
  auth: string
  samples: CodeSamples
}

const inlineCodeClassName =
  'bg-muted text-foreground rounded px-1 py-0.5 font-mono text-[12px] break-all'

export function ProtocolCard({
  title,
  description,
  endpoint,
  auth,
  samples,
}: ProtocolCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className='space-y-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='secondary' className='font-mono text-[11px]'>
            POST
          </Badge>
          <code className={inlineCodeClassName}>{endpoint}</code>
        </div>

        <div className='flex flex-wrap items-baseline gap-2'>
          <span className='text-muted-foreground text-sm'>鉴权请求头</span>
          <code className={inlineCodeClassName}>{auth}</code>
        </div>

        <CodeSampleCard samples={samples} />

        <p className='text-muted-foreground text-xs leading-relaxed'>
          请将{' '}
          <code className={inlineCodeClassName}>{API_KEY_PLACEHOLDER}</code>{' '}
          替换为你的 API Key，将{' '}
          <code className={inlineCodeClassName}>{MODEL_PLACEHOLDER}</code>{' '}
          替换为你要调用的模型名称。
        </p>
      </CardContent>
    </Card>
  )
}
