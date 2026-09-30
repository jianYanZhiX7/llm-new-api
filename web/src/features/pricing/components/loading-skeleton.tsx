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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { VIEW_MODES, type ViewMode } from '../constants'

export interface LoadingSkeletonProps {
  viewMode?: ViewMode
}

export function LoadingSkeleton(props: LoadingSkeletonProps) {
  return (
    <div aria-busy='true'>
      <div className='mb-5 flex flex-col items-center pt-5 sm:mb-8 sm:pt-10'>
        <Skeleton className='h-[clamp(2.3rem,6.325vw,4.025rem)] w-48 max-w-full sm:w-64' />
        <div className='mt-4 flex flex-wrap justify-center gap-2 sm:mt-6'>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className='h-8 w-24 rounded-full' />
          ))}
        </div>
        <Skeleton className='mt-2 h-9 w-48 max-w-full sm:mt-3' />
      </div>
      <div className='flex min-w-0 flex-col gap-4'>
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3'>
          <div className='flex min-w-0 flex-1 items-center gap-2'>
            <Skeleton className='h-10 w-20 shrink-0' />
            <Skeleton className='h-10 w-full max-w-md' />
          </div>
          <div className='flex flex-wrap gap-2'>
            <Skeleton className='h-7 w-32' />
            <Skeleton className='h-7 w-20' />
            <Skeleton className='h-7 w-24' />
          </div>
        </div>
        {props.viewMode === VIEW_MODES.TABLE ? (
          <div className='overflow-hidden rounded-xl border'>
            {Array.from({ length: 10 }, (_, index) => (
              <div
                key={index}
                className='flex gap-4 border-b p-4 last:border-0'
              >
                <Skeleton className='h-5 w-40 max-w-full' />
                <Skeleton className='h-5 flex-1' />
                <Skeleton className='h-5 w-20' />
              </div>
            ))}
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {Array.from({ length: 6 }, (_, index) => (
              <Card key={index} className='gap-3'>
                <CardHeader className='flex flex-row gap-3'>
                  <Skeleton className='size-10 shrink-0' />
                  <div className='flex min-w-0 flex-1 flex-col gap-2'>
                    <Skeleton className='h-5 w-40 max-w-full' />
                    <Skeleton className='h-3 w-20' />
                  </div>
                  <Skeleton className='size-7 shrink-0' />
                </CardHeader>
                <CardContent className='flex flex-1 flex-col gap-3'>
                  <div className='flex flex-col gap-2'>
                    <Skeleton className='h-3.5 w-full' />
                    <Skeleton className='h-3.5 w-4/5' />
                  </div>
                  <div className='mt-auto flex flex-col gap-1.5'>
                    <Skeleton className='h-4 w-16' />
                    <div className='grid grid-cols-3 gap-3'>
                      <Skeleton className='h-10' />
                      <Skeleton className='h-10' />
                      <Skeleton className='h-10' />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
