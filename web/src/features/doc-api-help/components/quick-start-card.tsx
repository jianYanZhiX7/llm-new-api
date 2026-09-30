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
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { CopyButton } from '@/components/copy-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'

import { OPENAI_BASE_PATH } from '../lib/samples'
import {
  DOC_SECTION_IDS,
  QUICK_START_STEP_IDS,
  SCROLL_ANCHOR_CLASS,
} from '../lib/sections'
import type {
  ApiKeySelection,
  ModelSelection,
  Selection,
  SelectionStatus,
} from '../types'

const SELECTION_PLACEHOLDERS: Record<SelectionStatus, string> = {
  anonymous: '登录后可选',
  loading: '加载中…',
  ready: '搜索或选择',
  empty: '暂无可选',
  error: '加载失败',
}

type StepProps = {
  id: string
  title: string
  description: string
  children?: ReactNode
}

function Step({ id, title, description, children }: StepProps) {
  return (
    <div id={id} className={`${SCROLL_ANCHOR_CLASS} space-y-2`}>
      <p className='text-sm font-medium'>{title}</p>
      <p className='text-muted-foreground text-xs leading-relaxed'>
        {description}
      </p>
      {children}
    </div>
  )
}

function BaseUrlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-1'>
      <p className='text-muted-foreground text-[11px]'>{label}</p>
      <div className='bg-muted/40 flex items-center gap-1 rounded-md border py-0.5 pr-0.5 pl-2'>
        <code
          title={value}
          className='min-w-0 flex-1 truncate font-mono text-[11px]'
        >
          {value}
        </code>
        <CopyButton value={value} className='size-7' iconClassName='size-3.5' />
      </div>
    </div>
  )
}

type SelectionFieldProps = {
  ariaLabel: string
  selection: Selection
  fallback: { label: string; to: '/keys' | '/pricing' }
  pendingHint?: string
}

function SelectionField({
  ariaLabel,
  selection,
  fallback,
  pendingHint,
}: SelectionFieldProps) {
  const unavailable = selection.status !== 'ready'

  return (
    <div className='space-y-2'>
      <Combobox
        options={selection.options}
        value={selection.value}
        onValueChange={(next) => {
          if (next !== null) selection.select(next)
        }}
        placeholder={SELECTION_PLACEHOLDERS[selection.status]}
        emptyText='无匹配项'
        disabled={unavailable}
        aria-label={ariaLabel}
      />
      {selection.pending && pendingHint && (
        <p className='text-muted-foreground text-[11px]'>{pendingHint}</p>
      )}
      {unavailable && selection.status !== 'loading' && (
        <Link
          to={fallback.to}
          className='text-primary inline-block text-xs hover:underline'
        >
          {fallback.label}
        </Link>
      )}
    </div>
  )
}

type QuickStartCardProps = {
  baseUrl: string
  apiKeySelection: ApiKeySelection
  modelSelection: ModelSelection
}

export function QuickStartCard({
  baseUrl,
  apiKeySelection,
  modelSelection,
}: QuickStartCardProps) {
  return (
    <Card id={DOC_SECTION_IDS.quickStart} className={SCROLL_ANCHOR_CLASS}>
      <CardHeader>
        <CardTitle>快速开始</CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        <Step
          id={QUICK_START_STEP_IDS.baseUrl}
          title='第一步：填写 Base URL'
          description='按所用协议选择对应地址，填入 SDK 的 base_url。'
        >
          <div className='space-y-2'>
            <BaseUrlRow
              label='OpenAI 兼容'
              value={`${baseUrl}${OPENAI_BASE_PATH}`}
            />
            <BaseUrlRow label='Anthropic 兼容' value={baseUrl} />
          </div>
        </Step>

        <Step
          id={QUICK_START_STEP_IDS.apiKey}
          title='第二步：选择 API Key'
          description='选中后示例中的 api_key 会直接填入该密钥明文。'
        >
          <SelectionField
            ariaLabel='API Key'
            selection={apiKeySelection}
            fallback={{ label: '还没有密钥？前往密钥管理', to: '/keys' }}
            pendingHint='正在读取密钥…'
          />
        </Step>

        <Step
          id={QUICK_START_STEP_IDS.model}
          title='第三步：选择模型'
          description='选中后示例中的 model 会直接填入该模型名称。'
        >
          <SelectionField
            ariaLabel='模型'
            selection={modelSelection}
            fallback={{ label: '查看更多模型？前往模型广场', to: '/pricing' }}
          />
        </Step>
      </CardContent>
    </Card>
  )
}
