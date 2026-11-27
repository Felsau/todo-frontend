import { nextTick, ref } from 'vue'

/** Which todo the detail dialog (desktop) or sheet (mobile) is showing. */
const detailId = ref<number | null>(null)

function openDetail(id: number) {
  detailId.value = id
}

function closeDetail() {
  const id = detailId.value
  detailId.value = null
  if (id === null) return
  // Return focus to whatever opened it (the pencil, or the row on mobile).
  void nextTick(() => {
    document.querySelector<HTMLElement>(`[data-open-todo="${id}"]`)?.focus()
  })
}

export function useDetail() {
  return { detailId, openDetail, closeDetail }
}
