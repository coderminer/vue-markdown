let lockCount = 0
let previousOverflow: string | undefined

/**
 * Lock page scrolling for every fullscreen surface on the page. The original
 * overflow is restored only when the last surface releases the lock.
 */
export function lockPageScroll(): void {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

/** Release one page-scroll lock. Safe to call when the caller owns no lock. */
export function unlockPageScroll(): void {
  if (typeof document === 'undefined' || lockCount === 0) return
  lockCount -= 1
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow ?? ''
    previousOverflow = undefined
  }
}
