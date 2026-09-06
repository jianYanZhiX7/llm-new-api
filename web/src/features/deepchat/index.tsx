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

type ManualSection = {
  title: string
  body: string
}

const manualSections: ManualSection[] = [
  {
    title: 'One app for every model',
    body: 'Manage cloud and local models from a single place. DeepChat ships with presets for OpenAI, Anthropic, Gemini, DeepSeek, Moonshot/Kimi, Zhipu, Doubao, Qwen/DashScope, MiniMax, Tencent Hunyuan, Grok, and more — just add your API key. Ollama runs locally with in-app download, deployment, and management. Because DeepChat speaks standard OpenAI, Gemini, and Anthropic API formats, gateways and relays such as OpenRouter, New API, and AIHubMix connect as presets or custom endpoints with nothing more than a Base URL, an API key, and a model name.',
  },
  {
    title: 'Agent sessions you can resume',
    body: 'Every conversation is an Agent session built on the Tape.systems philosophy: structured work history that is recoverable, traceable, and auditable. Bind a project directory, choose a permission mode, and inspect tool output as it happens. Tapes record the full history so long-running tasks can be paused and resumed, while Trace preview shows request sequence numbers, provider and model metadata, the Tape view list, context entries, and token budgets — everything you need to debug a long session.',
  },
  {
    title: 'Skills',
    body: 'Skills are capability packs that follow the standard Agent Skills specification, bundling task instructions, reference material, assets, and optional scripts. Install one from a folder, a ZIP file, or a URL, then enable it in the session where it belongs. Built-in skills span algorithm art, code review, document collaboration, DOCX, frontend design, git commit, infographic syntax, MCP building, PDF, PPTX, skill creation, Web Artifacts, XLSX, and more — and they interoperate with Claude Code, Codex, Cursor, Windsurf, and GitHub Copilot.',
  },
  {
    title: 'MCP (Model Context Protocol)',
    body: 'DeepChat supports the full MCP surface — Resources, Prompts, and Tools — over StreamableHTTP, SSE, and Stdio transports. A bundled Node.js runtime means npx- and node-based MCP servers work out of the box, while in-memory services provide built-in code execution, web fetching, and file operations. Tool calls are shown with their parameters and returned data for easy debugging, and any service can be installed with a single click through DeepLink.',
  },
  {
    title: 'ACP (Agent Client Protocol) Agents',
    body: 'External Agent runtimes join DeepChat as first-class models. Enable ACP in settings, pick a built-in ACP agent or add a custom ACP-compatible command, then select it in the model picker to start an Agent session. When the agent supports it, the Workspace UI reveals structured plans, tool calls, and terminal output, making coding and task workflows feel native.',
  },
  {
    title: 'Search and web access',
    body: 'Models decide when to search. Built-in Bocha Search and Brave Search integrations are ready out of the box, and simulated browsing can read Google, Bing, Baidu, and Sogou WeChat search results. A configurable search-assistant model connects any search source — internal networks, keyless engines, or vertical search — as an information source, with external references highlighted inline.',
  },
  {
    title: 'DeepLink & remote control',
    body: 'Start a conversation or install an MCP service directly from a link. Remote control runs over Telegram, Feishu/Lark, QQBot, Discord, and WeChat iLink: bind an endpoint to a session, then create or switch sessions, stop generation, open a session on the desktop, answer pending permission requests, switch models, and check status with commands like /start, /pair, /new, /sessions, /use, /stop, /open, /pending, /model, and /status.',
  },
  {
    title: 'Private by design',
    body: 'Chat and configuration data stay on your machine by default and are never uploaded. Encryption interfaces and code obfuscation are reserved for self-hosted enterprise customization, proxy configuration reduces direct-exposure risk, and privacy tools include screen-projection hiding. DeepChat is open source under the Apache License 2.0 — free to use and extend.',
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

          <div className='mx-auto mt-10 max-w-7xl px-6 sm:mt-14'>
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
          <div className='mx-auto max-w-6xl px-6'>
            <h2 className='text-center text-[28px] font-semibold tracking-[-0.005em] sm:text-[40px]'>
              强大功能
            </h2>
            <div className='mt-14 grid gap-6 sm:mt-20 sm:grid-cols-2 lg:grid-cols-3'>
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className='rounded-3xl bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                >
                  <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f7]'>
                    <feature.icon className='h-6 w-6 text-[#0071e3]' />
                  </div>
                  <h3 className='mt-5 text-[21px] font-semibold tracking-[-0.005em] sm:text-[24px]'>
                    {feature.title}
                  </h3>
                  <p className='mt-2 text-[17px] leading-[1.47] tracking-[-0.022em] text-[#6e6e73]'>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className='bg-black py-20 text-white sm:py-28'>
          <div className='mx-auto max-w-6xl px-6'>
            <h2 className='text-center text-[28px] font-semibold tracking-[-0.005em] sm:text-[40px]'>
              Everything DeepChat can do
            </h2>
            <p className='mx-auto mt-4 max-w-2xl text-center text-[17px] leading-[1.47] tracking-[-0.022em] text-white/70'>
              One local-first desktop client for models, agents, skills, and
              remote control.
            </p>

            <div className='mt-14 grid gap-x-12 gap-y-12 sm:mt-20 md:grid-cols-2'>
              {manualSections.map((section) => (
                <article key={section.title}>
                  <h3 className='text-[19px] font-semibold tracking-[-0.005em] sm:text-[22px]'>
                    {section.title}
                  </h3>
                  <p className='mt-3 text-[15px] leading-[1.6] text-justify text-white/70 sm:text-[16px]'>
                    {section.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

      </div>
    </PublicLayout>
  )
}
