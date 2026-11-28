import type { ListGroup } from '../composables/useListUi'
import type { Todo } from '../types'

/*
 * Desktop list layout (QA round 4, P21). The groups run down the first column and on into the
 * next, like a newspaper, so the list reads top to bottom and the width is used. The split points
 * are chosen so the columns end at about the same height. A group cut in two starts the next
 * column with its name again, marked "(ต่อ)", so no card sits under the wrong heading.
 */

export interface Piece {
  group: ListGroup
  items: Todo[]
  /** The rest of a group that began in the column before. */
  cont: boolean
}

const HEAD = 44
const CARD_GAP = 18
const GROUP_GAP = 24

/** Rough card height in px, from what the card shows. Only used to balance the columns. */
export function estimateCard(t: Todo, extra = 0): number {
  const lines = Math.min(3, Math.max(1, Math.ceil(t.title.length / 22)))
  return 100 + (lines - 1) * 29 + extra
}

function fill(groups: ListGroup[], limit: number, h: (t: Todo) => number): Piece[][] {
  const cols: Piece[][] = [[]]
  let height = 0
  const newCol = () => {
    cols.push([])
    height = 0
  }
  for (const g of groups) {
    if (g.items.length === 0) continue
    // A heading never ends a column on its own: it moves on with its first card.
    if (height > 0 && height + GROUP_GAP + HEAD + h(g.items[0]) > limit) newCol()
    let piece: Piece = { group: g, items: [], cont: false }
    cols[cols.length - 1].push(piece)
    height += (height > 0 ? GROUP_GAP : 0) + HEAD
    for (const t of g.items) {
      const ht = h(t) + (piece.items.length > 0 ? CARD_GAP : 0)
      if (piece.items.length > 0 && height + ht > limit) {
        newCol()
        piece = { group: g, items: [], cont: true }
        cols[cols.length - 1].push(piece)
        height = HEAD
        height += h(t)
      } else height += ht
      piece.items.push(t)
    }
  }
  return cols.filter((c) => c.length > 0)
}

/** Splits the groups into at most n columns with the lowest possible tallest column. */
export function splitColumns(groups: ListGroup[], n: number, h: (t: Todo) => number): Piece[][] {
  if (n <= 1) return [groups.map((g) => ({ group: g, items: g.items, cont: false }))]
  let lo = 0
  let hi = 0
  for (const g of groups) {
    hi += HEAD + GROUP_GAP
    for (const t of g.items) {
      lo = Math.max(lo, HEAD + h(t))
      hi += h(t) + CARD_GAP
    }
  }
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (fill(groups, mid, h).length <= n) hi = mid
    else lo = mid + 1
  }
  return fill(groups, lo, h)
}
