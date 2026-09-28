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
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DesktopAgentButtonProps = {
  className?: string
}

export function DesktopAgentButton({ className }: DesktopAgentButtonProps) {
  return (
    <Button
      variant='ghost'
      className={cn(
        'group h-9 rounded-full px-4 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground',
        className
      )}
      render={<Link to='/deepchat' />}
    >
      桌面端Agent智能体
      <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
    </Button>
  )
}
