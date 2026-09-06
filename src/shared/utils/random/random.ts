import { randomInt, randomUUID } from 'node:crypto'

export function randomUuid(): string {
  return randomUUID()
}

export function randomJti(): string {
  return encodeURIComponent(Array.from({ length: 25 }, () => randomInt(36).toString(36)).join(''))
}
