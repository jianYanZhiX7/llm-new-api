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
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { OverviewDashboard } from '../overview-dashboard'

const SUMMARY_BALANCE = 1000000

let client: QueryClient
let statusPayload: Record<string, unknown>
let uptimePayload: unknown[]
let uptimeRequests: number

const UPTIME_MONITOR = [
  {
    categoryName: 'Core',
    monitors: [{ name: 'Gateway', status: 1, uptime: 0.99 }],
  },
]

beforeEach(() => {
  window.localStorage.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'dashboard-user',
    role: 1,
    quota: SUMMARY_BALANCE,
    used_quota: 1000,
    request_count: 1,
  })
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  statusPayload = {
    api_info_enabled: false,
    announcements_enabled: false,
    faq_enabled: false,
    uptime_kuma_enabled: false,
  }
  uptimePayload = []
  uptimeRequests = 0
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    switch (url) {
      case '/api/token/?p=1&size=10':
        return {
          data: {
            success: true,
            data: {
              items: [{ id: 1, name: 'App key', key: 'masked', status: 1 }],
            },
          },
        }
      case '/api/status':
        return { data: { data: statusPayload } }
      case '/api/uptime/status':
        uptimeRequests += 1
        return { data: { success: true, data: uptimePayload } }
      case '/api/user/models':
        return { data: { success: true, data: ['gpt-4o-mini'] } }
      case '/api/data/self':
        return { data: { success: true, data: [] } }
      default:
        throw new Error(`Unexpected dashboard request: ${url}`)
    }
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  window.localStorage.clear()
})

async function renderOverview() {
  const router = createRouter({
    routeTree: createRootRoute({ component: OverviewDashboard }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('overview content panels', () => {
  it('hides every enabled panel that carries no data', async () => {
    statusPayload = {
      api_info_enabled: true,
      api_info: [],
      announcements_enabled: true,
      announcements: [],
      faq_enabled: true,
      faq: [],
      uptime_kuma_enabled: true,
    }
    await renderOverview()

    await waitFor(() => expect(uptimeRequests).toBeGreaterThan(0))

    for (const title of ['API Info', 'Announcements', 'FAQ', 'Uptime']) {
      expect(screen.queryByText(title)).not.toBeInTheDocument()
    }
  })

  it('renders only the enabled panels that carry data', async () => {
    statusPayload = {
      api_info_enabled: true,
      api_info: [],
      announcements_enabled: true,
      announcements: [
        {
          id: 1,
          content: 'Scheduled maintenance',
          type: 'info',
          publishDate: '2026-01-01T00:00:00Z',
        },
      ],
      faq_enabled: true,
      faq: [],
      uptime_kuma_enabled: true,
    }
    uptimePayload = []
    await renderOverview()

    expect(await screen.findByText('Announcements')).toBeVisible()
    expect(screen.getByText('Scheduled maintenance')).toBeVisible()
    expect(screen.queryByText('API Info')).not.toBeInTheDocument()
    expect(screen.queryByText('FAQ')).not.toBeInTheDocument()
    expect(screen.queryByText('Uptime')).not.toBeInTheDocument()
  })

  it('renders the uptime panel when monitors are configured', async () => {
    statusPayload = {
      api_info_enabled: false,
      announcements_enabled: false,
      faq_enabled: false,
      uptime_kuma_enabled: true,
    }
    uptimePayload = UPTIME_MONITOR
    await renderOverview()

    expect(await screen.findByText('Uptime')).toBeVisible()
    expect(screen.getByText('Gateway')).toBeVisible()
  })
})
