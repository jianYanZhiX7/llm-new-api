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
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { PAYMENT_TYPES } from '../constants'
import {
  dispatchSelectedPayment,
  isAlipayDirectPayment,
  isStripePayment,
  isWaffoPayment,
  isWaffoPancakePayment,
} from './payment'

describe('payment type classification', () => {
  test('keeps Waffo and Waffo Pancake on their dedicated flows', () => {
    assert.equal(isWaffoPayment(PAYMENT_TYPES.WAFFO), true)
    assert.equal(isWaffoPayment(PAYMENT_TYPES.WAFFO_PANCAKE), false)
    assert.equal(isWaffoPancakePayment(PAYMENT_TYPES.WAFFO_PANCAKE), true)
    assert.equal(isWaffoPancakePayment(PAYMENT_TYPES.WAFFO), false)
    assert.equal(isStripePayment(PAYMENT_TYPES.STRIPE), true)
    assert.equal(isAlipayDirectPayment(PAYMENT_TYPES.ALIPAY_DIRECT), true)
    assert.equal(isAlipayDirectPayment(PAYMENT_TYPES.ALIPAY), false)
  })
})

describe('payment dispatch', () => {
  test('keeps the selected Waffo method index through confirmation', async () => {
    const calls: string[] = []
    const success = await dispatchSelectedPayment(
      { name: 'Waffo Card', type: PAYMENT_TYPES.WAFFO },
      120,
      3,
      {
        regular: async () => {
          calls.push('regular')
          return false
        },
        waffo: async (amount, index) => {
          calls.push(`waffo:${amount}:${index}`)
          return true
        },
        waffoPancake: async () => {
          calls.push('pancake')
          return false
        },
        alipayDirect: async () => {
          calls.push('alipayDirect')
          return false
        },
      }
    )

    assert.equal(success, true)
    assert.deepEqual(calls, ['waffo:120:3'])
  })

  test('does not create a Waffo order without a selected method index', async () => {
    let called = false
    const success = await dispatchSelectedPayment(
      { name: 'Waffo Card', type: PAYMENT_TYPES.WAFFO },
      120,
      null,
      {
        regular: async () => false,
        waffo: async () => {
          called = true
          return true
        },
        waffoPancake: async () => false,
        alipayDirect: async () => false,
      }
    )

    assert.equal(success, false)
    assert.equal(called, false)
  })

  test('routes direct Alipay to its dedicated processor', async () => {
    const calls: string[] = []
    const success = await dispatchSelectedPayment(
      { name: 'Alipay (Direct)', type: PAYMENT_TYPES.ALIPAY_DIRECT },
      50,
      null,
      {
        regular: async () => {
          calls.push('regular')
          return false
        },
        waffo: async () => {
          calls.push('waffo')
          return false
        },
        waffoPancake: async () => {
          calls.push('pancake')
          return false
        },
        alipayDirect: async (amount) => {
          calls.push(`alipayDirect:${amount}`)
          return true
        },
      }
    )

    assert.equal(success, true)
    assert.deepEqual(calls, ['alipayDirect:50'])
  })
})
