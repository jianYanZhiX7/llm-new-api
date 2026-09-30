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
import { act, render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchTokenKey, getApiKeys } from '@/features/keys/api'
import { API_KEY_STATUS } from '@/features/keys/constants'
import { useAuthStore } from '@/stores/auth-store'

import { CodeSampleCard } from '../components/code-sample-card'
import { ProtocolCard } from '../components/protocol-card'
import { ProtocolDeck } from '../components/protocol-deck'
import { QuickStartCard } from '../components/quick-start-card'
import {
  ANTHROPIC_VERSION,
  API_KEY_PLACEHOLDER,
  buildAnthropicSamples,
  buildOpenAiSamples,
  MODEL_PLACEHOLDER,
  OPENAI_BASE_PATH,
} from '../lib/samples'
import { DOC_SECTION_IDS, type ProtocolId } from '../lib/sections'
import { useApiKeySelection } from '../lib/use-api-key-options'
import { useTypewriter } from '../lib/use-typewriter'
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

  it('renders a partially typed credential without injecting extra glyphs', () => {
    const partial = 'sk-li'
    const samples = buildOpenAiSamples(BASE_URL, {
      apiKey: partial,
      model: MODEL_PLACEHOLDER,
    })

    const { container } = render(
      <CodeSampleCard samples={samples} highlightTerms={[partial]} />
    )

    const pre = container.querySelector('pre')

    expect(pre?.textContent).toBe(samples.python3)
    expect(container.querySelectorAll('pre .text-success')).toHaveLength(1)
    expect(container.textContent).toContain(`api_key="${partial}"`)
  })
})

describe('quick start card', () => {
  function renderCard(
    apiKey = apiKeySelection(),
    model = modelSelection(),
    activeProtocol: ProtocolId = DOC_SECTION_IDS.openai,
    onSelectProtocol = vi.fn()
  ): Promise<ReturnType<typeof render>> {
    return renderInRouter(
      <QuickStartCard
        activeProtocol={activeProtocol}
        onSelectProtocol={onSelectProtocol}
        apiKeySelection={apiKey}
        modelSelection={model}
      />
    )
  }

  it('marks the active protocol and reports the switch on click', async () => {
    const user = userEvent.setup()
    const onSelectProtocol = vi.fn()

    await renderCard(
      undefined,
      undefined,
      DOC_SECTION_IDS.openai,
      onSelectProtocol
    )

    expect(screen.getByRole('button', { name: 'OpenAI' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Anthropic' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )

    await user.click(screen.getByRole('button', { name: 'Anthropic' }))

    expect(onSelectProtocol).toHaveBeenCalledWith(DOC_SECTION_IDS.anthropic)
  })

  it('lists only the step titles, without secondary copy', async () => {
    const { container } = await renderCard()

    const texts = [...container.querySelectorAll('p')].map(
      (node) => node.textContent
    )

    expect(texts).toEqual([
      '第一步：选择接口类型',
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

describe('protocol deck', () => {
  function layer(id: ProtocolId, text: string) {
    return { id, content: <p>{text}</p> }
  }

  function deck(active: ProtocolId) {
    return (
      <ProtocolDeck
        id={DOC_SECTION_IDS.protocols}
        active={active}
        layers={[
          layer(DOC_SECTION_IDS.openai, 'openai body'),
          layer(DOC_SECTION_IDS.anthropic, 'anthropic body'),
        ]}
      />
    )
  }

  function layersOf(container: HTMLElement) {
    const deckElement = container.querySelector(
      `#${DOC_SECTION_IDS.protocols}`
    ) as HTMLElement
    return [...deckElement.children] as HTMLElement[]
  }

  it('overlaps both layers in a single grid cell', () => {
    const { container } = render(deck(DOC_SECTION_IDS.openai))

    const layers = layersOf(container)

    expect(layers).toHaveLength(2)
    for (const element of layers) {
      expect(element.className).toContain('col-start-1')
      expect(element.className).toContain('row-start-1')
      expect(element.className).toContain('transition-')
    }
  })

  it('exposes only the active layer', () => {
    const { container } = render(deck(DOC_SECTION_IDS.openai))

    const [openai, anthropic] = layersOf(container)

    expect(openai).toHaveAttribute('aria-hidden', 'false')
    expect(openai).not.toHaveAttribute('inert')
    expect(anthropic).toHaveAttribute('aria-hidden', 'true')
    expect(anthropic).toHaveAttribute('inert')
  })

  it('swaps the exposed layer when the active protocol changes', () => {
    const { container, rerender } = render(deck(DOC_SECTION_IDS.openai))

    rerender(deck(DOC_SECTION_IDS.anthropic))

    const [openai, anthropic] = layersOf(container)

    expect(openai).toHaveAttribute('aria-hidden', 'true')
    expect(openai).toHaveAttribute('inert')
    expect(anthropic).toHaveAttribute('aria-hidden', 'false')
    expect(anthropic).not.toHaveAttribute('inert')
  })
})

describe('protocol card placeholder hints', () => {
  const baseProps = {
    id: 'openai',
    title: 'OpenAI 兼容接口',
    baseUrl: `${BASE_URL}${OPENAI_BASE_PATH}`,
  } as const

  it('shows a copyable base url next to the protocol title', async () => {
    const user = userEvent.setup()
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue()

    const { container } = render(
      <>
        <ProtocolCard
          {...baseProps}
          samples={buildOpenAiSamples(BASE_URL)}
          credentials={{
            apiKey: API_KEY_PLACEHOLDER,
            model: MODEL_PLACEHOLDER,
          }}
        />
        <ProtocolCard
          id='anthropic'
          title='Anthropic 兼容接口'
          baseUrl={BASE_URL}
          samples={buildAnthropicSamples(BASE_URL)}
          credentials={{
            apiKey: API_KEY_PLACEHOLDER,
            model: MODEL_PLACEHOLDER,
          }}
        />
      </>
    )

    const headerCopyButton = (id: string) =>
      within(container.querySelector(id) as HTMLElement).getAllByRole(
        'button',
        {
          name: 'Copy to clipboard',
        }
      )[0]

    expect(
      screen.getByText(`${BASE_URL}${OPENAI_BASE_PATH}`)
    ).toBeInTheDocument()
    expect(screen.getByText(BASE_URL)).toBeInTheDocument()

    await user.click(headerCopyButton('#openai'))
    expect(writeText).toHaveBeenCalledWith(`${BASE_URL}${OPENAI_BASE_PATH}`)

    await user.click(headerCopyButton('#anthropic'))
    expect(writeText).toHaveBeenCalledWith(BASE_URL)
  })

  it('leaves both placeholders inside the code sample while nothing is chosen', () => {
    const { container } = render(
      <ProtocolCard
        {...baseProps}
        samples={buildOpenAiSamples(BASE_URL)}
        credentials={{ apiKey: API_KEY_PLACEHOLDER, model: MODEL_PLACEHOLDER }}
      />
    )

    expect(container.textContent).toContain(API_KEY_PLACEHOLDER)
    expect(container.textContent).toContain(MODEL_PLACEHOLDER)
    expect(container.textContent).not.toContain('换成')
  })

  it('fills the code sample with the real key once it is chosen', () => {
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

    expect(container.textContent).toContain('api_key="sk-live-key"')
    expect(container.textContent).not.toContain(API_KEY_PLACEHOLDER)
    expect(container.textContent).toContain(MODEL_PLACEHOLDER)
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

describe('credential typewriter', () => {
  const CHOSEN_KEY = 'sk-live-key-value'

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function allowMotion() {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }))
  }

  function advance(steps: number) {
    for (let step = 0; step < steps; step += 1) {
      act(() => {
        vi.advanceTimersByTime(50)
      })
    }
  }

  it('shows the initial value in full without typing', () => {
    const { result } = renderHook(() => useTypewriter(API_KEY_PLACEHOLDER))

    expect(result.current).toBe(API_KEY_PLACEHOLDER)
  })

  it('skips the animation when the viewer prefers reduced motion', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useTypewriter(value),
      { initialProps: { value: API_KEY_PLACEHOLDER } }
    )

    rerender({ value: CHOSEN_KEY })

    expect(result.current).toBe(CHOSEN_KEY)
  })

  it('reveals a newly chosen value one character at a time', () => {
    allowMotion()
    vi.useFakeTimers()

    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useTypewriter(value),
      { initialProps: { value: API_KEY_PLACEHOLDER } }
    )

    rerender({ value: CHOSEN_KEY })
    expect(result.current).toBe('')

    const frames: string[] = []

    for (let step = 0; step < CHOSEN_KEY.length; step += 1) {
      advance(1)
      frames.push(result.current)
    }

    const revealed = frames.filter(
      (frame) => frame.length > 0 && frame.length < CHOSEN_KEY.length
    )

    expect(revealed.length).toBeGreaterThan(0)
    expect(frames.every((frame) => CHOSEN_KEY.startsWith(frame))).toBe(true)
    expect(result.current).toBe(CHOSEN_KEY)
  })

  it('restarts from the first character when another value is chosen mid-typing', () => {
    allowMotion()
    vi.useFakeTimers()

    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useTypewriter(value),
      { initialProps: { value: API_KEY_PLACEHOLDER } }
    )

    rerender({ value: 'sk-first' })
    advance(3)
    expect(result.current.length).toBeGreaterThan(0)

    rerender({ value: 'sk-second' })
    expect(result.current).toBe('')

    advance(20)
    expect(result.current).toBe('sk-second')
  })
})
