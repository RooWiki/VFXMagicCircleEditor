import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App placeholder', () => {
  it('renders the working title', () => {
    render(<App />)
    expect(screen.getByText('Magic Circle Editor')).toBeInTheDocument()
  })

  it('renders the Phase 1 status message', () => {
    render(<App />)
    expect(screen.getByText(/Phase 1/i)).toBeInTheDocument()
  })
})
