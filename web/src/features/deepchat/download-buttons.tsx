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
import { useNavigate } from '@tanstack/react-router'
import { useState, type ElementType } from 'react'
import { toast } from 'sonner'

import { IconApple, IconLinux, IconWindows } from '@/assets/brand-icons'
import { Button } from '@/components/ui/button'
import { getServerErrorMessage } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

import {
  deepChatDownloadStatusQueryOptions,
  fetchDeepChatDownloadUrl,
  type DeepChatDownloadPlatform,
} from './api'
import { detectDevicePlatform } from './device-label'

type PlatformDownload = {
  key: DeepChatDownloadPlatform
  name: string
  detail: string
  icon: ElementType
}

const PLATFORM_DOWNLOADS: PlatformDownload[] = [
  {
    key: 'windows-x64',
    name: 'Windows',
    detail: 'x64 · EXE',
    icon: IconWindows,
  },
  {
    key: 'mac-arm64',
    name: 'macOS',
    detail: 'Apple 芯片 · arm64 · DMG',
    icon: IconApple,
  },
  {
    key: 'linux-appimage',
    name: 'Linux',
    detail: 'x86_64 · AppImage',
    icon: IconLinux,
  },
]

// The Button `ghost` variant sets `hover:text-foreground`, which overrides this
// pill's `text-white` and makes the label and its `currentColor` icons vanish on
// hover in light mode. Re-assert the hover colour (and the dark-mode hover fill).
const BUTTON_CLASS =
  'inline-flex h-auto shrink-0 items-center gap-3 rounded-full bg-[#1d1d1f] py-2.5 pr-6 pl-5 text-white transition-all duration-200 hover:bg-black hover:text-white hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)] focus-visible:ring-3 focus-visible:ring-[#0071e3]/50 focus-visible:outline-none disabled:bg-[#86868b] disabled:opacity-100 dark:hover:bg-black dark:hover:text-white'

function downloadHint(options: {
  signedIn: boolean
  loading: boolean
  available: boolean
}): string | null {
  if (!options.signedIn) return '下载前请先登录'
  if (options.loading) return '正在获取下载信息…'
  if (!options.available) return '暂无可用版本'
  return null
}

export function DeepChatDownloadButtons() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.auth.user)
  const { data: status, isPending } = useQuery(
    deepChatDownloadStatusQueryOptions
  )
  const [pending, setPending] = useState<DeepChatDownloadPlatform | null>(null)
  const [devicePlatform] = useState(detectDevicePlatform)

  const signedIn = Boolean(user)
  const available = Boolean(status?.available)
  const hint = downloadHint({ signedIn, loading: isPending, available })

  const handleDownload = async (platform: DeepChatDownloadPlatform) => {
    if (pending) return
    if (!signedIn) {
      void navigate({
        to: '/sign-in',
        search: { redirect: window.location.href },
      })
      return
    }
    // Open the tab synchronously: a window opened after `await` is popup-blocked.
    const tab = window.open('', '_blank')
    setPending(platform)
    try {
      const url = await fetchDeepChatDownloadUrl(platform)
      if (tab) {
        tab.location.href = url
      } else {
        window.location.href = url
      }
    } catch (error) {
      tab?.close()
      toast.error(getServerErrorMessage(error, '下载地址获取失败，请稍后重试'))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className='mt-8 sm:mt-10'>
      <div className='flex flex-wrap items-start justify-center gap-3'>
        {PLATFORM_DOWNLOADS.map((item) => (
          <div key={item.key} className='flex flex-col items-center gap-2'>
            <Button
              variant='ghost'
              disabled={signedIn && !available}
              onClick={() => void handleDownload(item.key)}
              className={`${BUTTON_CLASS} disabled:cursor-not-allowed`}
            >
              <item.icon className='h-5 w-5 shrink-0' />
              <span className='flex flex-col items-start leading-tight'>
                <span className='text-[15px] font-medium'>
                  {item.name}
                  {pending === item.key ? ' · 准备中…' : ''}
                </span>
                <span className='text-[11px] text-white/55'>{item.detail}</span>
              </span>
            </Button>
            {item.key === devicePlatform ? (
              <span className='text-[12px] tracking-[-0.01em] text-[#6e6e73]'>
                当前设备
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {hint ? (
        <p className='mt-4 text-[13px] tracking-[-0.01em] text-[#6e6e73]'>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
