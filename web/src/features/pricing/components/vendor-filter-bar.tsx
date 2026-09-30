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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { FILTER_ALL } from '../constants'
import type { PricingModel, PricingVendor } from '../types'

export interface VendorFilterBarProps {
  vendors: PricingVendor[]
  models: PricingModel[]
  selected: string[]
  onToggle: (vendor: string) => void
  className?: string
}

function countModelsByVendor(models: PricingModel[], vendor: string): number {
  return models.reduce(
    (count, model) => count + (model.vendor_name === vendor ? 1 : 0),
    0
  )
}

export function VendorFilterBar(props: VendorFilterBarProps) {
  const { t } = useTranslation()

  const options = props.vendors
    .map((vendor) => ({
      name: vendor.name,
      icon: vendor.icon,
      count: countModelsByVendor(props.models, vendor.name),
    }))
    .filter((vendor) => vendor.count > 0)

  if (options.length === 0) return null

  return (
    <div
      role='group'
      aria-label={t('All Vendors')}
      className={cn(
        'flex flex-wrap items-center justify-center gap-2',
        props.className
      )}
    >
      <Button
        type='button'
        variant={props.selected.length === 0 ? 'secondary' : 'outline'}
        size='sm'
        aria-pressed={props.selected.length === 0}
        onClick={() => props.onToggle(FILTER_ALL)}
        className='h-8 gap-1.5 rounded-full px-3 text-xs'
      >
        {t('All Vendors')}
      </Button>
      {options.map((option) => {
        const active = props.selected.includes(option.name)
        return (
          <Button
            key={option.name}
            type='button'
            variant={active ? 'secondary' : 'outline'}
            size='sm'
            aria-pressed={active}
            title={option.name}
            onClick={() => props.onToggle(option.name)}
            className='h-8 max-w-full gap-1.5 rounded-full px-3 text-xs'
          >
            {option.icon && (
              <span className='shrink-0'>{getLobeIcon(option.icon, 16)}</span>
            )}
            <span className='truncate'>{option.name}</span>
          </Button>
        )
      })}
    </div>
  )
}
