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
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { API_KEY_PLACEHOLDER, MODEL_PLACEHOLDER } from '../lib/samples'
import { SCROLL_ANCHOR_CLASS } from '../lib/sections'
import type { CodeSamples, SampleCredentials } from '../types'
import { BaseUrlRow } from './base-url-row'
import { CodeSampleCard } from './code-sample-card'

type ProtocolCardProps = {
  id: string
  title: string
  baseUrl: string
  samples: CodeSamples
  credentials: SampleCredentials
}

export function ProtocolCard({
  id,
  title,
  baseUrl,
  samples,
  credentials,
}: ProtocolCardProps) {
  const highlightTerms = [credentials.apiKey, credentials.model].filter(
    (value) => value !== API_KEY_PLACEHOLDER && value !== MODEL_PLACEHOLDER
  )

  return (
    <Card id={id} className={SCROLL_ANCHOR_CLASS}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction className='self-center'>
          <BaseUrlRow label='Base URL' value={baseUrl} />
        </CardAction>
      </CardHeader>

      <CardContent>
        <CodeSampleCard samples={samples} highlightTerms={highlightTerms} />
      </CardContent>
    </Card>
  )
}
