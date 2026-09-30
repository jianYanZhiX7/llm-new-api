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
import { describe, expect, it, vi } from 'vitest'

import { VendorFilterBar } from '../components/vendor-filter-bar'
import { FILTER_ALL } from '../constants'
import type { PricingModel, PricingVendor } from '../types'

const vendors: PricingVendor[] = [
  { id: 1, name: 'DeepSeek' },
  { id: 2, name: 'Moonshot' },
  { id: 3, name: 'Unused Vendor' },
]

const models: PricingModel[] = [
  { id: 1, model_name: 'deepseek-chat', vendor_name: 'DeepSeek' },
  { id: 2, model_name: 'deepseek-reasoner', vendor_name: 'DeepSeek' },
  { id: 3, model_name: 'moonshot-v1', vendor_name: 'Moonshot' },
] as PricingModel[]

describe('vendor filter bar', () => {
  it('lists vendors that own models and hides the empty ones', () => {
    render(
      <VendorFilterBar
        vendors={vendors}
        models={models}
        selected={[]}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'DeepSeek' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Moonshot' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /Unused Vendor/ })
    ).not.toBeInTheDocument()
  })

  it('marks the all-vendors chip active only when nothing is selected', () => {
    const { rerender } = render(
      <VendorFilterBar
        vendors={vendors}
        models={models}
        selected={[]}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'All Vendors' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    rerender(
      <VendorFilterBar
        vendors={vendors}
        models={models}
        selected={['DeepSeek']}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'All Vendors' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByRole('button', { name: 'DeepSeek' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('reports toggles for several vendors and clears through the all chip', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(
      <VendorFilterBar
        vendors={vendors}
        models={models}
        selected={['DeepSeek', 'Moonshot']}
        onToggle={onToggle}
      />
    )
    await user.click(screen.getByRole('button', { name: 'DeepSeek' }))
    expect(onToggle).toHaveBeenLastCalledWith('DeepSeek')
    await user.click(screen.getByRole('button', { name: 'Moonshot' }))
    expect(onToggle).toHaveBeenLastCalledWith('Moonshot')
    await user.click(screen.getByRole('button', { name: 'All Vendors' }))
    expect(onToggle).toHaveBeenLastCalledWith(FILTER_ALL)
  })

  it('renders nothing when no vendor owns a model', () => {
    const { container } = render(
      <VendorFilterBar
        vendors={vendors}
        models={[]}
        selected={[]}
        onToggle={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
