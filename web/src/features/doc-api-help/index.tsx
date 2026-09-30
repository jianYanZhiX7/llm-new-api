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
import { useMemo } from 'react'

import { PublicLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { ProtocolCard } from './components/protocol-card'
import {
  ANTHROPIC_MESSAGES_PATH,
  buildAnthropicSamples,
  buildOpenAiSamples,
  OPENAI_CHAT_PATH,
} from './lib/samples'
import { useApiBaseUrl } from './lib/use-api-base-url'

const OPENAI_AUTH_HEADER = 'Authorization: Bearer <YOUR_API_KEY>'
const ANTHROPIC_AUTH_HEADER = 'x-api-key: <YOUR_API_KEY>'

const inlineCodeClassName =
  'bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[12px] break-all'

export function ApiHelpDocuments() {
  const baseUrl = useApiBaseUrl()

  const openAiSamples = useMemo(() => buildOpenAiSamples(baseUrl), [baseUrl])
  const anthropicSamples = useMemo(
    () => buildAnthropicSamples(baseUrl),
    [baseUrl]
  )

  return (
    <PublicLayout>
      <div className='mx-auto max-w-4xl space-y-8'>
        <header className='space-y-3'>
          <h1 className='text-3xl font-semibold tracking-tight'>
            API 帮助文档
          </h1>
          <p className='text-muted-foreground leading-relaxed'>
            本站同时兼容 OpenAI 与 Anthropic 两套接口协议。获取 API Key
            并挑选模型后，你可以直接使用官方 SDK 或任意 HTTP
            客户端发起请求，无需改动已有代码。
          </p>
        </header>

        <div className='flex flex-wrap items-baseline gap-2'>
          <span className='text-muted-foreground text-sm'>服务地址</span>
          <code className={inlineCodeClassName}>{baseUrl}</code>
        </div>

        <section className='grid gap-4 sm:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>第一步：获取 API Key</CardTitle>
              <CardDescription>
                在密钥管理页面创建令牌，它是一切请求的身份凭证，请妥善保管。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size='sm' render={<Link to='/keys' />}>
                前往密钥管理
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>第二步：挑选模型</CardTitle>
              <CardDescription>
                在模型广场查看可用模型、计费方式与支持的接口类型。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size='sm'
                variant='outline'
                render={<Link to='/pricing' />}
              >
                前往模型广场
              </Button>
            </CardContent>
          </Card>
        </section>

        <p className='text-muted-foreground text-sm leading-relaxed'>
          以下示例均为非流式调用，如何选择模型请参考上方的模型广场。
        </p>

        <ProtocolCard
          title='OpenAI 兼容接口'
          description='与 OpenAI Chat Completions 接口完全兼容。使用 openai 官方 SDK 时，只需替换 base_url 与 api_key 两项配置。'
          endpoint={`${baseUrl}${OPENAI_CHAT_PATH}`}
          auth={OPENAI_AUTH_HEADER}
          samples={openAiSamples}
        />

        <ProtocolCard
          title='Anthropic 兼容接口'
          description='与 Anthropic Messages 接口完全兼容。使用 anthropic 官方 SDK 时，只需替换 base_url 与 api_key 两项配置。'
          endpoint={`${baseUrl}${ANTHROPIC_MESSAGES_PATH}`}
          auth={ANTHROPIC_AUTH_HEADER}
          samples={anthropicSamples}
        />
      </div>
    </PublicLayout>
  )
}
