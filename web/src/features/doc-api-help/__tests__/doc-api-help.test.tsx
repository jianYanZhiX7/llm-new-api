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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchTokenKey, getApiKeys } from '@/features/keys/api'
import { API_KEY_STATUS } from '@/features/keys/constants'
import { useAuthStore } from '@/stores/auth-store'

import { CodeSampleCard } from '../components/code-sample-card'
import { DocToc } from '../components/doc-toc'
import { ProtocolCard } from '../components/protocol-card'
import { QuickStartCard } from '../components/quick-start-card'
import {
  ANTHROPIC_VERSION,
  API_KEY_PLACEHOLDER,
  buildAnthropicSamples,
  buildOpenAiSamples,
  MODEL_PLACEHOLDER,
  OPENAI_BASE_PATH,
} from '../lib/samples'
import { DOC_SECTIONS } from '../lib/sections'
import { useApiKeySelection } from '../lib/use-api-key-options'
import type {
  ApiKeySelection,
  ModelSelection,
  Selection,
  SelectionStatus,
} from '../types'

vi.mock('@/features/keys/api', () => ({
  getApiKeys: vi.fn(),
  fetchTokenKey: vi.fn(),
}))

const BASE_URL = 'https://example.com'
const KEY_ID = '7'

afterEach(() => {
  useAuthStore.getState().auth.reset()
  vi.clearAllMocks()
})

async function renderInRouter(ui: ReactNode) {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => ui }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(<RouterProvider router={router} />)
}

function selection(
  status: SelectionStatus = 'ready',
  select = vi.fn()
): Selection {
  return {
    options: [
      { value: KEY_ID, label: '默认密钥', description: 'sk-ABCD********1234' },
    ],
    value: null,
    status,
    pending: false,
    select,
  }
}

function apiKeySelection(overrides: Partial<ApiKeySelection> = {}) {
  return {
    ...selection(),
    apiKey: API_KEY_PLACEHOLDER,
    ...overrides,
  } satisfies ApiKeySelection
}

function modelSelection(overrides: Partial<ModelSelection> = {}) {
  return {
    ...selection(),
    model: MODEL_PLACEHOLDER,
    ...overrides,
  } satisfies ModelSelection
}

function wrapperWithQueryClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function signIn() {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'alice', role: 1 })
}

describe('OpenAI compatible samples', () => {
  const samples = buildOpenAiSamples(BASE_URL)

  it('targets the chat completions endpoint with a bearer token', () => {
    expect(samples.python3).toContain('from openai import OpenAI')
    expect(samples.python3).toContain(`base_url="${BASE_URL}/v1"`)
    expect(samples.typescript).toContain(`baseURL: '${BASE_URL}/v1'`)
    expect(samples.curl).toContain(`curl ${BASE_URL}/v1/chat/completions`)
    expect(samples.curl).toContain(
      `-H "Authorization: Bearer ${API_KEY_PLACEHOLDER}"`
    )
    expect(samples.curl).toContain('-H "Content-Type: application/json"')
    expect(samples.curl).toContain(MODEL_PLACEHOLDER)
  })
})

describe('Anthropic compatible samples', () => {
  const samples = buildAnthropicSamples(BASE_URL)

  it('targets the messages endpoint with the anthropic headers', () => {
    expect(samples.python3).toContain('import anthropic')
    expect(samples.python3).toContain(`base_url="${BASE_URL}"`)
    expect(samples.typescript).toContain(`baseURL: '${BASE_URL}'`)
    expect(samples.curl).toContain(`curl ${BASE_URL}/v1/messages`)
    expect(samples.curl).toContain(`-H "x-api-key: ${API_KEY_PLACEHOLDER}"`)
    expect(samples.curl).toContain(
      `-H "anthropic-version: ${ANTHROPIC_VERSION}"`
    )
  })

  it('reads the text block instead of the first content block', () => {
    expect(samples.python3).toContain('if block.type == "text"')
    expect(samples.typescript).toContain("block.type === 'text'")
  })
})

describe('credential injection', () => {
  const credentials = { apiKey: 'sk-live-key', model: 'gpt-live' }

  it.each([
    ['python3', 'api_key="sk-live-key"', 'model="gpt-live"'],
    ['typescript', "apiKey: 'sk-live-key'", "model: 'gpt-live'"],
    ['curl', 'Authorization: Bearer sk-live-key', '"model": "gpt-live"'],
  ] as const)(
    'fills the OpenAI %s sample',
    (lang, keyFragment, modelFragment) => {
      const code = buildOpenAiSamples(BASE_URL, credentials)[lang]
      expect(code).toContain(keyFragment)
      expect(code).toContain(modelFragment)
      expect(code).not.toContain(API_KEY_PLACEHOLDER)
      expect(code).not.toContain(MODEL_PLACEHOLDER)
    }
  )

  it.each([
    ['python3', 'api_key="sk-live-key"', 'model="gpt-live"'],
    ['typescript', "apiKey: 'sk-live-key'", "model: 'gpt-live'"],
    ['curl', 'x-api-key: sk-live-key', '"model": "gpt-live"'],
  ] as const)(
    'fills the Anthropic %s sample',
    (lang, keyFragment, modelFragment) => {
      const code = buildAnthropicSamples(BASE_URL, credentials)[lang]
      expect(code).toContain(keyFragment)
      expect(code).toContain(modelFragment)
      expect(code).not.toContain(API_KEY_PLACEHOLDER)
      expect(code).not.toContain(MODEL_PLACEHOLDER)
    }
  )
})

describe('language switching', () => {
  it('defaults to Python3 and swaps the rendered sample when cURL is selected', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <CodeSampleCard samples={buildOpenAiSamples(BASE_URL)} />
    )

    expect(screen.getByRole('tab', { name: 'Python3' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(container.textContent).toContain('from openai import OpenAI')

    await user.click(screen.getByRole('tab', { name: 'cURL' }))

    expect(screen.getByRole('tab', { name: 'cURL' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(container.textContent).toContain(
      `curl ${BASE_URL}/v1/chat/completions`
    )
    expect(container.textContent).not.toContain('from openai import OpenAI')
  })

  it('marks the selected language with the primary colour token', () => {
    render(<CodeSampleCard samples={buildOpenAiSamples(BASE_URL)} />)

    expect(screen.getByRole('tab', { name: 'Python3' })).toHaveClass(
      'data-active:text-primary!'
    )
  })
})

describe('sample code block', () => {
  const credentials = { apiKey: 'sk-live-key', model: 'gpt-live' }

  it('renders the whole sample as uncoloured plain text by default', () => {
    const { container } = render(
      <CodeSampleCard samples={buildOpenAiSamples(BASE_URL)} />
    )

    const pre = container.querySelector('pre')

    expect(pre?.children).toHaveLength(1)
    expect(pre?.querySelectorAll('.text-success')).toHaveLength(0)
    expect(container.textContent).toContain(
      'print(completion.choices[0].message.content)'
    )
  })

  it('colours the chosen api key and model inside the code block', () => {
    const { container } = render(
      <CodeSampleCard
        samples={buildOpenAiSamples(BASE_URL, credentials)}
        highlightTerms={['sk-live-key', 'gpt-live']}
      />
    )

    const marked = [...container.querySelectorAll('pre .text-success')].map(
      (node) => node.textContent
    )

    expect(marked).toEqual(['sk-live-key', 'gpt-live'])
  })
})

describe('quick start card', () => {
  function renderCard(
    apiKey = apiKeySelection(),
    model = modelSelection()
  ): Promise<ReturnType<typeof render>> {
    return renderInRouter(
      <QuickStartCard
        baseUrl={BASE_URL}
        apiKeySelection={apiKey}
        modelSelection={model}
      />
    )
  }

  it('offers one copyable base url per protocol', async () => {
    const user = userEvent.setup()
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue()

    await renderCard()

    expect(screen.getByText('OpenAI 兼容')).toBeInTheDocument()
    expect(screen.getByText('Anthropic 兼容')).toBeInTheDocument()

    const buttons = screen.getAllByRole('button', { name: 'Copy to clipboard' })
    expect(buttons).toHaveLength(2)

    await user.click(buttons[0])
    expect(writeText).toHaveBeenCalledWith(`${BASE_URL}${OPENAI_BASE_PATH}`)

    await user.click(buttons[1])
    expect(writeText).toHaveBeenCalledWith(BASE_URL)
  })

  it('lists only the step titles, without secondary copy', async () => {
    const { container } = await renderCard()

    const texts = [...container.querySelectorAll('p')].map(
      (node) => node.textContent
    )

    expect(texts).toEqual([
      '第一步：填写 Base URL',
      'OpenAI 兼容',
      'Anthropic 兼容',
      '第二步：选择 API Key',
      '第三步：选择模型',
    ])
  })

  it('reports the chosen api key option', async () => {
    const user = userEvent.setup()
    const select = vi.fn()

    await renderCard(apiKeySelection({ select }))

    await user.click(screen.getByRole('combobox', { name: 'API Key' }))
    await user.click(screen.getByRole('option', { name: /默认密钥/ }))

    expect(select).toHaveBeenCalledWith(KEY_ID)
  })

  it('reports the chosen model option', async () => {
    const user = userEvent.setup()
    const select = vi.fn()

    await renderCard(undefined, modelSelection({ select }))

    await user.click(screen.getByRole('combobox', { name: '模型' }))
    await user.click(screen.getByRole('option', { name: /默认密钥/ }))

    expect(select).toHaveBeenCalledWith(KEY_ID)
  })

  it('disables the api key select and links to the keys page when signed out', async () => {
    await renderCard(apiKeySelection(selection('anonymous')))

    const input = screen.getByRole('combobox', { name: 'API Key' })
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('placeholder', '登录后可选')
    expect(
      screen.getByRole('link', { name: '还没有密钥？前往密钥管理' })
    ).toHaveAttribute('href', '/keys')
  })

  it('links to the model square when the model list is unavailable', async () => {
    await renderCard(undefined, modelSelection(selection('error')))

    expect(screen.getByRole('combobox', { name: '模型' })).toBeDisabled()
    expect(
      screen.getByRole('link', { name: '查看更多模型？前往模型广场' })
    ).toHaveAttribute('href', '/pricing')
  })

  it('shows the key resolving hint only while pending', async () => {
    await renderCard(apiKeySelection({ pending: true }))

    expect(screen.getByText('正在读取密钥…')).toBeInTheDocument()
  })
})

describe('protocol card placeholder hints', () => {
  const baseProps = {
    id: 'openai',
    title: 'OpenAI 兼容接口',
    endpoint: `${BASE_URL}/v1/chat/completions`,
    auth: 'bearer',
  } as const

  it('lists both placeholders while no credential is chosen', () => {
    const { container } = render(
      <ProtocolCard
        {...baseProps}
        samples={buildOpenAiSamples(BASE_URL)}
        credentials={{ apiKey: API_KEY_PLACEHOLDER, model: MODEL_PLACEHOLDER }}
      />
    )

    expect(container.textContent).toContain('Authorization: Bearer')
    expect(container.textContent).toContain(API_KEY_PLACEHOLDER)
    expect(container.textContent).toContain('换成你的 API Key')
    expect(container.textContent).toContain('换成模型名称')
  })

  it('drops the api key hint and shows the real key once it is chosen', () => {
    const { container } = render(
      <ProtocolCard
        {...baseProps}
        samples={buildOpenAiSamples(BASE_URL, {
          apiKey: 'sk-live-key',
          model: MODEL_PLACEHOLDER,
        })}
        credentials={{ apiKey: 'sk-live-key', model: MODEL_PLACEHOLDER }}
      />
    )

    expect(container.textContent).toContain('Authorization: Bearer sk-live-key')
    expect(container.textContent).not.toContain('换成你的 API Key')
    expect(container.textContent).toContain('换成模型名称')
    expect(container.textContent).not.toContain(API_KEY_PLACEHOLDER)
  })

  it('colours exactly the resolved credentials inside the code block', () => {
    const { container } = render(
      <ProtocolCard
        {...baseProps}
        samples={buildOpenAiSamples(BASE_URL, {
          apiKey: 'sk-live-key',
          model: 'gpt-live',
        })}
        credentials={{ apiKey: 'sk-live-key', model: 'gpt-live' }}
      />
    )

    const marked = [...container.querySelectorAll('pre .text-success')].map(
      (node) => node.textContent
    )

    expect(marked).toEqual(['sk-live-key', 'gpt-live'])
  })

  it('leaves the placeholders uncoloured while nothing is chosen', () => {
    const { container } = render(
      <ProtocolCard
        {...baseProps}
        samples={buildOpenAiSamples(BASE_URL)}
        credentials={{ apiKey: API_KEY_PLACEHOLDER, model: MODEL_PLACEHOLDER }}
      />
    )

    expect(container.querySelectorAll('.text-success')).toHaveLength(0)
  })
})

describe('api key selection', () => {
  it('stays anonymous and skips the request when signed out', () => {
    const { result } = renderHook(() => useApiKeySelection(), {
      wrapper: wrapperWithQueryClient(),
    })

    expect(result.current.status).toBe('anonymous')
    expect(result.current.options).toEqual([])
    expect(getApiKeys).not.toHaveBeenCalled()
  })

  it('offers enabled keys and resolves the plaintext key on selection', async () => {
    signIn()
    vi.mocked(getApiKeys).mockResolvedValue({
      success: true,
      data: {
        total: 2,
        page: 1,
        page_size: 100,
        items: [
          {
            id: Number(KEY_ID),
            name: '默认密钥',
            key: 'ABCD********1234',
            status: API_KEY_STATUS.ENABLED,
          },
          {
            id: 8,
            name: '已停用',
            key: 'WXYZ********5678',
            status: API_KEY_STATUS.DISABLED,
          },
        ],
      },
    } as unknown as Awaited<ReturnType<typeof getApiKeys>>)
    vi.mocked(fetchTokenKey).mockResolvedValue({
      success: true,
      data: { key: 'real-key' },
    })

    const { result } = renderHook(() => useApiKeySelection(), {
      wrapper: wrapperWithQueryClient(),
    })

    await act(async () => {
      await vi.waitFor(() => expect(result.current.status).toBe('ready'))
    })

    expect(result.current.options).toEqual([
      {
        value: KEY_ID,
        label: '默认密钥',
        description: 'sk-ABCD********1234',
      },
    ])

    await act(async () => {
      await result.current.select(KEY_ID)
    })

    expect(fetchTokenKey).toHaveBeenCalledWith(Number(KEY_ID))
    expect(result.current.apiKey).toBe('sk-real-key')
    expect(result.current.pending).toBe(false)
  })

  it('falls back to the placeholder when the key cannot be read', async () => {
    signIn()
    vi.mocked(getApiKeys).mockResolvedValue({
      success: true,
      data: {
        total: 1,
        page: 1,
        page_size: 100,
        items: [
          {
            id: Number(KEY_ID),
            name: '默认密钥',
            key: 'ABCD********1234',
            status: API_KEY_STATUS.ENABLED,
          },
        ],
      },
    } as unknown as Awaited<ReturnType<typeof getApiKeys>>)
    vi.mocked(fetchTokenKey).mockRejectedValue(new Error('rate limited'))

    const { result } = renderHook(() => useApiKeySelection(), {
      wrapper: wrapperWithQueryClient(),
    })

    await act(async () => {
      await vi.waitFor(() => expect(result.current.status).toBe('ready'))
    })
    await act(async () => {
      await result.current.select(KEY_ID)
    })

    expect(result.current.apiKey).toBe(API_KEY_PLACEHOLDER)
  })
})

describe('doc table of contents', () => {
  it('anchors every documented section in order', () => {
    render(<DocToc />)

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))

    expect(hrefs).toEqual(DOC_SECTIONS.map((section) => `#${section.id}`))
  })

  it('leaves the quick start card out of the table of contents', () => {
    render(<DocToc />)

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))

    expect(hrefs).not.toContain('#quick-start')
  })
})
