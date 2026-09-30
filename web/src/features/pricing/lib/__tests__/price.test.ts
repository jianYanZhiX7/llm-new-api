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
import { describe, expect, test } from 'vitest'

import { formatCompactPrice } from '../price'

describe('formatCompactPrice', () => {
  test.each([
    ['¥6.57', '¥6'],
    ['¥2.628', '¥2'],
    ['¥13.14', '¥13'],
    ['¥19.71', '¥19'],
    ['¥1.971', '¥1'],
    ['¥49.275', '¥49'],
    ['6.57', '6'],
    ['29.2', '29'],
  ])(
    'floors %s down to whole units instead of rounding up',
    (input, expected) => {
      expect(formatCompactPrice(input)).toBe(expected)
    }
  )

  test.each([
    ['¥0.5256', '¥0.52'],
    ['¥0.657', '¥0.65'],
    ['¥0.1314', '¥0.13'],
    ['¥0.3942', '¥0.39'],
    ['¥0.5', '¥0.50'],
    ['0.863', '0.86'],
  ])(
    'keeps two decimals for %s when there is no whole unit',
    (input, expected) => {
      expect(formatCompactPrice(input)).toBe(expected)
    }
  )

  test.each([
    ['¥0.009', '¥0.01'],
    ['¥0.001', '¥0.01'],
  ])('clamps %s to the 0.01 floor', (input, expected) => {
    expect(formatCompactPrice(input)).toBe(expected)
  })

  test.each([
    ['¥0', '¥0'],
    ['0', '0'],
    ['-', '-'],
    ['', ''],
    ['n/a', 'n/a'],
  ])(
    'leaves %s untouched so free and missing prices stay honest',
    (input, expected) => {
      expect(formatCompactPrice(input)).toBe(expected)
    }
  )
})
