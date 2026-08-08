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
  AzureAI,
  Claude,
  Cohere,
  DeepSeek,
  Gemini,
  Grok,
  Hunyuan,
  Midjourney,
  Minimax,
  Moonshot,
  OpenAI,
  Qwen,
  Qingyan,
  Spark,
  Suno,
  Volcengine,
  Wenxin,
  XAI,
  Xinference,
  Zhipu,
} from '@lobehub/icons'
import { Link } from '@tanstack/react-router'
import { Copy } from 'lucide-react'
import { type CSSProperties, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'

import './home.css'

function GithubMark({ style }: { style?: CSSProperties }) {
  return (
    <svg
      viewBox='0 0 16 16'
      width='17'
      height='17'
      fill='currentColor'
      aria-hidden='true'
      style={style}
    >
      <path d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z' />
    </svg>
  )
}

const PROVIDERS = [
  { icon: <Moonshot size={32} />, name: 'Moonshot' },
  { icon: <OpenAI size={32} />, name: 'OpenAI' },
  { icon: <XAI size={32} />, name: 'xAI' },
  { icon: <Zhipu.Color size={32} />, name: 'Zhipu' },
  { icon: <Volcengine.Color size={32} />, name: 'Volcengine' },
  { icon: <Cohere.Color size={32} />, name: 'Cohere' },
  { icon: <Claude.Color size={32} />, name: 'Claude' },
  { icon: <Gemini.Color size={32} />, name: 'Gemini' },
  { icon: <Suno size={32} />, name: 'Suno' },
  { icon: <Minimax.Color size={32} />, name: 'Minimax' },
  { icon: <Wenxin.Color size={32} />, name: 'Wenxin' },
  { icon: <Spark.Color size={32} />, name: 'Spark' },
  { icon: <Qingyan.Color size={32} />, name: 'Qingyan' },
  { icon: <DeepSeek.Color size={32} />, name: 'DeepSeek' },
  { icon: <Qwen.Color size={32} />, name: 'Qwen' },
  { icon: <Midjourney size={32} />, name: 'Midjourney' },
  { icon: <Grok size={32} />, name: 'Grok' },
  { icon: <AzureAI.Color size={32} />, name: 'Azure AI' },
  { icon: <Hunyuan.Color size={32} />, name: 'Hunyuan' },
  { icon: <Xinference.Color size={32} />, name: 'Xinference' },
]

const MARQUEE_TRACK = [
  ...PROVIDERS.map((p) => ({ ...p, id: `${p.name}-a` })),
  ...PROVIDERS.map((p) => ({ ...p, id: `${p.name}-b` })),
]

const OPENAI_BASE_URL = 'https://www.aigotoken.com/v1'
const ANTHROPIC_BASE_URL = 'https://www.aigotoken.com'

export function ClassicHome() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const [copiedUrl, setCopiedUrl] = useState('')

  const isDemoSiteMode = status?.demo_site_enabled || false
  const version = status?.version

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1 }
    )
    document
      .querySelectorAll('.home-feature-card.fade-in')
      .forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(''), 2000)
  }

  return (
    <div className='w-full overflow-x-hidden'>
      <section className='home-hero'>
        <h1 className='home-title'>{t('One site for all large models')}</h1>
        <p className='home-subhead'>
          {t('The financial infrastructure of the AI Agent era')}
        </p>

        <div className='home-hero-urls'>
          <div className='home-hero-url-item'>
            <span className='home-hero-url-label'>
              {t('OpenAI Compatible')}
            </span>
            <code className='home-hero-url'>{OPENAI_BASE_URL}</code>
            <button
              type='button'
              className='home-copy-btn'
              onClick={() => handleCopy(OPENAI_BASE_URL)}
            >
              {copiedUrl === OPENAI_BASE_URL ? '✓' : <Copy size={14} />}
            </button>
          </div>
          <div className='home-hero-url-item'>
            <span className='home-hero-url-label'>
              {t('Anthropic Compatible')}
            </span>
            <code className='home-hero-url'>{ANTHROPIC_BASE_URL}</code>
            <button
              type='button'
              className='home-copy-btn'
              onClick={() => handleCopy(ANTHROPIC_BASE_URL)}
            >
              {copiedUrl === ANTHROPIC_BASE_URL ? '✓' : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className='home-cta-group'>
          <Link to='/keys' className='home-apple-button'>
            {t('Get API Key')}
          </Link>
          <Link
            to='/pricing'
            className='home-apple-button home-apple-button-secondary'
          >
            {t('Model Pricing')}
            <span className='home-cta-arrow'>›</span>
          </Link>
          {isDemoSiteMode && version && (
            <a
              href='https://github.com/QuantumNous/new-api'
              target='_blank'
              rel='noopener noreferrer'
              className='home-apple-button home-apple-button-secondary'
            >
              <GithubMark style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {version}
            </a>
          )}
        </div>

        <div className='home-stats-section'>
          <div className='home-stats-grid'>
            <div className='home-stat-card'>
              <span className='home-stat-value'>100+</span>
              <span className='home-stat-label'>Models Available</span>
            </div>
            <div className='home-stat-card'>
              <span className='home-stat-value'>50M+</span>
              <span className='home-stat-label'>API Requests / Day</span>
            </div>
            <div className='home-stat-card'>
              <span className='home-stat-value'>99.98%</span>
              <span className='home-stat-label'>Uptime</span>
            </div>
            <div className='home-stat-card'>
              <span className='home-stat-value'>10k+</span>
              <span className='home-stat-label'>Users</span>
            </div>
          </div>
        </div>

        <div className='home-marquee-section'>
          <div className='home-marquee'>
            <div className='home-marquee-track'>
              {MARQUEE_TRACK.map((provider) => (
                <Link
                  key={provider.id}
                  to='/pricing'
                  className='home-marquee-item'
                >
                  {provider.icon}
                  <span>{provider.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className='home-features'>
        <h2 className='home-features-title'>{t('Why AigoToken')}</h2>
        <div className='home-features-grid'>
          <div className='home-feature-card fade-in'>
            <video autoPlay loop muted playsInline>
              <source src='/WEBM-111.webm' type='video/webm' />
            </video>
            <div className='home-feature-card-content'>
              <h3>{t('Competitive Pricing')}</h3>
              <p>
                {t(
                  'Same top models, less cost. Mainstream provider token rates are fully transparent, with no hidden markup.'
                )}
              </p>
            </div>
          </div>
          <div className='home-feature-card fade-in'>
            <video autoPlay loop muted playsInline>
              <source src='/WEBM-222.webm' type='video/webm' />
            </video>
            <div className='home-feature-card-content'>
              <h3>{t('Unified API')}</h3>
              <p>
                {t(
                  'One key unlocks all mainstream models. Switching models takes a single parameter.'
                )}
              </p>
            </div>
          </div>
          <div className='home-feature-card fade-in'>
            <video autoPlay loop muted playsInline>
              <source src='/WEBM-333.webm' type='video/webm' />
            </video>
            <div className='home-feature-card-content'>
              <h3>{t('Privacy & Security')}</h3>
              <p>
                {t(
                  'PII is auto-masked, so sensitive data never leaks to model providers. Enterprise-grade security.'
                )}
              </p>
            </div>
          </div>
          <div className='home-feature-card fade-in'>
            <video autoPlay loop muted playsInline>
              <source src='/WEBM-444.webm' type='video/webm' />
            </video>
            <div className='home-feature-card-content'>
              <h3>{t('Real-time Analytics')}</h3>
              <p>
                {t(
                  'One console to monitor token usage, latency, and spend across all models, with fine-grained breakdown.'
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className='home-quickstart'>
        <h2 className='home-features-title'>{t('Quick Start')}</h2>
        <div className='home-quickstart-steps'>
          <div className='home-quickstart-step'>
            <div className='home-quickstart-badge'>1</div>
            <h3 className='home-quickstart-step-title'>
              {t('Configure Base URL')}
            </h3>
            <div className='home-quickstart-url-group'>
              <div className='home-quickstart-url-item'>
                <span className='home-quickstart-url-label'>
                  {t('OpenAI Compatible')}
                </span>
                <code className='home-quickstart-url'>{OPENAI_BASE_URL}</code>
                <button
                  type='button'
                  className='home-copy-btn'
                  onClick={() => handleCopy(OPENAI_BASE_URL)}
                >
                  {copiedUrl === OPENAI_BASE_URL ? '✓' : <Copy />}
                </button>
              </div>
              <div className='home-quickstart-url-item'>
                <span className='home-quickstart-url-label'>
                  {t('Anthropic Compatible')}
                </span>
                <code className='home-quickstart-url'>
                  {ANTHROPIC_BASE_URL}
                </code>
                <button
                  type='button'
                  className='home-copy-btn'
                  onClick={() => handleCopy(ANTHROPIC_BASE_URL)}
                >
                  {copiedUrl === ANTHROPIC_BASE_URL ? '✓' : <Copy />}
                </button>
              </div>
            </div>
          </div>

          <div className='home-quickstart-step'>
            <div className='home-quickstart-badge'>2</div>
            <h3 className='home-quickstart-step-title'>
              {t('Choose API Key')}
            </h3>
            <p className='home-quickstart-step-desc'>
              {t('Create and copy your API key')}
            </p>
            <Link to='/keys' className='home-apple-button'>
              {t('Get API Key')}
            </Link>
          </div>

          <div className='home-quickstart-step'>
            <div className='home-quickstart-badge'>3</div>
            <h3 className='home-quickstart-step-title'>
              {t('Choose a Model')}
            </h3>
            <p className='home-quickstart-step-desc'>
              {t('Browse 100+ mainstream models and pick as needed')}
            </p>
            <Link to='/pricing' className='home-apple-button'>
              {t('Browse Models')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
