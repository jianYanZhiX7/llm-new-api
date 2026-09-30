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
import { CodeBlockFrame } from '@/components/ai-elements/code-block'
import { CopyButton } from '@/components/copy-button'

const CODE_CLASS =
  'text-foreground w-max min-w-full py-4 pr-4 pl-5 font-mono text-[13px] leading-6 whitespace-pre'
const TOKEN_CLASS = 'text-success'

type Segment = {
  highlighted: boolean
  start: number
  text: string
}

type SampleCodeBlockProps = {
  code: string
  highlightTerms?: readonly string[]
}

function findMatches(code: string, terms: readonly string[]) {
  const matches: { from: number; to: number }[] = []

  for (const term of terms) {
    let index = code.indexOf(term)
    while (index !== -1) {
      matches.push({ from: index, to: index + term.length })
      index = code.indexOf(term, index + term.length)
    }
  }

  return matches.sort((left, right) => left.from - right.from)
}

function toSegments(code: string, terms: readonly string[]): Segment[] {
  const targets = terms.filter((term) => term.length > 0)
  if (targets.length === 0) {
    return [{ highlighted: false, start: 0, text: code }]
  }

  const segments: Segment[] = []
  let cursor = 0

  for (const match of findMatches(code, targets)) {
    // Overlapping matches are skipped so no character is rendered twice.
    if (match.from < cursor) {
      continue
    }

    if (match.from > cursor) {
      segments.push({
        highlighted: false,
        start: cursor,
        text: code.slice(cursor, match.from),
      })
    }

    segments.push({
      highlighted: true,
      start: match.from,
      text: code.slice(match.from, match.to),
    })
    cursor = match.to
  }

  if (cursor < code.length) {
    segments.push({
      highlighted: false,
      start: cursor,
      text: code.slice(cursor),
    })
  }

  return segments
}

export function SampleCodeBlock({
  code,
  highlightTerms,
}: SampleCodeBlockProps) {
  return (
    <CodeBlockFrame
      bodyClassName='p-0'
      bodyOverlay={
        <div className='absolute top-2 right-2 flex items-center gap-1'>
          <CopyButton
            value={code}
            className='size-8'
            iconClassName='size-3.5'
          />
        </div>
      }
    >
      <pre className={CODE_CLASS}>
        {toSegments(code, highlightTerms ?? []).map((segment) => (
          <span
            key={segment.start}
            className={segment.highlighted ? TOKEN_CLASS : undefined}
          >
            {segment.text}
          </span>
        ))}
      </pre>
    </CodeBlockFrame>
  )
}
