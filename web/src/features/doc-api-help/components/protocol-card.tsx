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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { API_KEY_PLACEHOLDER, MODEL_PLACEHOLDER } from '../lib/samples'
import { SCROLL_ANCHOR_CLASS } from '../lib/sections'
import { INLINE_CODE_CLASS } from '../lib/styles'
import type { CodeSamples, SampleCredentials } from '../types'
import { CodeSampleCard } from './code-sample-card'

const AUTH_HEADER_PREFIXES = {
  bearer: 'Authorization: Bearer ',
  apiKey: 'x-api-key: ',
} as const

const CREDENTIAL_NOTES = {
  apiKey: { sample: API_KEY_PLACEHOLDER, label: '你的 API Key' },
  model: { sample: MODEL_PLACEHOLDER, label: '模型名称' },
} as const

type CredentialField = keyof typeof CREDENTIAL_NOTES

function missingCredentialFields(
  credentials: SampleCredentials
): CredentialField[] {
  const fields: CredentialField[] = []
  if (credentials.apiKey === API_KEY_PLACEHOLDER) fields.push('apiKey')
  if (credentials.model === MODEL_PLACEHOLDER) fields.push('model')
  return fields
}

type ProtocolCardProps = {
  id: string
  title: string
  endpoint: string
  auth: keyof typeof AUTH_HEADER_PREFIXES
  samples: CodeSamples
  credentials: SampleCredentials
}

export function ProtocolCard({
  id,
  title,
  endpoint,
  auth,
  samples,
  credentials,
}: ProtocolCardProps) {
  const missing = missingCredentialFields(credentials)

  return (
    <Card id={id} className={SCROLL_ANCHOR_CLASS}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
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
          <code className={INLINE_CODE_CLASS}>
            {AUTH_HEADER_PREFIXES[auth]}
            {credentials.apiKey}
          </code>
        </div>

        <CodeSampleCard samples={samples} />

        {missing.length > 0 && (
          <p className='text-muted-foreground text-xs leading-relaxed'>
            {missing.map((field, index) => (
              <span key={field}>
                {index > 0 && '，'}将{' '}
                <code className={INLINE_CODE_CLASS}>
                  {CREDENTIAL_NOTES[field].sample}
                </code>{' '}
                换成{CREDENTIAL_NOTES[field].label}
              </span>
            ))}
            。
          </p>
        )}
      </CardContent>
    </Card>
  )
}
