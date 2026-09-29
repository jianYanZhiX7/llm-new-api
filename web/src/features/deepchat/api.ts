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
import { queryOptions } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

export type DeepChatDownloadPlatform =
  | 'windows-x64'
  | 'mac-arm64'
  | 'linux-appimage'

export type DeepChatDownloadStatus = {
  success: boolean
  available: boolean
  version: string
}

type DeepChatDownloadResponse = {
  success: boolean
  url?: string
}

export async function getDeepChatDownloadStatus(): Promise<DeepChatDownloadStatus> {
  const res = await api.get('/api/deepchat/download/status', {
    skipErrorHandler: true,
  })
  return requireServerSuccess(res.data)
}

export const deepChatDownloadStatusQueryOptions = queryOptions({
  queryKey: ['deepchat', 'download-status'],
  queryFn: getDeepChatDownloadStatus,
  staleTime: 5 * 60 * 1000,
  retry: false,
  meta: { errorToast: false },
})

export async function fetchDeepChatDownloadUrl(
  platform: DeepChatDownloadPlatform
): Promise<string> {
  const res = await api.get('/api/deepchat/download', {
    params: { platform },
    // Only the shared error handler is suppressed, so a failure surfaces on the
    // marketing page instead of being replaced by the sign-in route. Access
    // tokens live 15 minutes, so the transparent refresh on 401 must stay
    // enabled: without it a visitor who idled on the page can never download.
    skipErrorHandler: true,
  })
  const data: DeepChatDownloadResponse = requireServerSuccess(res.data)
  if (!data.url) {
    throw new Error('The server did not return a download URL')
  }
  return data.url
}
