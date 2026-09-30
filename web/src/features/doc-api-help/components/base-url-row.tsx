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
import { CopyButton } from '@/components/copy-button'

type BaseUrlRowProps = {
  label: string
  value: string
}

export function BaseUrlRow({ label, value }: BaseUrlRowProps) {
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <span className='text-muted-foreground shrink-0 text-xs'>{label}</span>
      <div className='bg-muted/40 flex min-w-0 items-center gap-1 rounded-md border py-0.5 pr-0.5 pl-2'>
        <code
          title={value}
          className='min-w-0 flex-1 truncate font-mono text-[11px]'
        >
          {value}
        </code>
        <CopyButton value={value} className='size-7' iconClassName='size-3.5' />
      </div>
    </div>
  )
}
