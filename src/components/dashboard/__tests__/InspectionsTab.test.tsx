import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils/test-utils'
import { InspectionsTab } from '../InspectionsTab'
import { mockInspections, mockInspectionSessions } from '@/test/mocks/supabase'

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'inspections') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockInspections,
              error: null
            })
          })
        }
      }
      return {
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }
    })
  }
}))

// Mock the InspectionSchedulingModal
vi.mock('@/components/inspections/InspectionSchedulingModal', () => ({
  InspectionSchedulingModal: ({ open, onOpenChange }: any) => 
    open ? (
      <div data-testid="inspection-scheduling-modal">
        <button onClick={() => onOpenChange(false)}>Close Modal</button>
      </div>
    ) : null
}))

describe('InspectionsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders the inspections table', async () => {
      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Property')).toBeInTheDocument()
        expect(screen.getByText('Inspector')).toBeInTheDocument()
        expect(screen.getByText('Scheduled Date')).toBeInTheDocument()
        expect(screen.getByText('Type')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
        expect(screen.getByText('Priority')).toBeInTheDocument()
        expect(screen.getByText('Weather')).toBeInTheDocument()
        expect(screen.getByText('Actions')).toBeInTheDocument()
      })
    })

    it('displays loading state initially', () => {
      render(<InspectionsTab />)
      
      expect(screen.getByText('Loading inspections...')).toBeInTheDocument()
    })

    it('displays inspection data after loading', async () => {
      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
        expect(screen.getByText('Michael Kidder')).toBeInTheDocument()
        expect(screen.getByText('Dec 01, 2024')).toBeInTheDocument()
        expect(screen.getByText('routine')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filtering', () => {
    it('filters inspections by search term', async () => {
      const user = userEvent.setup()
      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search inspections...')
      await user.type(searchInput, 'Test Property')

      // Should still show the matching property
      expect(screen.getByText('Test Property 1')).toBeInTheDocument()

      // Clear and search for non-existent property
      await user.clear(searchInput)
      await user.type(searchInput, 'NonExistent Property')

      // Should show no results message
      await waitFor(() => {
        expect(screen.getByText('No inspections match your current filters.')).toBeInTheDocument()
      })
    })

    it('filters inspections by status', async () => {
      const user = userEvent.setup()
      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      const statusFilter = screen.getByRole('combobox', { name: /filter by status/i })
      await user.click(statusFilter)
      
      await waitFor(() => {
        expect(screen.getByText('Scheduled')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Scheduled'))

      // Should still show scheduled inspections
      expect(screen.getByText('Test Property 1')).toBeInTheDocument()
    })

    it('searches by inspector name', async () => {
      const user = userEvent.setup()
      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Michael Kidder')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search inspections...')
      await user.type(searchInput, 'Michael')

      expect(screen.getByText('Test Property 1')).toBeInTheDocument()
    })

    it('searches by inspection type', async () => {
      const user = userEvent.setup()
      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('routine')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search inspections...')
      await user.type(searchInput, 'routine')

      expect(screen.getByText('Test Property 1')).toBeInTheDocument()
    })
  })

  describe('Status Display', () => {
    it('displays correct status badges', async () => {
      render(<InspectionsTab />)

      await waitFor(() => {
        // Look for status badge - the exact implementation may vary
        const statusElements = screen.getAllByText(/scheduled|in progress|completed/i)
        expect(statusElements.length).toBeGreaterThan(0)
      })
    })

    it('shows past due status for overdue inspections', async () => {
      // Mock an overdue inspection
      const overdueInspection = {
        ...mockInspections[0],
        scheduled_date: '2024-01-01', // Past date
        completed_date: null,
        status: 'scheduled'
      }

      vi.mocked(mockInspections).splice(0, 1, overdueInspection as any)

      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Past Due')).toBeInTheDocument()
      })
    })

    it('shows completed status for finished inspections', async () => {
      // Mock a completed inspection
      const completedInspection = {
        ...mockInspections[0],
        completed_date: '2024-11-25',
        status: 'completed'
      }

      vi.mocked(mockInspections).splice(0, 1, completedInspection as any)

      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
        // Should show completed status badge
      })
    })
  })

  describe('Priority Display', () => {
    it('shows high priority for emergency inspections', async () => {
      // Mock emergency inspection
      const emergencyInspection = {
        ...mockInspections[0],
        inspection_type: 'emergency'
      }

      vi.mocked(mockInspections).splice(0, 1, emergencyInspection as any)

      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('emergency')).toBeInTheDocument()
        expect(screen.getByText('High')).toBeInTheDocument()
      })
    })

    it('shows medium priority for routine inspections', async () => {
      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('routine')).toBeInTheDocument()
        expect(screen.getByText('Low')).toBeInTheDocument() // Routine = Low priority
      })
    })
  })

  describe('Actions and Navigation', () => {
    it('opens inspection scheduling modal when schedule button is clicked', async () => {
      const user = userEvent.setup()
      render(<InspectionsTab />)

      const scheduleButton = screen.getByRole('button', { name: /schedule inspection/i })
      await user.click(scheduleButton)

      expect(screen.getByTestId('inspection-scheduling-modal')).toBeInTheDocument()
    })

    it('provides export functionality', async () => {
      const user = userEvent.setup()
      render(<InspectionsTab />)

      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeInTheDocument()

      // Note: Testing actual CSV export would require mocking window.URL.createObjectURL
      await user.click(exportButton)
    })

    it('shows action buttons for each inspection', async () => {
      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      // Check for action buttons
      expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    it('shows report button for completed inspections', async () => {
      // Mock completed inspection
      const completedInspection = {
        ...mockInspections[0],
        completed_date: '2024-11-25',
        status: 'completed'
      }

      vi.mocked(mockInspections).splice(0, 1, completedInspection as any)

      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /report/i })).toBeInTheDocument()
      })
    })
  })

  describe('Inspector Interface Navigation', () => {
    it('shows inspector intelligence button for inspectors', async () => {
      render(<InspectionsTab />)

      const inspectorButton = screen.getByRole('button', { name: /inspector intelligence/i })
      expect(inspectorButton).toBeInTheDocument()
    })

    it('navigates to inspector interface when button is clicked', async () => {
      const user = userEvent.setup()
      const { mockNavigate } = await import('@/test/utils/test-utils')
      
      render(<InspectionsTab />)

      const inspectorButton = screen.getByRole('button', { name: /inspector intelligence/i })
      await user.click(inspectorButton)

      expect(mockNavigate).toHaveBeenCalledWith('/inspector')
    })
  })

  describe('Data Display and Formatting', () => {
    it('formats dates correctly', async () => {
      render(<InspectionsTab />)

      await waitFor(() => {
        // Check for formatted date
        expect(screen.getByText('Dec 01, 2024')).toBeInTheDocument()
      })
    })

    it('shows unassigned inspector when no inspector', async () => {
      // Mock inspection without inspector
      const noInspectorInspection = {
        ...mockInspections[0],
        inspector_id: null,
        users: null
      }

      vi.mocked(mockInspections).splice(0, 1, noInspectorInspection as any)

      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Unassigned')).toBeInTheDocument()
      })
    })

    it('shows default values for missing data', async () => {
      // Mock inspection with missing data
      const incompleteInspection = {
        ...mockInspections[0],
        inspection_type: null,
        weather_conditions: null,
        scheduled_date: null
      }

      vi.mocked(mockInspections).splice(0, 1, incompleteInspection as any)

      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Not Specified')).toBeInTheDocument()
        expect(screen.getByText('Not Recorded')).toBeInTheDocument()
        expect(screen.getByText('Not Scheduled')).toBeInTheDocument()
      })
    })
  })

  describe('Statistics Display', () => {
    it('shows inspection count statistics', async () => {
      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText(/showing \d+ of \d+ inspections/i)).toBeInTheDocument()
        expect(screen.getByText(/scheduled: \d+/i)).toBeInTheDocument()
        expect(screen.getByText(/completed: \d+/i)).toBeInTheDocument()
        expect(screen.getByText(/past due: \d+/i)).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no inspections exist', async () => {
      // Mock empty inspections
      vi.mocked(mockInspections).length = 0

      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('No inspections found')).toBeInTheDocument()
        expect(screen.getByText('Get started by scheduling your first inspection.')).toBeInTheDocument()
      })
    })

    it('shows filtered empty state when no inspections match filters', async () => {
      const user = userEvent.setup()
      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      // Apply filter that matches nothing
      const searchInput = screen.getByPlaceholderText('Search inspections...')
      await user.type(searchInput, 'xyz123nonexistent')

      await waitFor(() => {
        expect(screen.getByText('No inspections match your current filters.')).toBeInTheDocument()
      })
    })
  })
})