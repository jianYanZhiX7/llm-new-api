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
import { ArrowRight, Check, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'

const ENDPOINTS = [
  { label: 'OpenAI Compatible', url: 'https://www.aigotoken.com/v1' },
  { label: 'Anthropic Compatible', url: 'https://www.aigotoken.com' },
] as const

type ApiEndpointsHintProps = {
  className?: string
}

export function ApiEndpointsHint({ className }: ApiEndpointsHintProps) {
  const { t } = useTranslation()
  const { copiedText, copyToClipboard } = useCopyToClipboard()

  return (
    <div
      className={cn(
        'border-border/60 bg-muted/40 flex flex-col gap-2 rounded-xl border px-3 py-2 text-xs sm:flex-row sm:items-center sm:gap-6 sm:text-sm',
        className
      )}
    >
      <div className='flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-6'>
        {ENDPOINTS.map((endpoint) => {
          const copied = copiedText === endpoint.url
          return (
            <div
              key={endpoint.url}
              className='flex min-w-0 items-center gap-1.5'
            >
              <span className='text-muted-foreground shrink-0'>
                {t(endpoint.label)}:
              </span>
              <button
                type='button'
                onClick={() => copyToClipboard(endpoint.url)}
                title={t('Click to copy')}
                className='text-foreground hover:text-primary flex min-w-0 cursor-copy items-center gap-1 font-mono transition-colors'
              >
                <span className='truncate'>{endpoint.url}</span>
                {copied ? (
                  <Check className='size-3.5 shrink-0' />
                ) : (
                  <Copy className='size-3.5 shrink-0 opacity-60' />
                )}
              </button>
            </div>
          )
        })}
      </div>

      <Button
        variant='default'
        size='sm'
        className='min-w-32 shrink-0 self-start px-6 sm:self-auto'
        render={<Link to='/pricing' />}
      >
        {t('Model Square')}
        <ArrowRight className='size-3.5' data-icon='inline-end' />
      </Button>
    </div>
  )
}
