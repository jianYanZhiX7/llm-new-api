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
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { getPricing } from '@/features/pricing/api'

import type { ModelSelection, SelectionStatus } from '../types'
import { MODEL_PLACEHOLDER } from './samples'
import { resolveSelectionStatus } from './selection-status'

export function useModelSelection(): ModelSelection {
  const [value, setValue] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['doc-api-help-models'],
    queryFn: getPricing,
    staleTime: 5 * 60 * 1000,
  })

  const options = useMemo(
    () =>
      (query.data?.data ?? []).map((item) => ({
        value: item.model_name,
        label: item.model_name,
      })),
    [query.data]
  )

  const status: SelectionStatus = resolveSelectionStatus({
    isPending: query.isPending,
    isError: query.isError,
    count: options.length,
  })

  return {
    options,
    value,
    model: value ?? MODEL_PLACEHOLDER,
    status,
    pending: false,
    select: setValue,
  }
}
