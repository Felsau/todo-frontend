import { nextTick, ref } from 'vue'
import type { Priority } from '../types'
import { revealCard } from '../utils/reveal'
import { isBlank } from '../utils/text'
import { useListUi } from './useListUi'
import { useTodos } from './useTodos'

/*
 * The list view's add form, shared by the inline add row (640px and up) and the phone add sheet
 * opened from the round + button. One draft for both, so text typed on one survives a resize.
 */

const draft = ref('')
const due = ref('')
const priority = ref<Priority>('normal')

/** The phone add sheet is open. */
const sheetOpen = ref(false)
/** The round + button is on screen (phone list view), so other floating buttons make room. */
const fabShown = ref(false)
/** The latest task added from the sheet since it opened, and how many were added. */
const lastAdded = ref<{ tempId: number; title: string } | null>(null)
const addedCount = ref(0)

/** iOS opens the keyboard only for a focus made during the tap itself. */
let proxy: HTMLInputElement | null = null

function reset() {
  draft.value = ''
  due.value = ''
  priority.value = 'normal'
}

export function useAddForm() {
  const { add } = useTodos()
  const { filter, query } = useListUi()

  // "ดูงาน": make sure no filter or search hides the new card, then go to it (R2-02).
  function reveal(id: number) {
    filter.value = 'all'
    query.value = ''
    void nextTick(() => revealCard(id))
  }

  /** Adds the drafted task. quiet: from the phone sheet, which confirms it itself. */
  function submit(quiet = false): boolean {
    const title = draft.value.trim()
    if (isBlank(title)) return false
    const sent = { title, due: due.value, priority: priority.value }
    const tempId = add(
      { title, priority: sent.priority, due_date: sent.due || null },
      {
        quiet,
        // A failed add puts the typed values back, unless the box is already in use again (R2-05).
        restore: () => {
          if (draft.value.trim() !== '') return false
          draft.value = sent.title
          due.value = sent.due
          priority.value = sent.priority
          if (lastAdded.value && lastAdded.value.tempId === tempId) {
            lastAdded.value = null
            addedCount.value = Math.max(0, addedCount.value - 1)
          }
          // On a phone the text lives in the sheet: open it again when nothing else is open.
          if (fabShown.value && !sheetOpen.value && !document.querySelector('[aria-modal="true"]')) sheetOpen.value = true
          return true
        },
        reveal,
      },
    )
    if (quiet && tempId !== undefined) {
      lastAdded.value = { tempId, title }
      addedCount.value++
    }
    reset()
    return true
  }

  function openSheet() {
    proxy?.remove()
    proxy = document.createElement('input')
    proxy.setAttribute('aria-hidden', 'true')
    proxy.tabIndex = -1
    proxy.style.cssText =
      'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px'
    document.body.append(proxy)
    proxy.focus({ preventScroll: true })
    lastAdded.value = null
    addedCount.value = 0
    sheetOpen.value = true
  }

  function dropProxy() {
    proxy?.remove()
    proxy = null
  }

  return { draft, due, priority, sheetOpen, fabShown, lastAdded, addedCount, submit, reset, reveal, openSheet, dropProxy }
}
