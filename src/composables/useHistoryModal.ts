import { onBeforeUnmount, watch, type Ref } from 'vue'
import { useRoute, useRouter, type Router } from 'vue-router'

/*
 * An open modal (the task detail, a bottom sheet) gets its own history entry, a query key
 * such as ?task=12 or ?sheet=1. The phone's Back button, or the mouse back button, then
 * closes the modal instead of leaving the app (QA round 2, R2-01). Going through vue-router
 * keeps the router's own history state intact.
 */

type Guard = () => boolean
const guards = new Map<string, Guard>()
/** Set while the app itself removes a key, so guards do not ask the person a second time. */
let appClosing = false
let installedOn: Router | null = null

function install(router: Router) {
  if (installedOn === router) return
  installedOn = router
  router.beforeEach((to, from) => {
    if (appClosing) {
      appClosing = false
      return true
    }
    for (const [key, canLeave] of guards) {
      // Returning false on a Back press makes vue-router put the entry back.
      if (from.query[key] !== undefined && to.query[key] === undefined && !canLeave()) return false
    }
    return true
  })
}

export function useHistoryModal(opts: {
  key: string
  open: Ref<boolean>
  /** Value written into the address, for example the task id. */
  value?: () => string
  /** The person pressed Back: close without touching history again. */
  onBack: () => void
  /** Return false to stay open (the modal should then ask the person itself). */
  canLeave?: Guard
}) {
  const router = useRouter()
  const route = useRoute()
  install(router)
  if (opts.canLeave) guards.set(opts.key, opts.canLeave)

  watch(opts.open, (isOpen) => {
    const has = route.query[opts.key] !== undefined
    if (isOpen && !has) {
      void router.push({ query: { ...route.query, [opts.key]: opts.value?.() ?? '1' } })
    } else if (!isOpen && has) {
      const query = { ...route.query }
      delete query[opts.key]
      appClosing = true
      const back = (window.history.state as { back?: string | null } | null)?.back
      if (back === router.resolve({ path: route.path, query }).fullPath) router.back()
      else void router.replace({ query })
    }
  })

  watch(
    () => route.query[opts.key],
    (now, before) => {
      if (before !== undefined && now === undefined && opts.open.value) opts.onBack()
    },
  )

  onBeforeUnmount(() => {
    if (opts.canLeave) guards.delete(opts.key)
  })
}
