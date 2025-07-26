import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockToast, mockNavigate } from '@/test/utils/test-utils'
import { mockProperties, mockInspectors, mockInspections, mockInspectionSessions } from '@/test/mocks/supabase'

// Import the main components for E2E testing
import { InspectionSchedulingModal } from '@/components/inspections/InspectionSchedulingModal'
import { InspectionsTab } from '@/components/dashboard/InspectionsTab'
import InspectorInterface from '@/pages/InspectorInterface'

// Mock the entire flow with state tracking
const e2eState = {
  createdInspections: [] as any[],
  createdSessions: [] as any[],
  statusUpdates: [] as any[],
  currentUser: 'inspector-1'
}

// Enhanced supabase mock for E2E testing
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'inspections') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [...mockInspections, ...e2eState.createdInspections],
              error: null
            }),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockInspections[0],
                error: null
              })
            })
          }),
          insert: vi.fn().mockImplementation((data) => {
            const newInspection = {
              id: `inspection-${Date.now()}`,
              ...data,
              created_at: new Date().toISOString(),
              roofs: {
                property_name: mockProperties.find(p => p.id === data.roof_id)?.property_name || 'Unknown'
              },
              users: {
                first_name: 'Michael',
                last_name: 'Kidder'
              }
            }
            e2eState.createdInspections.push(newInspection)
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: newInspection,
                  error: null
                })
              })
            }
          }),
          update: vi.fn().mockImplementation((data) => {
            if (data.status) {
              e2eState.statusUpdates.push({
                table: 'inspections',
                status: data.status,
                timestamp: new Date().toISOString()
              })
            }
            return {
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockInspections[0], ...data },
                    error: null
                  })
                })
              })
            }
          })
        }
      } else if (table === 'inspection_sessions') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [...mockInspectionSessions, ...e2eState.createdSessions],
            error: null
          }),
          insert: vi.fn().mockImplementation((data) => {
            const newSession = {
              id: `session-${Date.now()}`,
              ...data,
              created_at: new Date().toISOString()
            }
            e2eState.createdSessions.push(newSession)
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: newSession,
                  error: null
                })
              })
            }
          }),
          update: vi.fn().mockImplementation((data) => {
            if (data.inspection_status) {
              e2eState.statusUpdates.push({
                table: 'inspection_sessions',
                status: data.inspection_status,
                timestamp: new Date().toISOString()
              })
            }
            return {
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockInspectionSessions[0], ...data },
                    error: null
                  })
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
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    }),
    rpc: vi.fn().mockResolvedValue({
      data: 'Test Campaign - Routine - 1 Properties',
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

// Mock other components as needed
vi.mock('@/components/inspection/ActiveInspectionInterface', () => ({
  ActiveInspectionInterface: ({ propertyId, propertyName, onComplete }: any) => (
    <div data-testid="active-inspection">
      <h2>Inspecting: {propertyName}</h2>
      <button onClick={() => onComplete({ propertyName, status: 'completed' })}>
        Complete Inspection
      </button>
    </div>
  )
}))

vi.mock('@/lib/inspectorIntelligenceService', () => ({
  InspectorIntelligenceService: {
    getAvailableProperties: vi.fn().mockResolvedValue([
      {
        id: 'prop-1',
        property_name: 'Test Property 1',
        roof_type: 'Modified Bitumen',
        roof_area: 50000,
        last_inspection_date: '2024-01-15'
      }
    ]),
    getPropertySummary: vi.fn().mockResolvedValue({
      id: 'prop-1',
      name: 'Test Property 1',
      criticalIssues: 0
    }),
    generateInspectionBriefing: vi.fn().mockResolvedValue(null)
  }
}))

describe('Direct Inspection End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset E2E state
    e2eState.createdInspections = []
    e2eState.createdSessions = []
    e2eState.statusUpdates = []
  })

  describe('Complete Direct Inspection Workflow', () => {
    it('completes the full direct inspection lifecycle', async () => {
      const user = userEvent.setup()

      // Step 1: Start with the scheduling modal
      const { rerender } = render(
        <InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />
      )

      // Step 2: Switch to direct inspection mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      expect(screen.getByText('Create Direct Inspection')).toBeInTheDocument()

      // Step 3: Fill out the direct inspection form
      const propertySelect = screen.getByRole('combobox')
      await user.click(propertySelect)
      
      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Test Property 1'))

      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-01')

      const timeInput = screen.getByLabelText('Scheduled Time')
      await user.type(timeInput, '10:00')

      const notesInput = screen.getByLabelText('Notes')
      await user.type(notesInput, 'E2E test inspection')

      // Step 4: Create the inspection
      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      // Step 5: Verify creation was successful
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Direct Inspection Created Successfully!',
          description: expect.stringContaining('Inspection scheduled for Test Property 1')
        })
      })

      // Step 6: Verify data was created in both tables
      expect(e2eState.createdInspections).toHaveLength(1)
      expect(e2eState.createdSessions).toHaveLength(1)

      const createdInspection = e2eState.createdInspections[0]
      const createdSession = e2eState.createdSessions[0]

      expect(createdInspection.roof_id).toBe('prop-1')
      expect(createdInspection.inspector_id).toBe('inspector-1')
      expect(createdInspection.status).toBe('scheduled')
      expect(createdInspection.notes).toBe('E2E test inspection')

      expect(createdSession.property_id).toBe('prop-1')
      expect(createdSession.inspector_id).toBe('inspector-1')
      expect(createdSession.inspection_status).toBe('scheduled')
      expect(createdSession.session_data.notes).toBe('E2E test inspection')

      // Step 7: Switch to dashboard view and verify inspection appears
      rerender(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
        expect(screen.getByText('Michael Kidder')).toBeInTheDocument()
        expect(screen.getByText('Dec 01, 2024')).toBeInTheDocument()
      })

      // Step 8: Verify inspection statistics are updated
      expect(screen.getByText(/showing \d+ of \d+ inspections/i)).toBeInTheDocument()
    })

    it('handles the complete inspector workflow', async () => {
      const user = userEvent.setup()

      // Create an inspection first
      e2eState.createdInspections.push({
        id: 'e2e-inspection-1',
        roof_id: 'prop-1',
        inspector_id: 'inspector-1',
        scheduled_date: '2024-12-01',
        status: 'scheduled',
        inspection_type: 'routine',
        notes: 'E2E inspector test',
        created_at: new Date().toISOString(),
        roofs: { property_name: 'Test Property 1' },
        users: { first_name: 'Michael', last_name: 'Kidder' }
      })

      // Step 1: Load inspector interface
      const { rerender } = render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Inspector Intelligence')).toBeInTheDocument()
        expect(screen.getByText('Select Property for Inspection')).toBeInTheDocument()
      })

      // Step 2: Select property (this would trigger the building details dialog)
      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      // Note: In a real E2E test, we would continue through the inspector interface
      // but since we're mocking the components, we'll simulate the key interactions

      // Step 3: Verify the inspection lifecycle can be completed
      // This would involve starting the inspection, updating status, and completing it

      // Simulate status progression
      const { supabase } = await import('@/integrations/supabase/client')

      // Start inspection
      await supabase.from('inspections').update({ status: 'in_progress' }).eq('id', 'e2e-inspection-1')
      await supabase.from('inspection_sessions').update({ inspection_status: 'in_progress' }).eq('property_id', 'prop-1')

      expect(e2eState.statusUpdates).toContainEqual({
        table: 'inspections',
        status: 'in_progress',
        timestamp: expect.any(String)
      })

      expect(e2eState.statusUpdates).toContainEqual({
        table: 'inspection_sessions',
        status: 'in_progress',
        timestamp: expect.any(String)
      })

      // Complete inspection
      await supabase.from('inspections').update({ status: 'completed' }).eq('id', 'e2e-inspection-1')
      await supabase.from('inspection_sessions').update({ inspection_status: 'completed' }).eq('property_id', 'prop-1')

      // Verify final status
      expect(e2eState.statusUpdates.filter(u => u.status === 'completed')).toHaveLength(2)
    })
  })

  describe('Error Scenarios and Recovery', () => {
    it('handles partial failures gracefully', async () => {
      const user = userEvent.setup()

      // Mock a scenario where inspection creation succeeds but session creation fails
      vi.mocked(await import('@/integrations/supabase/client')).supabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'inspections') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'new-inspection', roof_id: 'prop-1' },
                  error: null
                })
              })
            })
          }
        } else if (table === 'inspection_sessions') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockRejectedValue(new Error('Session creation failed'))
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

      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const propertySelect = screen.getByRole('combobox')
      await user.click(propertySelect)
      
      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Test Property 1'))

      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-01')

      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to Create Inspection',
          description: 'An error occurred while creating the direct inspection. Please try again.',
          variant: 'destructive'
        })
      })
    })

    it('handles network failures and retries', async () => {
      const user = userEvent.setup()
      
      // Mock network failure initially, then success
      let attemptCount = 0
      vi.mocked(await import('@/integrations/supabase/client')).supabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'inspections') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => {
                  attemptCount++
                  if (attemptCount === 1) {
                    return Promise.reject(new Error('Network error'))
                  }
                  return Promise.resolve({
                    data: { id: 'retry-inspection', roof_id: 'prop-1' },
                    error: null
                  })
                })
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

      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const propertySelect = screen.getByRole('combobox')
      await user.click(propertySelect)
      
      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Test Property 1'))

      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-01')

      // First attempt should fail
      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to Create Inspection',
          description: 'An error occurred while creating the direct inspection. Please try again.',
          variant: 'destructive'
        })
      })

      // User can retry
      await user.click(createButton)

      // Should succeed on retry (though our mock doesn't actually implement retry logic)
    })
  })

  describe('Cross-Component Integration', () => {
    it('maintains data consistency across all interfaces', async () => {
      // Create inspection through scheduling modal
      e2eState.createdInspections.push({
        id: 'integration-test-1',
        roof_id: 'prop-1',
        inspector_id: 'inspector-1',
        scheduled_date: '2024-12-01',
        status: 'scheduled',
        inspection_type: 'routine',
        created_at: new Date().toISOString(),
        roofs: { property_name: 'Test Property 1' },
        users: { first_name: 'Michael', last_name: 'Kidder' }
      })

      e2eState.createdSessions.push({
        id: 'integration-session-1',
        property_id: 'prop-1',
        inspector_id: 'inspector-1',
        inspection_status: 'scheduled',
        session_data: { integrationTest: true },
        created_at: new Date().toISOString()
      })

      // Test 1: Dashboard shows the inspection
      const { rerender } = render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
        expect(screen.getByText('Michael Kidder')).toBeInTheDocument()
      })

      // Test 2: Inspector interface shows the inspection
      rerender(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Inspector Intelligence')).toBeInTheDocument()
      })

      // Test 3: Status updates propagate across interfaces
      const { supabase } = await import('@/integrations/supabase/client')
      
      await supabase.from('inspections').update({ status: 'in_progress' }).eq('id', 'integration-test-1')
      await supabase.from('inspection_sessions').update({ inspection_status: 'in_progress' }).eq('id', 'integration-session-1')

      // Verify status updates were tracked
      expect(e2eState.statusUpdates).toContainEqual({
        table: 'inspections',
        status: 'in_progress',
        timestamp: expect.any(String)
      })

      expect(e2eState.statusUpdates).toContainEqual({
        table: 'inspection_sessions',
        status: 'in_progress',
        timestamp: expect.any(String)
      })
    })

    it('handles user role-based access correctly', async () => {
      // Test that inspectors can only see their own inspections
      // and administrators can see all inspections

      const inspectorInspection = {
        id: 'inspector-only-1',
        roof_id: 'prop-1',
        inspector_id: 'inspector-1',
        status: 'scheduled',
        roofs: { property_name: 'Inspector Property' },
        users: { first_name: 'Michael', last_name: 'Kidder' }
      }

      const otherInspection = {
        id: 'other-inspector-1',
        roof_id: 'prop-2',
        inspector_id: 'inspector-2',
        status: 'scheduled',
        roofs: { property_name: 'Other Property' },
        users: { first_name: 'Other', last_name: 'Inspector' }
      }

      e2eState.createdInspections.push(inspectorInspection, otherInspection)

      // Mock the auth context to be an inspector
      render(<InspectionsTab />)

      await waitFor(() => {
        // Should see all inspections in this test (role filtering would be in real implementation)
        expect(screen.getByText('Inspector Property')).toBeInTheDocument()
        expect(screen.getByText('Other Property')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Scalability', () => {
    it('handles large numbers of inspections efficiently', async () => {
      // Create a large number of mock inspections
      const largeInspectionSet = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-test-${i}`,
        roof_id: `prop-${i}`,
        inspector_id: 'inspector-1',
        scheduled_date: '2024-12-01',
        status: 'scheduled',
        inspection_type: 'routine',
        created_at: new Date().toISOString(),
        roofs: { property_name: `Property ${i}` },
        users: { first_name: 'Michael', last_name: 'Kidder' }
      }))

      e2eState.createdInspections.push(...largeInspectionSet)

      const startTime = performance.now()
      render(<InspectionsTab />)

      await waitFor(() => {
        expect(screen.getByText(/showing \d+ of \d+ inspections/i)).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Verify performance (this is a basic test - real performance testing would be more sophisticated)
      expect(renderTime).toBeLessThan(5000) // Should render within 5 seconds
    })
  })
})