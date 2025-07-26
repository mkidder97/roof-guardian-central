import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { AuthContext } from '@/contexts/AuthContext'

// Mock auth context
const mockAuthContext = {
  user: {
    id: 'test-user',
    email: 'test@example.com',
    user_metadata: {
      first_name: 'Test',
      last_name: 'User'
    }
  },
  userRole: 'inspector' as const,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn()
}

// Custom render function with providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  })

  function AllTheProviders({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthContext}>
            {children}
          </AuthContext.Provider>
        </QueryClientProvider>
      </BrowserRouter>
    )
  }

  return render(ui, { wrapper: AllTheProviders, ...options })
}

// Mock toast hook
export const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}))

// Mock navigation
export const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
export { mockAuthContext, mockToast, mockNavigate }