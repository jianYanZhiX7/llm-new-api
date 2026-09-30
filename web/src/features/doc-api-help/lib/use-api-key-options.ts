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
import { useCallback, useMemo, useState } from 'react'

import { fetchTokenKey, getApiKeys } from '@/features/keys/api'
import { API_KEY_STATUS } from '@/features/keys/constants'
import { useAuthStore } from '@/stores/auth-store'

import type { ApiKeySelection, SelectionStatus } from '../types'
import { API_KEY_PLACEHOLDER } from './samples'
import { resolveSelectionStatus } from './selection-status'

const KEY_PAGE_SIZE = 100

const toFullApiKey = (key: string) =>
  key.startsWith('sk-') ? key : `sk-${key}`

export function useApiKeySelection(): ApiKeySelection {
  const userId = useAuthStore((state) => state.auth.user?.id)
  const [value, setValue] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState(API_KEY_PLACEHOLDER)
  const [pending, setPending] = useState(false)

  const query = useQuery({
    queryKey: ['doc-api-help-keys', userId],
    queryFn: async () => {
      const result = await getApiKeys({ p: 1, size: KEY_PAGE_SIZE })
      return result.data?.items ?? []
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  })

  const options = useMemo(
    () =>
      (query.data ?? [])
        .filter((item) => item.status === API_KEY_STATUS.ENABLED)
        .map((item) => ({
          value: String(item.id),
          label: item.name || `#${item.id}`,
          description: toFullApiKey(item.key),
        })),
    [query.data]
  )

  const select = useCallback(async (id: string) => {
    setValue(id)
    setPending(true)
    try {
      const result = await fetchTokenKey(Number(id))
      const key = result.success ? result.data?.key : undefined
      setApiKey(key ? toFullApiKey(key) : API_KEY_PLACEHOLDER)
    } catch {
      setApiKey(API_KEY_PLACEHOLDER)
    } finally {
      setPending(false)
    }
  }, [])

  const status: SelectionStatus = !userId
    ? 'anonymous'
    : resolveSelectionStatus({
        isPending: query.isPending,
        isError: query.isError,
        count: options.length,
      })

  return {
    options,
    value,
    apiKey: userId ? apiKey : API_KEY_PLACEHOLDER,
    pending,
    status,
    select,
  }
}
