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
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { type ProtocolId, SCROLL_ANCHOR_CLASS } from '../lib/sections'

const LAYER_BASE_CLASS =
  'col-start-1 row-start-1 transition-[opacity,translate,scale] duration-300 ease-out motion-reduce:transition-none'

const LAYER_ACTIVE_CLASS = 'z-20 scale-100 opacity-100'

const LAYER_INACTIVE_CLASS =
  'pointer-events-none z-10 scale-[0.97] translate-y-2 opacity-0'

type ProtocolLayer = {
  id: ProtocolId
  content: ReactNode
}

type ProtocolDeckProps = {
  id: string
  active: ProtocolId
  layers: ProtocolLayer[]
}

export function ProtocolDeck({ id, active, layers }: ProtocolDeckProps) {
  return (
    <div id={id} className={cn('grid', SCROLL_ANCHOR_CLASS)}>
      {layers.map((layer) => {
        const isActive = layer.id === active

        return (
          <div
            key={layer.id}
            aria-hidden={!isActive}
            inert={!isActive}
            className={cn(
              LAYER_BASE_CLASS,
              isActive ? LAYER_ACTIVE_CLASS : LAYER_INACTIVE_CLASS
            )}
          >
            {layer.content}
          </div>
        )
      })}
    </div>
  )
}
