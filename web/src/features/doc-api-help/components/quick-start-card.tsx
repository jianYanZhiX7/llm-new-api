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

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import {
  DOC_SECTION_IDS,
  QUICK_START_STEP_IDS,
  SCROLL_ANCHOR_CLASS,
} from '../lib/sections'

type StepProps = {
  id: string
  title: string
  description: string
  actionLabel: string
  actionTo: '/keys' | '/pricing'
}

function Step({ id, title, description, actionLabel, actionTo }: StepProps) {
  return (
    <div id={id} className={`${SCROLL_ANCHOR_CLASS} space-y-2`}>
      <p className='text-sm font-medium'>{title}</p>
      <p className='text-muted-foreground text-xs leading-relaxed'>
        {description}
      </p>
      <Button size='sm' className='w-full' render={<Link to={actionTo} />}>
        {actionLabel}
      </Button>
    </div>
  )
}

export function QuickStartCard() {
  return (
    <Card id={DOC_SECTION_IDS.quickStart} className={SCROLL_ANCHOR_CLASS}>
      <CardHeader>
        <CardTitle>快速开始</CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        <Step
          id={QUICK_START_STEP_IDS.apiKey}
          title='第一步：获取 API Key'
          description='在密钥管理创建令牌，请求时以它作为身份凭证。'
          actionLabel='前往密钥管理'
          actionTo='/keys'
        />
        <Step
          id={QUICK_START_STEP_IDS.model}
          title='第二步：挑选模型'
          description='在模型广场查看可用模型与计费方式。'
          actionLabel='前往模型广场'
          actionTo='/pricing'
        />
      </CardContent>
    </Card>
  )
}
