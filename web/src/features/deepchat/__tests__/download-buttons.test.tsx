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
import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { DeepChatDownloadButtons } from '../download-buttons'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  status: { available: true, version: '1.1.0-beta.11' },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('../api', () => ({
  deepChatDownloadStatusQueryOptions: {
    queryKey: ['deepchat', 'download-status'],
    queryFn: async () => ({ success: true, ...mocks.status }),
  },
  fetchDeepChatDownloadUrl: vi.fn(),
}))

const WINDOWS = {
  platform: 'Win32',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
}

const originalPlatform = navigator.platform
const originalUserAgent = navigator.userAgent

function stubNavigator(platform: string, userAgent: string) {
  Object.defineProperty(navigator, 'platform', {
    configurable: true,
    value: platform,
  })
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })
}

function signIn() {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'tester', role: 1 })
}

function renderButtons() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <DeepChatDownloadButtons />
    </QueryClientProvider>
  )
}

afterEach(() => {
  useAuthStore.getState().auth.setUser(null)
  mocks.status.available = true
  stubNavigator(originalPlatform, originalUserAgent)
})

describe('deepchat download buttons', () => {
  test.each([
    {
      label: 'Windows',
      platform: 'Win32',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      name: /Windows/,
    },
    {
      label: 'macOS',
      platform: 'MacIntel',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      name: /macOS/,
    },
    {
      label: 'Linux',
      platform: 'Linux x86_64',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      name: /Linux/,
    },
  ])(
    'marks the $label download as the current device',
    async ({ platform, userAgent, name }) => {
      stubNavigator(platform, userAgent)
      renderButtons()

      const button = await screen.findByRole('button', { name })
      expect(
        within(button.parentElement as HTMLElement).getByText('当前设备')
      ).toBeInTheDocument()
      expect(screen.getAllByText('当前设备')).toHaveLength(1)
    }
  )

  test('marks no download when the device is not a supported desktop platform', async () => {
    stubNavigator(
      'iPhone',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    )
    renderButtons()

    await screen.findByRole('button', { name: /Windows/ })
    expect(screen.queryByText('当前设备')).toBeNull()
  })

  test('shows the sign-in hint for guests and never renders the release version', async () => {
    stubNavigator(WINDOWS.platform, WINDOWS.userAgent)
    renderButtons()

    expect(await screen.findByText('下载前请先登录')).toBeInTheDocument()
    expect(screen.queryByText(/1\.1\.0-beta\.11/)).not.toBeInTheDocument()
  })

  test('hides the hint and enables every download for a signed-in user with an available release', async () => {
    stubNavigator(WINDOWS.platform, WINDOWS.userAgent)
    signIn()
    renderButtons()

    await waitFor(() => {
      expect(screen.queryByText('正在获取下载信息…')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('下载前请先登录')).not.toBeInTheDocument()
    expect(screen.queryByText('暂无可用版本')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Windows/ })).toBeEnabled()
  })

  test('disables the downloads and reports the missing release when the version is unavailable', async () => {
    stubNavigator(WINDOWS.platform, WINDOWS.userAgent)
    mocks.status.available = false
    signIn()
    renderButtons()

    expect(await screen.findByText('暂无可用版本')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Windows/ })).toBeDisabled()
  })

  test('keeps the pill label and icons white on hover instead of the ghost foreground', async () => {
    stubNavigator(WINDOWS.platform, WINDOWS.userAgent)
    signIn()
    renderButtons()

    const button = await screen.findByRole('button', { name: /Windows/ })
    expect(button.className).toContain('hover:text-white')
    expect(button.className).not.toContain('hover:text-foreground')
  })
})
