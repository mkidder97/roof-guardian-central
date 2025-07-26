import { describe, it, expect } from 'vitest'

describe('Test Setup Verification', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true)
  })

  it('should have access to vitest globals', () => {
    expect(expect).toBeDefined()
    expect(describe).toBeDefined()
    expect(it).toBeDefined()
  })

  it('should be able to test basic JavaScript functionality', () => {
    const sum = (a: number, b: number) => a + b
    expect(sum(2, 3)).toBe(5)
  })
})