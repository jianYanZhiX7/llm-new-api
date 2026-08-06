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
import i18next from 'i18next'
import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'

import { requestAlipayDirectPayment, queryAlipayDirectPayment, isApiSuccess } from '../api'

function getPayUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null
  }
  if ('pay_url' in data && typeof data.pay_url === 'string') {
    return data.pay_url
  }
  return null
}

function getOrderId(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null
  }
  if ('order_id' in data && typeof data.order_id === 'string') {
    return data.order_id
  }
  return null
}

/**
 * Reject non-navigable schemes (e.g. javascript:, data:) and relative URLs.
 * Only http/https are allowed for backend-provided redirect targets.
 */
function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }
  try {
    const u = new URL(trimmed)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function getErrorMessage(message: string | undefined, data: unknown): string {
  if (typeof data === 'string' && data.trim()) {
    return data
  }
  return message || i18next.t('Payment request failed')
}

const POLL_INTERVAL = 3000 // 3 seconds
const POLL_TIMEOUT = 5 * 60 * 1000 // 5 minutes

/**
 * Hook for direct Alipay (PC website pay) flow.
 *
 * Backend returns a complete pay_url (with query string); we open it in a
 * new tab via window.open, matching the Stripe payment flow.
 *
 * After redirecting, the hook polls the query endpoint as a fallback for
 * the async notification, ensuring the UI reflects payment completion even
 * if the webhook is delayed.
 */
export function useAlipayDirectPayment(onSuccess?: () => void) {
  const [processing, setProcessing] = useState(false)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStartRef = useRef<number>(0)
  const onSuccessRef = useRef(onSuccess)

  useEffect(() => {
    onSuccessRef.current = onSuccess
  })

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  const startPolling = useCallback((tradeNo: string) => {
    stopPolling()
    pollStartRef.current = Date.now()

    pollTimerRef.current = setInterval(async () => {
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT) {
        stopPolling()
        return
      }

      try {
        const response = await queryAlipayDirectPayment(tradeNo)
        if (response.message === 'success' && response.data?.status === 'success') {
          stopPolling()
          toast.success(i18next.t('Payment successful'))
          onSuccessRef.current?.()
        }
      } catch {
        // Silently ignore polling errors; the interval will retry
      }
    }, POLL_INTERVAL)
  }, [stopPolling])

  const processAlipayDirectPayment = useCallback(
    async (topupAmount: number) => {
      setProcessing(true)

      try {
        const response = await requestAlipayDirectPayment({
          amount: Math.floor(topupAmount),
        })

        if (isApiSuccess(response)) {
          const payUrl = getPayUrl(response.data)
          if (payUrl) {
            if (!isSafeHttpUrl(payUrl)) {
              toast.error(i18next.t('Invalid payment redirect URL'))
              return false
            }
            toast.success(i18next.t('Redirecting to payment page...'))
            window.open(payUrl, '_blank')

            // Start polling for payment completion as fallback
            const orderId = getOrderId(response.data)
            if (orderId) {
              startPolling(orderId)
            }

            return true
          }
        }

        toast.error(getErrorMessage(response.message, response.data))
        return false
      } catch {
        toast.error(i18next.t('Payment request failed'))
        return false
      } finally {
        setProcessing(false)
      }
    },
    [startPolling]
  )

  return { processing, processAlipayDirectPayment }
}
