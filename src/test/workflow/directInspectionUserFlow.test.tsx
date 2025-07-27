import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockToast } from '@/test/utils/test-utils'
import { InspectionSchedulingModal } from '@/components/inspections/InspectionSchedulingModal'

// Mock properties
const mockProperties = [
  {
    id: 'prop-1',
    property_name: 'Dallas Property 1',
    address: '123 Main St',
    city: 'Dallas',
    state: 'TX',
    zip: '75001',
    market: 'Dallas',
    region: 'Central',
    roof_type: 'Modified Bitumen',
    roof_area: 50000,
    last_inspection_date: '2024-01-15',
    site_contact_name: 'John Doe',
    site_contact_phone: '555-1234',
    roof_access: 'ladder',
    latitude: 32.7767,
    longitude: -96.7970,
    manufacturer_warranty_expiration: '2025-12-31',
    installer_warranty_expiration: '2025-06-30',
    client_id: 'client-1',
    status: 'active',
    property_manager_name: 'Jane Smith',
    property_manager_email: 'jane@test.com',
    property_manager_phone: '555-5678',
    clients: {
      company_name: 'Test Client LLC'
    }
  },
  {
    id: 'prop-2',
    property_name: 'Houston Property 2',
    address: '456 Oak St',
    city: 'Houston',
    state: 'TX',
    zip: '77001',
    market: 'Houston',
    region: 'South',
    roof_type: 'TPO',
    roof_area: 75000,
    last_inspection_date: null,
    site_contact_name: 'Mike Johnson',
    site_contact_phone: '555-2345',
    roof_access: 'stairs',
    latitude: 29.7604,
    longitude: -95.3698,
    manufacturer_warranty_expiration: '2026-06-30',
    installer_warranty_expiration: '2025-12-31',
    client_id: 'client-2',
    status: 'active',
    property_manager_name: 'Bob Wilson',
    property_manager_email: 'bob@test.com',
    property_manager_phone: '555-6789',
    clients: {
      company_name: 'Another Client Inc'
    }
  }
]

// Mock inspectors
const mockInspectors = [
  {
    id: 'inspector-1',
    email: 'mkidder@southernroof.biz',
    full_name: 'Michael Kidder',
    first_name: 'Michael',
    last_name: 'Kidder',
    phone: '555-9999',
    role: 'inspector'
  },
  {
    id: 'inspector-2',
    email: 'inspector2@test.com',
    full_name: 'John Inspector',
    first_name: 'John',
    last_name: 'Inspector',
    phone: '555-8888',
    role: 'inspector'
  }
]

// Track operations for workflow validation
const workflowTracker = {
  operations: [] as any[],
  addOperation: (type: string, data: any) => {
    workflowTracker.operations.push({
      type,
      data,
      timestamp: new Date().toISOString()
    })
  },
  reset: () => {
    workflowTracker.operations = []
  }
}

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'roofs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockProperties,
                  error: null
                })
              })
            }),
            in: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockProperties.filter(p => p.region === 'Central'),
                  error: null
                })
              })
            })
          })
        }
      } else if (table === 'inspections') {
        return {
          insert: vi.fn().mockImplementation((data) => {
            workflowTracker.addOperation('create_inspection', data)
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
          insert: vi.fn().mockImplementation((data) => {
            workflowTracker.addOperation('create_session', data)
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
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    })
  }
}))

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

describe('Direct Inspection User Workflow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    workflowTracker.reset()
  })

  describe('Complete Direct Inspection Creation Workflow', () => {
    it('completes full workflow: filter → search → select → create', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Step 1: Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      expect(screen.getByText('Create Direct Inspection')).toBeInTheDocument()

      // Step 2: Apply filters
      const selects = screen.getAllByRole('combobox')
      
      // Select region
      await user.click(selects[0])
      await user.click(screen.getByText('Central'))

      // Select market
      await user.click(selects[1])
      await user.click(screen.getByText('Dallas'))

      // Apply filters
      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      // Step 3: Search for specific property
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'Dallas')

      // Verify filtered results
      await waitFor(() => {
        expect(screen.getByText('Dallas Property 1')).toBeInTheDocument()
        expect(screen.queryByText('Houston Property 2')).not.toBeInTheDocument()
      })

      // Step 4: Select property
      const property = screen.getByText('Dallas Property 1').closest('div')
      await user.click(property!)

      // Verify selection
      expect(property).toHaveClass(/border-blue-500/)
      expect(screen.getByText('Selected Property')).toBeInTheDocument()

      // Step 5: Fill inspection details
      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-15')

      const timeInput = screen.getByLabelText('Scheduled Time')
      await user.type(timeInput, '09:00')

      // Change inspection type
      const typeSelect = screen.getByRole('combobox', { name: /inspection type/i })
      await user.click(typeSelect)
      await user.click(screen.getByText('Routine'))

      // Change priority
      const prioritySelect = screen.getByRole('combobox', { name: /priority level/i })
      await user.click(prioritySelect)
      await user.click(screen.getByText('High'))

      // Add notes
      const notesInput = screen.getByLabelText('Notes')
      await user.type(notesInput, 'Urgent inspection needed for roof damage assessment')

      // Step 6: Create inspection
      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      // Verify success
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Direct Inspection Created Successfully!',
          description: expect.stringContaining('Dallas Property 1')
        })
      })

      // Verify workflow operations
      expect(workflowTracker.operations).toHaveLength(2)
      expect(workflowTracker.operations[0].type).toBe('create_inspection')
      expect(workflowTracker.operations[0].data).toMatchObject({
        roof_id: 'prop-1',
        inspector_id: 'inspector-1',
        scheduled_date: '2024-12-15',
        status: 'scheduled',
        inspection_type: 'routine'
      })

      expect(workflowTracker.operations[1].type).toBe('create_session')
      expect(workflowTracker.operations[1].data).toMatchObject({
        property_id: 'prop-1',
        inspector_id: 'inspector-1',
        status: 'scheduled'
      })
    })

    it('handles inspector selection and assignment', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Select property first
      const property = screen.getByText('Dallas Property 1').closest('div')
      await user.click(property!)

      // Change inspector
      const inspectorSelect = screen.getByRole('combobox', { name: /inspector/i })
      await user.click(inspectorSelect)
      
      // Select different inspector
      await user.click(screen.getByText('John Inspector'))

      // Fill required fields
      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-20')

      // Create inspection
      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      // Verify correct inspector was assigned
      await waitFor(() => {
        const inspectionOp = workflowTracker.operations.find(op => op.type === 'create_inspection')
        expect(inspectionOp.data.inspector_id).toBe('inspector-2')

        const sessionOp = workflowTracker.operations.find(op => op.type === 'create_session')
        expect(sessionOp.data.inspector_id).toBe('inspector-2')
      })
    })

    it('validates all required fields before submission', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Try to create without selecting property
      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'No Property Selected',
          description: 'Please select a property for direct inspection.',
          variant: 'destructive'
        })
      })

      // Select property but no date
      const property = screen.getByText('Dallas Property 1').closest('div')
      await user.click(property!)

      await user.click(createButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'No Date Selected',
          description: 'Please select a scheduled date for the inspection.',
          variant: 'destructive'
        })
      })

      // No operations should have been created
      expect(workflowTracker.operations).toHaveLength(0)
    })
  })

  describe('Error Handling in Workflow', () => {
    it('handles API errors gracefully during inspection creation', async () => {
      // Mock API error
      vi.mocked(await import('@/integrations/supabase/client')).supabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'inspections') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockRejectedValue(new Error('Database error'))
              })
            })
          }
        }
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
      })

      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Complete workflow up to creation
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const property = screen.getByText('Dallas Property 1').closest('div')
      await user.click(property!)

      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-15')

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

    it('handles invalid filter combinations', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Apply filters that result in no properties
      const selects = screen.getAllByRole('combobox')
      
      await user.click(selects[0])
      await user.click(screen.getByText('North'))

      await user.click(selects[1])
      await user.click(screen.getByText('San Antonio'))

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      // Should show empty state
      await waitFor(() => {
        expect(screen.getByText(/no properties found matching your criteria/i)).toBeInTheDocument()
      })

      // Create button should be disabled
      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      expect(createButton).toBeDisabled()
    })
  })

  describe('Form Validation and Edge Cases', () => {
    it('prevents selecting past dates', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const property = screen.getByText('Dallas Property 1').closest('div')
      await user.click(property!)

      const dateInput = screen.getByLabelText('Scheduled Date *')
      
      // Check min attribute is set to today
      const today = new Date().toISOString().split('T')[0]
      expect(dateInput).toHaveAttribute('min', today)
    })

    it('handles very long notes gracefully', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const property = screen.getByText('Dallas Property 1').closest('div')
      await user.click(property!)

      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-15')

      const notesInput = screen.getByLabelText('Notes')
      const longNote = 'A'.repeat(1000) // 1000 character note
      await user.type(notesInput, longNote)

      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      // Should handle long notes without error
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Direct Inspection Created Successfully!',
          description: expect.any(String)
        })
      })

      // Verify notes were saved
      const sessionOp = workflowTracker.operations.find(op => op.type === 'create_session')
      expect(sessionOp.data.session_data.notes).toBe(longNote)
    })

    it('resets form after successful creation', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Complete first inspection
      const property1 = screen.getByText('Dallas Property 1').closest('div')
      await user.click(property1!)

      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-15')

      const notesInput = screen.getByLabelText('Notes')
      await user.type(notesInput, 'First inspection')

      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled()
      })

      // Verify form is reset
      expect(dateInput).toHaveValue('')
      expect(notesInput).toHaveValue('')
      expect(property1).not.toHaveClass(/border-blue-500/)

      // Should be able to create another inspection
      const property2 = screen.getByText('Houston Property 2').closest('div')
      await user.click(property2!)

      expect(property2).toHaveClass(/border-blue-500/)
    })
  })

  describe('Performance During Workflow', () => {
    it('maintains responsive UI during filtering operations', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Rapid filter changes
      const selects = screen.getAllByRole('combobox')
      const applyButton = screen.getByRole('button', { name: /apply filters/i })

      // Change filters multiple times quickly
      for (const region of ['Central', 'East', 'West']) {
        await user.click(selects[0])
        await user.click(screen.getByText(region))
        await user.click(applyButton)
      }

      // UI should remain responsive
      expect(screen.getByText('Create Direct Inspection')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search properties/i)).toBeEnabled()
    })

    it('handles rapid property selection changes', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Rapidly click between properties
      const property1 = screen.getByText('Dallas Property 1').closest('div')
      const property2 = screen.getByText('Houston Property 2').closest('div')

      await user.click(property1!)
      await user.click(property2!)
      await user.click(property1!)
      await user.click(property2!)

      // Final selection should be property2
      expect(property1).not.toHaveClass(/border-blue-500/)
      expect(property2).toHaveClass(/border-blue-500/)

      // Form should show property2 details
      await waitFor(() => {
        const detailsCard = screen.getByText('Selected Property').closest('.bg-blue-50')
        expect(within(detailsCard! as HTMLElement).getByText(/Houston Property 2/)).toBeInTheDocument()
      })
    })
  })
})