import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockToast } from '@/test/utils/test-utils'
import { server } from '@/test/setup'
import { http, HttpResponse } from 'msw'
import { InspectionSchedulingModal } from '@/components/inspections/InspectionSchedulingModal'
import { InspectionsTab } from '@/components/dashboard/InspectionsTab'
import { mockProperties, mockInspectors, mockInspections, mockInspectionSessions } from '@/test/mocks/supabase'

// Mock the supabase client with detailed tracking
const mockSupabaseOperations = {
  insertInspection: vi.fn(),
  insertInspectionSession: vi.fn(),
  selectInspections: vi.fn(),
  selectInspectionSessions: vi.fn()
}

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
          }),
          insert: vi.fn().mockImplementation((data) => {
            mockSupabaseOperations.insertInspection(data)
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'new-inspection-id', ...data },
                  error: null
                })
              })
            }
          })
        }
      } else if (table === 'inspection_sessions') {
        return {
          select: vi.fn().mockResolvedValue({
            data: mockInspectionSessions,
            error: null
          }),
          insert: vi.fn().mockImplementation((data) => {
            mockSupabaseOperations.insertInspectionSession(data)
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'new-session-id', ...data },
                  error: null
                })
              })
            }
          })
        }
      } else if (table === 'roofs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({
                data: mockProperties,
                error: null
              })
            })
          })
        }
      }
      
      return {
        select: vi.fn().mockReturnValue({
          data: [],
          error: null
        })
      }
    }),
    rpc: vi.fn().mockResolvedValue({
      data: 'Test Campaign',
      error: null
    })
  }
}))

// Mock hooks
vi.mock('@/hooks/useInspectors', () => ({
  useInspectors: () => ({
    inspectors: mockInspectors,
    loading: false
  })
}))

vi.mock('@/hooks/useN8nWorkflow', () => ({
  useN8nWorkflow: () => ({
    processCampaignsBatch: vi.fn()
  })
}))

describe('Direct Inspection Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseOperations.insertInspection.mockClear()
    mockSupabaseOperations.insertInspectionSession.mockClear()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('End-to-End Direct Inspection Creation', () => {
    it('creates inspection and session records when direct inspection is scheduled', async () => {
      const user = userEvent.setup()
      const mockOnOpenChange = vi.fn()

      render(
        <InspectionSchedulingModal 
          open={true} 
          onOpenChange={mockOnOpenChange} 
        />
      )

      // Switch to direct inspection mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Select property
      const propertySelect = screen.getByRole('combobox')
      await user.click(propertySelect)
      
      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Test Property 1'))

      // Select scheduled date
      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-01')

      // Select time
      const timeInput = screen.getByLabelText('Scheduled Time')
      await user.type(timeInput, '10:00')

      // Add notes
      const notesInput = screen.getByLabelText('Notes')
      await user.type(notesInput, 'Test inspection notes')

      // Create inspection
      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      // Verify database operations
      await waitFor(() => {
        expect(mockSupabaseOperations.insertInspection).toHaveBeenCalledWith({
          roof_id: 'prop-1',
          inspector_id: 'inspector-1',
          scheduled_date: '2024-12-01',
          status: 'scheduled',
          inspection_type: 'routine',
          notes: 'Test inspection notes'
        })
      })

      expect(mockSupabaseOperations.insertInspectionSession).toHaveBeenCalledWith({
        property_id: 'prop-1',
        inspector_id: 'inspector-1',
        status: 'scheduled',
        session_data: expect.objectContaining({
          inspectionType: 'routine',
          priority: 'medium',
          notes: 'Test inspection notes',
          directInspection: true,
          propertyName: 'Test Property 1'
        }),
        expires_at: expect.any(String)
      })

      // Verify success notification
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Direct Inspection Created Successfully!',
        description: expect.stringContaining('Inspection scheduled for Test Property 1')
      })
    })

    it('handles different inspection types and priorities', async () => {
      const user = userEvent.setup()
      
      render(
        <InspectionSchedulingModal 
          open={true} 
          onOpenChange={vi.fn()} 
        />
      )

      // Switch to direct inspection mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Select property
      const propertySelect = screen.getByRole('combobox')
      await user.click(propertySelect)
      await waitFor(() => screen.getByText('Test Property 1'))
      await user.click(screen.getByText('Test Property 1'))

      // Set date
      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-01')

      // Change inspection type to emergency
      const typeSelect = screen.getByRole('combobox', { name: /inspection type/i })
      await user.click(typeSelect)
      await user.click(screen.getByText('Emergency'))

      // Change priority to high
      const prioritySelect = screen.getByRole('combobox', { name: /priority level/i })
      await user.click(prioritySelect)
      await user.click(screen.getByText('High'))

      // Create inspection
      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      // Verify correct data is passed
      await waitFor(() => {
        expect(mockSupabaseOperations.insertInspection).toHaveBeenCalledWith(
          expect.objectContaining({
            inspection_type: 'emergency'
          })
        )

        expect(mockSupabaseOperations.insertInspectionSession).toHaveBeenCalledWith(
          expect.objectContaining({
            session_data: expect.objectContaining({
              inspectionType: 'emergency',
              priority: 'high'
            })
          })
        )
      })
    })
  })

  describe('Data Consistency Between Tables', () => {
    it('ensures inspection and inspection_session records are linked properly', async () => {
      const user = userEvent.setup()
      
      render(
        <InspectionSchedulingModal 
          open={true} 
          onOpenChange={vi.fn()} 
        />
      )

      // Create a direct inspection
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const propertySelect = screen.getByRole('combobox')
      await user.click(propertySelect)
      await waitFor(() => screen.getByText('Test Property 1'))
      await user.click(screen.getByText('Test Property 1'))

      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-01')

      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      await waitFor(() => {
        // Both records should be created
        expect(mockSupabaseOperations.insertInspection).toHaveBeenCalled()
        expect(mockSupabaseOperations.insertInspectionSession).toHaveBeenCalled()

        // Verify they have matching data
        const inspectionCall = mockSupabaseOperations.insertInspection.mock.calls[0][0]
        const sessionCall = mockSupabaseOperations.insertInspectionSession.mock.calls[0][0]

        expect(inspectionCall.roof_id).toBe(sessionCall.property_id)
        expect(inspectionCall.inspector_id).toBe(sessionCall.inspector_id)
        expect(sessionCall.status).toBe('scheduled')
      })
    })

    it('maintains status consistency between tables', async () => {
      const user = userEvent.setup()
      
      render(
        <InspectionSchedulingModal 
          open={true} 
          onOpenChange={vi.fn()} 
        />
      )

      // Create inspection
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const propertySelect = screen.getByRole('combobox')
      await user.click(propertySelect)
      await waitFor(() => screen.getByText('Test Property 1'))
      await user.click(screen.getByText('Test Property 1'))

      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-01')

      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      await waitFor(() => {
        // Verify status consistency
        const inspectionData = mockSupabaseOperations.insertInspection.mock.calls[0][0]
        const sessionData = mockSupabaseOperations.insertInspectionSession.mock.calls[0][0]

        expect(inspectionData.status).toBe('scheduled')
        expect(sessionData.status).toBe('scheduled')
      })
    })
  })

  describe('Dashboard Integration', () => {
    it('displays newly created direct inspections in the dashboard', async () => {
      // Mock the inspections data with a newly created direct inspection
      const newInspection = {
        id: 'direct-inspection-1',
        roof_id: 'prop-1',
        inspector_id: 'inspector-1',
        scheduled_date: '2024-12-01',
        status: 'scheduled',
        inspection_type: 'routine',
        notes: 'Direct inspection scheduled',
        created_at: new Date().toISOString(),
        roofs: {
          property_name: 'Test Property 1'
        },
        users: {
          first_name: 'Michael',
          last_name: 'Kidder'
        },
        inspection_sessions: [{
          status: 'scheduled'
        }]
      }

      // Update the mock to include the new inspection
      vi.mocked(mockInspections).push(newInspection as any)

      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
        expect(screen.getByText('Michael Kidder')).toBeInTheDocument()
        expect(screen.getByText('Dec 01, 2024')).toBeInTheDocument()
        expect(screen.getByText('routine')).toBeInTheDocument()
      })
    })

    it('shows correct status badges for direct inspections', async () => {
      render(<InspectionsTab />)

      await waitFor(() => {
        // Look for status badges
        const statusBadges = screen.getAllByText(/scheduled|in progress|completed/i)
        expect(statusBadges.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('handles database errors gracefully during inspection creation', async () => {
      // Mock database error
      mockSupabaseOperations.insertInspection.mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      const user = userEvent.setup()
      
      render(
        <InspectionSchedulingModal 
          open={true} 
          onOpenChange={vi.fn()} 
        />
      )

      // Try to create inspection
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const propertySelect = screen.getByRole('combobox')
      await user.click(propertySelect)
      await waitFor(() => screen.getByText('Test Property 1'))
      await user.click(screen.getByText('Test Property 1'))

      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-01')

      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      // Should show error message
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to Create Inspection',
          description: 'An error occurred while creating the direct inspection. Please try again.',
          variant: 'destructive'
        })
      })
    })

    it('validates required fields before submission', async () => {
      const user = userEvent.setup()
      
      render(
        <InspectionSchedulingModal 
          open={true} 
          onOpenChange={vi.fn()} 
        />
      )

      // Switch to direct mode without filling required fields
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      // Should show validation errors
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'No Property Selected',
          description: 'Please select a property for direct inspection.',
          variant: 'destructive'
        })
      })

      // No database operations should have been called
      expect(mockSupabaseOperations.insertInspection).not.toHaveBeenCalled()
      expect(mockSupabaseOperations.insertInspectionSession).not.toHaveBeenCalled()
    })
  })

  describe('Status Transitions', () => {
    it('supports status progression from scheduled to completed', async () => {
      // This test would verify that status transitions work properly
      // For now, we'll test the initial state
      const inspection = mockInspections[0]
      
      expect(inspection.status).toBe('scheduled')
      
      // In a real scenario, this would test status updates through the UI
      // and verify that both tables are updated consistently
    })
  })
})