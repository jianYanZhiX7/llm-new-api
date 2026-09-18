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
import { type SVGProps } from 'react'

import { cn } from '@/lib/utils'

export function IconDeepChat({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      role='img'
      viewBox='180 270 680 410'
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      className={cn('shrink-0', className)}
      fill='none'
      {...props}
    >
      <title>DeepChat</title>
      <path
        d='M812.04 292.891C812.04 292.891 764.965 420.337 687.745 514.062C703.947 519.618 722.507 528.316 743.993 540.721C792.58 568.772 814.746 581.57 824 586.913C823.881 587.012 764.522 636.147 712.037 643.399C665.381 649.846 609.065 621.067 577.41 603.209C465.257 656.673 311.231 656.675 238.522 656.675C199.569 656.675 199.568 656.675 199.568 623.169C199.568 432.837 209.157 292.891 568.729 292.891H812.04Z'
        fill='#006EDC'
      />
      <path
        d='M354.799 450.491C386.212 450.491 411.677 475.956 411.677 507.369C411.677 538.782 386.212 564.248 354.799 564.248C337.255 564.248 321.566 556.304 311.133 543.817C314.464 544.774 317.982 545.288 321.62 545.288C342.562 545.288 359.539 528.311 359.539 507.369C359.539 486.427 342.562 469.45 321.62 469.45C317.982 469.45 314.464 469.964 311.134 470.92C321.567 458.434 337.255 450.491 354.799 450.491Z'
        fill='#FFFFFF'
      />
    </svg>
  )
}
