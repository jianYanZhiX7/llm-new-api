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
import { useEffect, useState } from 'react'

const CHARACTER_INTERVAL_MS = 18
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type TypingState = {
  source: string
  length: number
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  )
}

export function useTypewriter(target: string): string {
  const [typing, setTyping] = useState<TypingState>(() => ({
    source: target,
    length: target.length,
  }))

  if (typing.source !== target) {
    setTyping({
      source: target,
      length: prefersReducedMotion() ? target.length : 0,
    })
  }

  useEffect(() => {
    if (typing.length >= typing.source.length) {
      return
    }

    const timer = window.setTimeout(() => {
      setTyping((current) =>
        current.source === typing.source
          ? { ...current, length: current.length + 1 }
          : current
      )
    }, CHARACTER_INTERVAL_MS)

    return () => window.clearTimeout(timer)
  }, [typing])

  return typing.source.slice(0, typing.length)
}
