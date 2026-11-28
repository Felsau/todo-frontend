import { ref } from 'vue'

/*
 * The "this list is shared" notice. It shows until the person closes it, and the footer can open
 * it again (QA round 4, P22). Storage can be blocked (private mode, strict settings), so every
 * access is guarded and the notice simply shows again next time.
 */
const KEY = 'luiyngan.sharedNotice.dismissed'

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

const open = ref(!readDismissed())

function dismiss() {
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {
    /* not remembered this time; the notice is still closed for this visit */
  }
  open.value = false
}

function reopen() {
  open.value = true
}

/** The address to share: this list, without the keys of an open dialog or sheet. */
export function shareLink(): string {
  return `${window.location.origin}/`
}

export function useSharedNotice() {
  return { open, dismiss, reopen }
}
