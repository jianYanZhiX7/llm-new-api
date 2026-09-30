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
export const DOC_SECTION_IDS = {
  quickStart: 'quick-start',
  openai: 'openai',
  anthropic: 'anthropic',
} as const

export const QUICK_START_STEP_IDS = {
  baseUrl: 'step-base-url',
  apiKey: 'step-api-key',
  model: 'step-model',
} as const

export const DOC_SECTIONS = [
  { id: DOC_SECTION_IDS.openai, label: 'OpenAI 兼容接口' },
  { id: DOC_SECTION_IDS.anthropic, label: 'Anthropic 兼容接口' },
] as const

export const SCROLL_ANCHOR_CLASS = 'scroll-mt-24'
