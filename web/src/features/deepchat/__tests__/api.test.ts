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
  AxiosError,
  type AxiosHeaderValue,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/http-client'
import { useAuthStore, type AuthBundle } from '@/stores/auth-store'

import { fetchDeepChatDownloadUrl } from '../api'

const originalAdapter = api.defaults.adapter

// Access tokens live 15 minutes, so a visitor who idles on the marketing page
// always ends up clicking download with an expired token. The download must
// therefore keep the shared 401 refresh-and-replay, or the button is a dead end.
const expiredBundle: AuthBundle = {
  access_token: 'expired-access',
  token_type: 'Bearer',
  access_expires_at: 1,
  user: { id: 1, username: 'deepchat-downloader', role: 1 },
  session: {
    sid: 'deepchat-download-session',
    current: true,
    login_method: 'password',
    ip: '',
    user_agent: '',
    created_at: 1,
    last_active_at: 1,
    expires_at: 2_000_000_000,
  },
}

const SIGNED_URL =
  'https://tos.example.com/DeepChat-1.1.0-beta.11-windows-x64.exe'

function stubRefreshResponse(status: number, fresh: AuthBundle) {
  vi.spyOn(XMLHttpRequest.prototype, 'open')
  vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(
    function (this: XMLHttpRequest) {
      Object.defineProperties(this, {
        status: { value: status, configurable: true },
        statusText: { value: 'Refresh response', configurable: true },
        responseText: {
          value: JSON.stringify({ success: status === 200, data: fresh }),
          configurable: true,
        },
        readyState: { value: 4, configurable: true },
      })
      this.onloadend?.(new ProgressEvent('loadend'))
    }
  )
}

function tokenExpiredError(config: InternalAxiosRequestConfig) {
  return new AxiosError(
    'Request failed with status code 401',
    'ERR_BAD_REQUEST',
    config,
    undefined,
    {
      data: {
        success: false,
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Access token expired',
      },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
    }
  )
}

afterEach(() => {
  api.defaults.adapter = originalAdapter
  vi.restoreAllMocks()
  useAuthStore.getState().auth.reset()
  window.history.replaceState({}, '', '/')
})

it('refreshes an expired access token and replays the download request', async () => {
  useAuthStore.getState().auth.setBundle(expiredBundle)
  stubRefreshResponse(200, {
    ...expiredBundle,
    access_token: 'fresh-access',
    access_expires_at: 2_000_000_000,
  })
  const authorizations: Array<AxiosHeaderValue> = []
  api.defaults.adapter = async (config) => {
    authorizations.push(config.headers.get('Authorization'))
    if (authorizations.length === 1) throw tokenExpiredError(config)
    return {
      data: { success: true, url: SIGNED_URL },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  await expect(fetchDeepChatDownloadUrl('windows-x64')).resolves.toBe(
    SIGNED_URL
  )
  expect(authorizations).toEqual([
    'Bearer expired-access',
    'Bearer fresh-access',
  ])
  expect(useAuthStore.getState().auth.accessToken).toBe('fresh-access')
})

it('reports a terminal refresh failure instead of replaying the download', async () => {
  window.history.replaceState({}, '', '/sign-in')
  useAuthStore.getState().auth.setBundle(expiredBundle)
  stubRefreshResponse(401, expiredBundle)
  let attempts = 0
  api.defaults.adapter = async (config) => {
    attempts++
    throw tokenExpiredError(config)
  }

  await expect(fetchDeepChatDownloadUrl('windows-x64')).rejects.toBeTruthy()
  expect(attempts).toBe(1)
  expect(useAuthStore.getState().auth.accessToken).toBeNull()
})
