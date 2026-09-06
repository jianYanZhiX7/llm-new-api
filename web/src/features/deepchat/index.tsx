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
import { useEffect, useState } from 'react'

import {
  Bot,
  Braces,
  Laptop,
  Package,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

import { PublicLayout } from '@/components/layout'

type Feature = {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: Laptop,
    title: '本地优先',
    description: '数据留在本地，隐私由你掌控。',
  },
  {
    icon: Bot,
    title: '多 Agent',
    description: '日常助手、代码专家、数据分析、写作助手，各展所长。',
  },
  {
    icon: Sparkles,
    title: 'Skills',
    description: '为每个会话装上合适的技能，需要时随取随用。',
  },
  {
    icon: Braces,
    title: 'ACP 集成',
    description: '把 ACP 兼容的 Agent 当作模型，直接对话。',
  },
  {
    icon: Package,
    title: 'MCP 支持',
    description: '连接外部工具与上下文，一键安装。',
  },
  {
    icon: Smartphone,
    title: '手机远程连接',
    description: '出门在外，用微信、飞书、QQ 就能远程连接电脑。',
  },
]

const ROTATING_WORDS = [
  '做分析',
  '做 PPT',
  '写文档',
  '写小说',
  '写代码',
  '做设计',
  '做表格',
  '写邮件',
  '做总结',
  '写报告',
  '做翻译',
  '写文案',
  '做研究',
  '写周报',
  '做海报',
  '写论文',
]

const WORDS = [
  ...ROTATING_WORDS.map((label, id) => ({ id, label })),
  { id: ROTATING_WORDS.length, label: ROTATING_WORDS[0] },
]
const ROTATE_INTERVAL_MS = 2200
const ROTATE_DURATION_MS = 500
const LINE_HEIGHT_EM = 1.3
const WRAP_INDEX = ROTATING_WORDS.length

function RotatingWord() {
  const [index, setIndex] = useState(0)
  const [instant, setInstant] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => {
      setInstant(false)
      setIndex((prev) => Math.min(prev + 1, WRAP_INDEX))
    }, ROTATE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (index !== WRAP_INDEX) return
    const fallback = window.setTimeout(() => {
      setInstant(true)
      setIndex(0)
    }, ROTATE_DURATION_MS * 2)
    return () => window.clearTimeout(fallback)
  }, [index])

  const handleTransitionEnd = () => {
    if (index !== WRAP_INDEX) return
    setInstant(true)
    setIndex(0)
  }

  return (
    <span
      className='inline-block overflow-hidden align-bottom text-[#0071e3]'
      style={{ height: `${LINE_HEIGHT_EM}em` }}
    >
      <span
        className='flex flex-col'
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: `translateY(-${index * LINE_HEIGHT_EM}em)`,
          transition: instant
            ? 'none'
            : `transform ${ROTATE_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        {WORDS.map(({ id, label }) => (
          <span
            key={id}
            className='block whitespace-nowrap'
            style={{
              height: `${LINE_HEIGHT_EM}em`,
              lineHeight: `${LINE_HEIGHT_EM}em`,
            }}
          >
            {label}
          </span>
        ))}
      </span>
    </span>
  )
}

export function DeepChat() {
  return (
    <PublicLayout showMainContainer={false}>
      <div
        className='bg-white text-[#1d1d1f]'
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        <section className='pt-24 pb-12 text-center sm:pt-32 sm:pb-16'>
          <div className='mx-auto max-w-4xl px-6'>
            <h1 className='text-[clamp(40px,8vw,80px)] leading-[1.05] font-semibold tracking-[-0.015em]'>
              DeepChat
            </h1>
            <p className='mt-2 text-[19px] leading-[1.3] font-normal tracking-[0.009em] sm:text-2xl'>
              开箱即用的 Agent 桌面客户端，我帮你<RotatingWord />
            </p>
          </div>

          <div className='mx-auto mt-10 max-w-5xl px-6 sm:mt-14'>
            <img
              src='/deepchat.png'
              alt='DeepChat 桌面客户端界面'
              className='w-full rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)]'
              loading='eager'
            />
            <p className='mx-auto mt-6 max-w-2xl text-[17px] leading-[1.47] tracking-[-0.022em] text-[#6e6e73]'>
              将模型、工具、Skills、Agent Runtime 与长会话统一在一款应用中，
              支持 MCP、ACP 与远程控制。
            </p>
          </div>
        </section>

        <section className='bg-[#f5f5f7] py-20 sm:py-28'>
          <div className='mx-auto max-w-3xl px-6'>
            <h2 className='text-center text-[28px] font-semibold tracking-[-0.005em] sm:text-[40px]'>
              强大功能
            </h2>
            <div className='mt-14 flex flex-col gap-12 sm:mt-20 sm:gap-16'>
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className='flex items-start gap-5 sm:gap-7'
                >
                  <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]'>
                    <feature.icon className='h-6 w-6 text-[#0071e3]' />
                  </div>
                  <div className='min-w-0 pt-0.5'>
                    <h3 className='text-[21px] font-semibold tracking-[-0.005em] sm:text-[24px]'>
                      {feature.title}
                    </h3>
                    <p className='mt-2 text-[17px] leading-[1.47] tracking-[-0.022em] text-[#6e6e73]'>
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </PublicLayout>
  )
}
