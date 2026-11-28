import type { ListGroup } from '../composables/useListUi'
import type { Todo } from '../types'

/*
 * Desktop list layout (QA round 4, P21; recheck, N7). Whole groups run down the first column and
 * on into the next, so the list reads top to bottom, then left to right, and the width is used.
 * A group is never cut in two: its heading, its cards and the "ลบงานที่เสร็จแล้ว" button stay
 * together. The groups keep their order and are cut into at most n runs so that the tallest
 * column is as short as it can be.
 */

const HEAD = 44
const CARD_GAP = 18
const GROUP_GAP = 24

/** Rough card height in px, from what the card shows. Only used to balance the columns. */
export function estimateCard(t: Todo, extra = 0): number {
  const lines = Math.min(3, Math.max(1, Math.ceil(t.title.length / 22)))
  return 100 + (lines - 1) * 29 + extra
}

function groupHeight(g: ListGroup, h: (t: Todo) => number): number {
  return HEAD + g.items.reduce((sum, t, i) => sum + h(t) + (i > 0 ? CARD_GAP : 0), 0)
}

/** Greedy fill: a new column starts when the next whole group would not fit under the limit. */
function fill(groups: ListGroup[], heights: number[], limit: number): ListGroup[][] {
  const cols: ListGroup[][] = [[]]
  let height = 0
  groups.forEach((g, i) => {
    const col = cols[cols.length - 1]
    if (col.length > 0 && height + GROUP_GAP + heights[i] > limit) {
      cols.push([g])
      height = heights[i]
    } else {
      col.push(g)
      height += (col.length > 1 ? GROUP_GAP : 0) + heights[i]
    }
  })
  return cols
}

/** Splits the groups, in order and whole, into at most n columns with the lowest tallest column. */
export function splitColumns(groups: ListGroup[], n: number, h: (t: Todo) => number): ListGroup[][] {
  const list = groups.filter((g) => g.items.length > 0)
  if (n <= 1 || list.length <= 1) return [list]
  const heights = list.map((g) => groupHeight(g, h))
  let lo = Math.max(...heights)
  let hi = heights.reduce((a, b) => a + b, 0) + GROUP_GAP * list.length
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (fill(list, heights, mid).length <= n) hi = mid
    else lo = mid + 1
  }
  return fill(list, heights, lo)
}
