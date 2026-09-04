import { describe, expect, it } from 'vitest'
import { isEditableElement } from './keyboard'

describe('isEditableElement', () => {
  it('returns false for null', () => {
    expect(isEditableElement(null)).toBe(false)
  })

  it('returns true for an <input> element', () => {
    const el = document.createElement('input')
    expect(isEditableElement(el)).toBe(true)
  })

  it('returns true for a <textarea> element', () => {
    const el = document.createElement('textarea')
    expect(isEditableElement(el)).toBe(true)
  })

  it('returns true for a <select> element', () => {
    const el = document.createElement('select')
    expect(isEditableElement(el)).toBe(true)
  })

  it('returns true for a contenteditable element', () => {
    const el = document.createElement('div')
    el.setAttribute('contenteditable', 'true')
    expect(isEditableElement(el)).toBe(true)
  })

  it('returns false for a non-editable element', () => {
    const el = document.createElement('div')
    expect(isEditableElement(el)).toBe(false)
  })

  it('returns false for a <button> element', () => {
    const el = document.createElement('button')
    expect(isEditableElement(el)).toBe(false)
  })

  it('returns false for a <span> element', () => {
    const el = document.createElement('span')
    expect(isEditableElement(el)).toBe(false)
  })
})
