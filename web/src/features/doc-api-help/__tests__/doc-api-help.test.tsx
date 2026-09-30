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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { CodeSampleCard } from '../components/code-sample-card'
import { DocToc } from '../components/doc-toc'
import {
  ANTHROPIC_VERSION,
  API_KEY_PLACEHOLDER,
  buildAnthropicSamples,
  buildOpenAiSamples,
  MODEL_PLACEHOLDER,
} from '../lib/samples'
import { DOC_SECTIONS } from '../lib/sections'

const BASE_URL = 'https://example.com'

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
})

describe('doc table of contents', () => {
  it('anchors every documented section in order', () => {
    render(<DocToc />)

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))

    expect(hrefs).toEqual(DOC_SECTIONS.map((section) => `#${section.id}`))
  })
})
