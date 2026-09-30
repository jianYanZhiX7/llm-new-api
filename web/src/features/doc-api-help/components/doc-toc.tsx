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
import { DOC_SECTIONS } from '../lib/sections'

export function DocToc() {
  return (
    <nav className='flex flex-col gap-0.5'>
      <span className='text-muted-foreground mb-1 px-2 text-xs font-medium'>
        目录
      </span>
      {DOC_SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className='text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md px-2 py-1.5 text-sm leading-snug transition-colors'
        >
          {section.label}
        </a>
      ))}
    </nav>
  )
}
