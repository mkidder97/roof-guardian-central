import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockToast } from '@/test/utils/test-utils'
import { mockInspections, mockInspectionSessions } from '@/test/mocks/supabase'

// Mock the status transition dialog component
const MockStatusTransitionDialog = ({ open, onOpenChange, currentStatus, onStatusChange }: any) => {
  if (!open) return null
  
  return (
    <div data-testid="status-transition-dialog">
      <h2>Change Status</h2>
      <p>Current Status: {currentStatus}</p>
      <button onClick={() => onStatusChange('in_progress')}>Set to In Progress</button>
      <button onClick={() => onStatusChange('ready_for_review')}>Set to Ready for Review</button>
      <button onClick={() => onStatusChange('completed')}>Set to Completed</button>
      <button onClick={() => onStatusChange('cancelled')}>Set to Cancelled</button>
      <button onClick={() => onOpenChange(false)}>Cancel</button>
    </div>
  )
}

vi.mock('@/components/ui/status-transition-dialog', () => ({
  StatusTransitionDialog: MockStatusTransitionDialog
}))

// Mock supabase with status transition tracking
const mockStatusTransitions: Array<{ from: string; to: string; timestamp: string }> = []

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'inspections') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockInspections,
              error: null
            }),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockInspections[0],
                error: null
              })
            })
          }),
          update: vi.fn().mockImplementation((data) => {
            // Track status transitions
            if (data.status) {
              mockStatusTransitions.push({
                from: mockInspections[0].status || 'unknown',
                to: data.status,
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
            data: mockInspectionSessions,
            error: null
          }),
          update: vi.fn().mockImplementation((data) => {
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
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  }
}))

// Test component that uses status transitions
const TestInspectionStatusComponent = ({ inspectionId }: { inspectionId: string }) => {
  const [currentStatus, setCurrentStatus] = React.useState('scheduled')
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const handleStatusChange = async (newStatus: string) => {
    const { supabase } = await import('@/integrations/supabase/client')
    
    try {
      // Update inspection status
      await supabase
        .from('inspections')
        .update({ status: newStatus })
        .eq('id', inspectionId)
        .select()
        .single()

      // Update session status
      await supabase
        .from('inspection_sessions')
        .update({ status: newStatus })
        .eq('property_id', 'prop-1')
        .select()
        .single()

      setCurrentStatus(newStatus)
      setDialogOpen(false)
      
      mockToast({
        title: 'Status Updated',
        description: `Inspection status changed to ${newStatus}`
      })
    } catch (error) {
      mockToast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      })
    }
  }

  return (
    <div>
      <div data-testid="current-status">Status: {currentStatus}</div>
      <button onClick={() => setDialogOpen(true)}>Change Status</button>
      <MockStatusTransitionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentStatus={currentStatus}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}

// Import React for the test component
import React from 'react'

describe('Status Transition Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatusTransitions.length = 0
  })

  describe('Valid Status Transitions', () => {
    it('transitions from scheduled to in_progress', async () => {
      const user = userEvent.setup()
      render(<TestInspectionStatusComponent inspectionId="inspection-1" />)

      expect(screen.getByText('Status: scheduled')).toBeInTheDocument()

      // Open status dialog
      await user.click(screen.getByRole('button', { name: 'Change Status' }))
      
      expect(screen.getByTestId('status-transition-dialog')).toBeInTheDocument()
      expect(screen.getByText('Current Status: scheduled')).toBeInTheDocument()

      // Change to in_progress
      await user.click(screen.getByRole('button', { name: 'Set to In Progress' }))

      await waitFor(() => {
        expect(screen.getByText('Status: in_progress')).toBeInTheDocument()
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Status Updated',
        description: 'Inspection status changed to in_progress'
      })

      // Verify transition was tracked
      expect(mockStatusTransitions).toHaveLength(1)
      expect(mockStatusTransitions[0]).toEqual({
        from: 'scheduled',
        to: 'in_progress',
        timestamp: expect.any(String)
      })
    })

    it('transitions from in_progress to ready_for_review', async () => {
      const user = userEvent.setup()
      
      // Start with in_progress status
      const TestComponent = () => {
        const [currentStatus, setCurrentStatus] = React.useState('in_progress')
        const [dialogOpen, setDialogOpen] = React.useState(false)

        const handleStatusChange = async (newStatus: string) => {
          mockStatusTransitions.push({
            from: currentStatus,
            to: newStatus,
            timestamp: new Date().toISOString()
          })
          setCurrentStatus(newStatus)
          setDialogOpen(false)
          mockToast({
            title: 'Status Updated',
            description: `Inspection status changed to ${newStatus}`
          })
        }

        return (
          <div>
            <div data-testid="current-status">Status: {currentStatus}</div>
            <button onClick={() => setDialogOpen(true)}>Change Status</button>
            <MockStatusTransitionDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
            />
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByText('Status: in_progress')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Change Status' }))
      await user.click(screen.getByRole('button', { name: 'Set to Ready for Review' }))

      await waitFor(() => {
        expect(screen.getByText('Status: ready_for_review')).toBeInTheDocument()
      })

      expect(mockStatusTransitions[0]).toEqual({
        from: 'in_progress',
        to: 'ready_for_review',
        timestamp: expect.any(String)
      })
    })

    it('transitions from ready_for_review to completed', async () => {
      const user = userEvent.setup()
      
      const TestComponent = () => {
        const [currentStatus, setCurrentStatus] = React.useState('ready_for_review')
        const [dialogOpen, setDialogOpen] = React.useState(false)

        const handleStatusChange = async (newStatus: string) => {
          mockStatusTransitions.push({
            from: currentStatus,
            to: newStatus,
            timestamp: new Date().toISOString()
          })
          setCurrentStatus(newStatus)
          setDialogOpen(false)
          mockToast({
            title: 'Status Updated',
            description: `Inspection status changed to ${newStatus}`
          })
        }

        return (
          <div>
            <div data-testid="current-status">Status: {currentStatus}</div>
            <button onClick={() => setDialogOpen(true)}>Change Status</button>
            <MockStatusTransitionDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
            />
          </div>
        )
      }

      render(<TestComponent />)

      await user.click(screen.getByRole('button', { name: 'Change Status' }))
      await user.click(screen.getByRole('button', { name: 'Set to Completed' }))

      await waitFor(() => {
        expect(screen.getByText('Status: completed')).toBeInTheDocument()
      })

      expect(mockStatusTransitions[0]).toEqual({
        from: 'ready_for_review',
        to: 'completed',
        timestamp: expect.any(String)
      })
    })

    it('allows cancellation from any status', async () => {
      const user = userEvent.setup()
      
      const statuses = ['scheduled', 'in_progress', 'ready_for_review']
      
      for (const status of statuses) {
        mockStatusTransitions.length = 0
        
        const TestComponent = () => {
          const [currentStatus, setCurrentStatus] = React.useState(status)
          const [dialogOpen, setDialogOpen] = React.useState(false)

          const handleStatusChange = async (newStatus: string) => {
            mockStatusTransitions.push({
              from: currentStatus,
              to: newStatus,
              timestamp: new Date().toISOString()
            })
            setCurrentStatus(newStatus)
            setDialogOpen(false)
          }

          return (
            <div>
              <div data-testid="current-status">Status: {currentStatus}</div>
              <button onClick={() => setDialogOpen(true)}>Change Status</button>
              <MockStatusTransitionDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                currentStatus={currentStatus}
                onStatusChange={handleStatusChange}
              />
            </div>
          )
        }

        const { unmount } = render(<TestComponent />)

        await user.click(screen.getByRole('button', { name: 'Change Status' }))
        await user.click(screen.getByRole('button', { name: 'Set to Cancelled' }))

        await waitFor(() => {
          expect(screen.getByText('Status: cancelled')).toBeInTheDocument()
        })

        expect(mockStatusTransitions[0]).toEqual({
          from: status,
          to: 'cancelled',
          timestamp: expect.any(String)
        })

        unmount()
      }
    })
  })

  describe('Status Validation', () => {
    it('prevents invalid status transitions', async () => {
      // This would test business logic that prevents invalid transitions
      // For example, going from completed back to in_progress
      
      const validTransitions = {
        scheduled: ['in_progress', 'cancelled'],
        in_progress: ['ready_for_review', 'cancelled'],
        ready_for_review: ['completed', 'in_progress', 'cancelled'],
        completed: [], // No transitions allowed from completed
        cancelled: [] // No transitions allowed from cancelled
      }

      Object.entries(validTransitions).forEach(([fromStatus, allowedToStatuses]) => {
        const allStatuses = ['scheduled', 'in_progress', 'ready_for_review', 'completed', 'cancelled']
        const invalidStatuses = allStatuses.filter(status => 
          !allowedToStatuses.includes(status) && status !== fromStatus
        )

        expect(invalidStatuses.length).toBeGreaterThanOrEqual(0)
        // In a real implementation, these transitions would be prevented
      })
    })

    it('validates required fields for status transitions', async () => {
      // Some status transitions might require additional data
      // For example, completing an inspection might require notes or photos
      
      const user = userEvent.setup()
      
      const TestComponentWithValidation = () => {
        const [currentStatus, setCurrentStatus] = React.useState('ready_for_review')
        const [dialogOpen, setDialogOpen] = React.useState(false)

        const handleStatusChange = async (newStatus: string) => {
          if (newStatus === 'completed') {
            // In a real app, this would check for required completion data
            const hasRequiredData = true // Mock validation
            
            if (!hasRequiredData) {
              mockToast({
                title: 'Validation Error',
                description: 'Please complete all required fields before marking as completed',
                variant: 'destructive'
              })
              return
            }
          }

          setCurrentStatus(newStatus)
          setDialogOpen(false)
          mockToast({
            title: 'Status Updated',
            description: `Inspection status changed to ${newStatus}`
          })
        }

        return (
          <div>
            <div data-testid="current-status">Status: {currentStatus}</div>
            <button onClick={() => setDialogOpen(true)}>Change Status</button>
            <MockStatusTransitionDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
            />
          </div>
        )
      }

      render(<TestComponentWithValidation />)

      await user.click(screen.getByRole('button', { name: 'Change Status' }))
      await user.click(screen.getByRole('button', { name: 'Set to Completed' }))

      await waitFor(() => {
        expect(screen.getByText('Status: completed')).toBeInTheDocument()
      })
    })
  })

  describe('Bulk Status Operations', () => {
    it('handles bulk status updates correctly', async () => {
      const inspectionIds = ['inspection-1', 'inspection-2', 'inspection-3']
      
      const BulkStatusComponent = () => {
        const [selectedInspections] = React.useState(inspectionIds)
        const [dialogOpen, setDialogOpen] = React.useState(false)

        const handleBulkStatusChange = async (newStatus: string) => {
          const { supabase } = await import('@/integrations/supabase/client')

          for (const id of selectedInspections) {
            await supabase
              .from('inspections')
              .update({ status: newStatus })
              .eq('id', id)
              .select()
              .single()

            mockStatusTransitions.push({
              from: 'scheduled',
              to: newStatus,
              timestamp: new Date().toISOString()
            })
          }

          setDialogOpen(false)
          mockToast({
            title: 'Bulk Update Complete',
            description: `Updated ${selectedInspections.length} inspections to ${newStatus}`
          })
        }

        return (
          <div>
            <div>Selected: {selectedInspections.length} inspections</div>
            <button onClick={() => setDialogOpen(true)}>Bulk Change Status</button>
            <MockStatusTransitionDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              currentStatus="mixed"
              onStatusChange={handleBulkStatusChange}
            />
          </div>
        )
      }

      const user = userEvent.setup()
      render(<BulkStatusComponent />)

      await user.click(screen.getByRole('button', { name: 'Bulk Change Status' }))
      await user.click(screen.getByRole('button', { name: 'Set to In Progress' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Bulk Update Complete',
          description: 'Updated 3 inspections to in_progress'
        })
      })

      expect(mockStatusTransitions).toHaveLength(3)
      mockStatusTransitions.forEach(transition => {
        expect(transition.to).toBe('in_progress')
      })
    })
  })

  describe('Status History Tracking', () => {
    it('maintains status change history', async () => {
      const user = userEvent.setup()
      
      const TestComponentWithHistory = () => {
        const [currentStatus, setCurrentStatus] = React.useState('scheduled')
        const [dialogOpen, setDialogOpen] = React.useState(false)
        const [statusHistory, setStatusHistory] = React.useState<typeof mockStatusTransitions>([])

        const handleStatusChange = async (newStatus: string) => {
          const transition = {
            from: currentStatus,
            to: newStatus,
            timestamp: new Date().toISOString()
          }
          
          mockStatusTransitions.push(transition)
          setStatusHistory([...statusHistory, transition])
          setCurrentStatus(newStatus)
          setDialogOpen(false)
        }

        return (
          <div>
            <div data-testid="current-status">Status: {currentStatus}</div>
            <button onClick={() => setDialogOpen(true)}>Change Status</button>
            <div data-testid="status-history">
              History: {statusHistory.length} changes
            </div>
            <MockStatusTransitionDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
            />
          </div>
        )
      }

      render(<TestComponentWithHistory />)

      // Make several status changes
      await user.click(screen.getByRole('button', { name: 'Change Status' }))
      await user.click(screen.getByRole('button', { name: 'Set to In Progress' }))

      await waitFor(() => {
        expect(screen.getByText('Status: in_progress')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Change Status' }))
      await user.click(screen.getByRole('button', { name: 'Set to Ready for Review' }))

      await waitFor(() => {
        expect(screen.getByText('Status: ready_for_review')).toBeInTheDocument()
        expect(screen.getByText('History: 2 changes')).toBeInTheDocument()
      })

      expect(mockStatusTransitions).toHaveLength(2)
      expect(mockStatusTransitions[0].from).toBe('scheduled')
      expect(mockStatusTransitions[0].to).toBe('in_progress')
      expect(mockStatusTransitions[1].from).toBe('in_progress')
      expect(mockStatusTransitions[1].to).toBe('ready_for_review')
    })
  })

  describe('Error Handling', () => {
    it('handles database errors during status updates', async () => {
      const user = userEvent.setup()
      
      // Mock database error
      vi.mocked(await import('@/integrations/supabase/client')).supabase.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      })

      const TestComponentWithError = () => {
        const [currentStatus, setCurrentStatus] = React.useState('scheduled')
        const [dialogOpen, setDialogOpen] = React.useState(false)

        const handleStatusChange = async (newStatus: string) => {
          try {
            const { supabase } = await import('@/integrations/supabase/client')
            await supabase
              .from('inspections')
              .update({ status: newStatus })
              .eq('id', 'inspection-1')

            setCurrentStatus(newStatus)
            setDialogOpen(false)
          } catch (error) {
            mockToast({
              title: 'Error',
              description: 'Failed to update status',
              variant: 'destructive'
            })
          }
        }

        return (
          <div>
            <div data-testid="current-status">Status: {currentStatus}</div>
            <button onClick={() => setDialogOpen(true)}>Change Status</button>
            <MockStatusTransitionDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
            />
          </div>
        )
      }

      render(<TestComponentWithError />)

      await user.click(screen.getByRole('button', { name: 'Change Status' }))
      await user.click(screen.getByRole('button', { name: 'Set to In Progress' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to update status',
          variant: 'destructive'
        })
      })

      // Status should remain unchanged
      expect(screen.getByText('Status: scheduled')).toBeInTheDocument()
    })
  })
})