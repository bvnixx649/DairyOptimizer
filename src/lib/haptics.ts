/** Android supports vibration; iPadOS ignores it, which is fine. */
export const tick = (ms = 8) => {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* not supported */
  }
}

export const uid = () => crypto.randomUUID()
