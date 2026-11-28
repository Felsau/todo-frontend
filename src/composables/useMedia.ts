import { ref, type Ref } from 'vue'

/** One shared reactive matchMedia flag per query. */
const cache = new Map<string, Ref<boolean>>()

export function useMedia(query: string): Ref<boolean> {
  let flag = cache.get(query)
  if (!flag) {
    const mql = window.matchMedia(query)
    flag = ref(mql.matches)
    const r = flag
    mql.addEventListener('change', (e) => {
      r.value = e.matches
    })
    cache.set(query, flag)
  }
  return flag
}

/**
 * true from 640px up (Tailwind `sm`): popovers, dialogs and the month grid. Written in rem like
 * Tailwind's own breakpoint, so a bigger browser font size switches both at the same width.
 */
export const useIsSm = () => useMedia('(min-width: 40rem)')

/** true from 1024px up (Tailwind `lg`): three list columns instead of two. */
export const useIsLg = () => useMedia('(min-width: 64rem)')
