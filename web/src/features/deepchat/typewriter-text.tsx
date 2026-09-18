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
import { Fragment, useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

import './typewriter-text.css'

const MIN_STEP = 1
const MAX_STEP = 3
const TICK_MS = 500
const HOLD_MS = 5000
const FADE_MS = 320
const CHAR_STAGGER_MS = 45

type Phase = 'typing' | 'holding' | 'leaving'

interface TypewriterTextProps {
  texts: readonly string[]
  className?: string
}

export function TypewriterText({ texts, className }: TypewriterTextProps) {
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const [sloganIndex, setSloganIndex] = useState(0)
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing')

  const safeIndex = texts.length > 0 ? sloganIndex % texts.length : 0
  const text = texts[safeIndex] ?? ''
  const chars = useMemo(
    () =>
      [...text].map((char, position) => ({
        char,
        id: `${safeIndex}:${position}`,
      })),
    [text, safeIndex]
  )

  useEffect(() => {
    if (texts.length === 0) return

    if (reducedMotion) {
      setCount(text.length)
      return
    }

    if (phase === 'typing') {
      if (count >= text.length) {
        setPhase('holding')
        return
      }

      const delay = count === 0 ? 0 : TICK_MS
      const timer = window.setTimeout(() => {
        const upper = Math.min(MAX_STEP, text.length - count)
        const step = MIN_STEP + Math.floor(Math.random() * (upper - MIN_STEP + 1))
        setCount((current) => Math.min(current + step, text.length))
      }, delay)

      return () => window.clearTimeout(timer)
    }

    if (phase === 'holding') {
      const timer = window.setTimeout(() => setPhase('leaving'), HOLD_MS)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      setCount(0)
      setSloganIndex((current) => (current + 1) % texts.length)
      setPhase('typing')
    }, FADE_MS)

    return () => window.clearTimeout(timer)
  }, [phase, count, text, texts.length, reducedMotion])

  return (
    <span
      className={cn('deepchat-typewriter', className)}
      data-leaving={phase === 'leaving' ? '' : undefined}
    >
      <span aria-hidden='true'>
        {chars.map(({ char, id }, index) => (
          <Fragment key={id}>
            {index === count ? (
              <span aria-hidden='true' className='deepchat-typewriter__cursor' />
            ) : null}
            <span
              className='deepchat-typewriter__char'
              data-revealed={index < count ? '' : undefined}
              style={{
                transitionDelay: `${(index % MAX_STEP) * CHAR_STAGGER_MS}ms`,
              }}
            >
              {char}
            </span>
          </Fragment>
        ))}
        {count >= chars.length ? (
          <span aria-hidden='true' className='deepchat-typewriter__cursor' />
        ) : null}
      </span>
      <span className='sr-only'>{text}</span>
    </span>
  )
}