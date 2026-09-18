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
import { cn } from '@/lib/utils'

import {
  IconDeepChatCodeExpert,
  IconDeepChatDataAnalyst,
  IconDeepChatWritingAssistant,
} from './deepchat-agent-presets'
import { IconDeepChat } from './icon-deepchat'

import './deepchat-nav-icon.css'

const carouselIcons = [
  { id: 'logo', Icon: IconDeepChat },
  { id: 'code-expert', Icon: IconDeepChatCodeExpert },
  { id: 'data-analyst', Icon: IconDeepChatDataAnalyst },
  { id: 'writing-assistant', Icon: IconDeepChatWritingAssistant },
]

const seamlessIcons = [
  ...carouselIcons,
  { ...carouselIcons[0], id: `${carouselIcons[0].id}-loop` },
]

export function DeepChatNavIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden='true'
      className={cn('deepchat-nav-icon block size-4', className)}
    >
      <span className='deepchat-nav-icon__track'>
        {seamlessIcons.map(({ id, Icon }) => (
          <span className='deepchat-nav-icon__item' key={id}>
            <Icon className='size-full' />
          </span>
        ))}
      </span>
    </span>
  )
}
