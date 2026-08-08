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
import { useSystemConfig } from '@/hooks/use-system-config'

export function ClassicFooter() {
  const { systemName, footerHtml } = useSystemConfig()
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className='flex w-full flex-col items-center gap-4 px-6 py-6'
      style={{ backgroundColor: '#1d1d1f' }}
    >
      <div className='flex w-full max-w-[1110px] flex-col items-center gap-4'>
        <div
          className='flex w-full flex-col gap-3 text-justify text-xs'
          style={{ color: '#86868b' }}
        >
          <p>
            AigoToken is a unified, OpenAI-compatible endpoint that gives you
            access to top-tier AI models (GPT, Claude, Gemini, and more) at a
            low per-token price. Choose the integration path tailored to how you
            use AigoToken and get started. Becoming the Foundational Financial
            Infrastructure of the AI Agent Era. Agents as Sovereign Economic
            Entities - Self-custody of funds, autonomous procurement of
            computing power, and native Agent-to-Agent (A2A) settlement. Agent
            API Infrastructure - Unified multi-model access, privacy-first
            integration, native crypto payments, intelligent routing, and a
            structural pricing advantage. Empowering AI to evolve from passive
            tools into sovereign economic actors - capable of self-funding and
            settling autonomously through crypto wallets. Accelerating the
            Advent of AGI for All of Humankind.
          </p>
        </div>
        <nav
          className='flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs'
          style={{ color: '#86868b' }}
        >
          <a
            href='https://github.com/openclaw/openclaw'
            target='_blank'
            rel='noopener noreferrer'
            className='transition-colors hover:text-white'
          >
            OpenClaw
          </a>
          <a
            href='https://docs.newapi.pro'
            target='_blank'
            rel='noopener noreferrer'
            className='transition-colors hover:text-white'
          >
            API 文档
          </a>
          <a
            href='https://modelscope.cn'
            target='_blank'
            rel='noopener noreferrer'
            className='transition-colors hover:text-white'
          >
            ModelScope
          </a>
          <a
            href='https://open.bigmodel.cn'
            target='_blank'
            rel='noopener noreferrer'
            className='transition-colors hover:text-white'
          >
            智谱 AI
          </a>
          <a
            href='https://hf-mirror.com'
            target='_blank'
            rel='noopener noreferrer'
            className='transition-colors hover:text-white'
          >
            HF-Mirror
          </a>
          <a
            href='https://deepseek.com'
            target='_blank'
            rel='noopener noreferrer'
            className='transition-colors hover:text-white'
          >
            DeepSeek
          </a>
        </nav>
        {footerHtml ? (
          <div
            className='custom-footer text-xs'
            style={{ color: '#f5f5f7' }}
            dangerouslySetInnerHTML={{ __html: footerHtml }}
          />
        ) : (
          <span className='text-xs' style={{ color: '#f5f5f7' }}>
            © {currentYear} {systemName}
          </span>
        )}
      </div>
      <a
        href='https://beian.miit.gov.cn/'
        target='_blank'
        rel='noopener noreferrer'
        className='text-xs transition-colors'
        style={{ color: '#86868b' }}
      >
        京ICP备2026020309号-2
      </a>
    </footer>
  )
}
