import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the editor shell', () => {
    render(<App />)
    expect(screen.getByTestId('editor-shell')).toBeInTheDocument()
  })

  it('renders the product name', () => {
    render(<App />)
    expect(screen.getByText('Magic Circle Editor')).toBeInTheDocument()
  })
})
