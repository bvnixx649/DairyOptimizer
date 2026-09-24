import type { PinConfig } from '../data/types'

export const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export const PIN_ITERATIONS = 310_000
const PIN_CHECK = 'achieve-pin-check'

export async function deriveKey(secret: string, salt: Uint8Array, iterations: number, extractable = false) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptJSON(key: CryptoKey, value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value)))
  return { iv: toB64(iv), data: toB64(data) }
}

export async function decryptJSON<T>(key: CryptoKey, box: { iv: string; data: string }): Promise<T> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(box.iv) as BufferSource }, key, fromB64(box.data) as BufferSource)
  return JSON.parse(new TextDecoder().decode(plain)) as T
}

export async function createPin(pin: string): Promise<{ config: PinConfig; key: CryptoKey }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(pin, salt, PIN_ITERATIONS)
  return { config: { salt: toB64(salt), iterations: PIN_ITERATIONS, check: await encryptJSON(key, PIN_CHECK) }, key }
}

/** Returns the key when the PIN is right, otherwise null. */
export async function unlockPin(pin: string, config: PinConfig): Promise<CryptoKey | null> {
  const key = await deriveKey(pin, fromB64(config.salt), config.iterations)
  try {
    return (await decryptJSON<string>(key, config.check)) === PIN_CHECK ? key : null
  } catch {
    return null
  }
}

/** Decrypts a task sealed by the previous Achieve (one salt per task). */
export async function decryptLegacy<T>(box: { salt: string; iv: string; cipher: string }, pin: string): Promise<T> {
  const key = await deriveKey(pin, fromB64(box.salt), 310_000)
  return decryptJSON<T>(key, { iv: box.iv, data: box.cipher })
}
