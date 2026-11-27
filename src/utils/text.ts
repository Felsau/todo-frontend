/** Spaces plus invisible format characters: zero width space, joiners, word joiner, BOM. */
const INVISIBLE = /[\s\u200B-\u200D\u2060\uFEFF]/g

/** True when a person could not see anything in the text (QA round 2, R2-10). */
export function isBlank(text: string): boolean {
  return text.replace(INVISIBLE, '') === ''
}
