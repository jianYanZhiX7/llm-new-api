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
import { afterEach, describe, expect, test } from 'vitest'

import { detectDevicePlatform, devicePlatformFromSignal } from '../device-label'

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

afterEach(() => {
  stubNavigator(originalPlatform, originalUserAgent)
})

describe('deepchat device platform detection', () => {
  test.each([
    ['Windows', 'windows-x64'],
    ['win32 Windows NT 10.0', 'windows-x64'],
    ['macOS', 'mac-arm64'],
    ['MacIntel Macintosh; Intel Mac OS X 10_15_7', 'mac-arm64'],
    ['Linux x86_64', 'linux-appimage'],
    ['Linux armv8l', 'linux-appimage'],
    ['X11 Linux', 'linux-appimage'],
    ['unknown', null],
    ['', null],
  ])('maps signal %j to %j', (signal, expected) => {
    expect(devicePlatformFromSignal(signal)).toBe(expected)
  })

  test.each([
    ['iPhone iOS', 'phone'],
    ['iPad iOS', 'tablet'],
    ['Android 13', 'android'],
  ])('maps the non-desktop signal %j (%s) to no download', (signal) => {
    expect(devicePlatformFromSignal(signal)).toBeNull()
  })

  test('prefers the mobile verdict when a signal also names a desktop platform', () => {
    expect(devicePlatformFromSignal('iPad MacIntel Mac OS X')).toBeNull()
  })

  test('normalises mixed-case navigator signals', () => {
    expect(devicePlatformFromSignal('WINDOWS Win64')).toBe('windows-x64')
  })

  test('reads the platform from the browser navigator signals', () => {
    stubNavigator('Win32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    expect(detectDevicePlatform()).toBe('windows-x64')
  })
})
