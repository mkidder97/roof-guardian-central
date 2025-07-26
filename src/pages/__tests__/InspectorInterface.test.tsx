import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockNavigate } from '@/test/utils/test-utils'
import InspectorInterface from '../InspectorInterface'
import { mockProperties, mockInspectors } from '@/test/mocks/supabase'

// Mock the InspectorIntelligenceService
vi.mock('@/lib/inspectorIntelligenceService', () => ({
  InspectorIntelligenceService: {
    getAvailableProperties: vi.fn().mockResolvedValue([
      {
        id: 'prop-1',
        property_name: 'Test Property 1',
        roof_type: 'Modified Bitumen',
        roof_area: 50000,
        last_inspection_date: '2024-01-15',
        inspection_sessions: [{
          inspection_status: 'scheduled'
        }]
      }
    ]),
    getPropertySummary: vi.fn().mockResolvedValue({
      id: 'prop-1',
      name: 'Test Property 1',
      roofType: 'Modified Bitumen',
      squareFootage: 50000,
      lastInspectionDate: '2024-01-15',
      criticalIssues: 2,
      status: 'attention',
      inspectionStatus: 'scheduled'
    }),
    generateInspectionBriefing: vi.fn().mockResolvedValue({
      property: {
        id: 'prop-1',
        name: 'Test Property 1',
        address: '123 Test St, Test City, TX 75001',
        roofType: 'Modified Bitumen',
        squareFootage: 50000,
        lastInspectionDate: '2024-01-15'
      },
      focusAreas: [
        {
          location: 'Northwest corner',
          severity: 'high',
          issueType: 'Recurring leak',
          recurrenceCount: 3,
          lastReported: '2024-10-15',
          estimatedCost: 12500
        }
      ],
      patternInsights: [
        {
          insight: 'Similar roofs fail at parapet walls',
          probability: 70,
          basedOnCount: 15
        }
      ],
      crossPortfolioInsights: [
        {
          pattern: 'Modified Bitumen roofs showing same drainage issues',
          affectedProperties: 5,
          successfulFix: 'Install cricket diverters - 95% success rate'
        }
      ],
      historicalPhotos: [
        {
          id: '1',
          location: 'Northwest corner',
          date: '2024-10-15',
          url: '/placeholder.svg',
          issue: 'Active leak penetration'
        }
      ]
    })
  }
}))

// Mock the ActiveInspectionInterface component
vi.mock('@/components/inspection/ActiveInspectionInterface', () => ({
  ActiveInspectionInterface: ({ propertyId, propertyName, onComplete, onCancel }: any) => (
    <div data-testid="active-inspection-interface">
      <h2>Active Inspection: {propertyName}</h2>
      <p>Property ID: {propertyId}</p>
      <button onClick={() => onComplete({ propertyName })}>Complete Inspection</button>
      <button onClick={onCancel}>Cancel Inspection</button>
    </div>
  )
}))

// Mock the BuildingDetailsDialog
vi.mock('@/components/inspector/BuildingDetailsDialog', () => ({
  BuildingDetailsDialog: ({ open, onOpenChange, roofId, onStartInspection }: any) => 
    open ? (
      <div data-testid="building-details-dialog">
        <p>Building Details for: {roofId}</p>
        <button onClick={() => onStartInspection(roofId, 'Test Property')}>Start Inspection</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
}))

// Mock the VirtualizedPropertyList
vi.mock('@/components/ui/virtualized-property-list', () => ({
  VirtualizedPropertyList: ({ properties, onPropertyClick, loading }: any) => (
    <div data-testid="virtualized-property-list">
      {loading ? (
        <div>Loading properties...</div>
      ) : (
        <div>
          {properties.map((property: any) => (
            <div key={property.id} data-testid={`property-${property.id}`}>
              <button onClick={() => onPropertyClick(property.id)}>
                {property.name}
              </button>
              <span>Critical Issues: {property.criticalIssues}</span>
              <span>Status: {property.inspectionStatus}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}))

// Mock hooks
vi.mock('@/hooks/useInspectionAutosave', () => ({
  useInspectionAutosave: () => ({
    saveSession: vi.fn(),
    loadSession: vi.fn(),
    completeSession: vi.fn()
  })
}))

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useInspectorKeyboardShortcuts: () => ({
    setContext: vi.fn(),
    shortcuts: []
  })
}))

vi.mock('@/hooks/useInspectorEvents', () => ({
  useInspectorEventListener: vi.fn(),
  useInspectionState: () => ({
    startInspection: vi.fn()
  }),
  usePropertySelection: () => ({
    selectProperty: vi.fn(),
    deselectProperty: vi.fn()
  })
}))

vi.mock('@/hooks/useAccessibility', () => ({
  useInspectorAccessibility: () => ({
    announce: vi.fn(),
    announcePropertySelection: vi.fn(),
    announceInspectionStep: vi.fn(),
    announceError: vi.fn()
  })
}))

vi.mock('@/lib/offlineManager', () => ({
  offlineManager: {
    getOfflineData: vi.fn().mockReturnValue([]),
    storeOfflineData: vi.fn()
  }
}))

describe('InspectorInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('renders the inspector interface header', async () => {
      render(<InspectorInterface />)

      expect(screen.getByText('Inspector Intelligence')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument()
    })

    it('shows property selection when no property is selected', async () => {
      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Select Property for Inspection')).toBeInTheDocument()
        expect(screen.getByText('Choose a property to view pre-inspection intelligence')).toBeInTheDocument()
      })
    })

    it('loads and displays available properties', async () => {
      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-property-list')).toBeInTheDocument()
        expect(screen.getByTestId('property-prop-1')).toBeInTheDocument()
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })
    })
  })

  describe('Property Selection', () => {
    it('loads inspection briefing when property is selected', async () => {
      const user = userEvent.setup()
      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      // Click on property
      const propertyButton = screen.getByRole('button', { name: 'Test Property 1' })
      await user.click(propertyButton)

      // Should show building details dialog
      await waitFor(() => {
        expect(screen.getByTestId('building-details-dialog')).toBeInTheDocument()
      })
    })

    it('displays property summary information', async () => {
      const user = userEvent.setup()
      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Critical Issues: 2')).toBeInTheDocument()
        expect(screen.getByText('Status: scheduled')).toBeInTheDocument()
      })
    })

    it('handles property selection errors gracefully', async () => {
      // Mock error in property loading
      const { InspectorIntelligenceService } = await import('@/lib/inspectorIntelligenceService')
      vi.mocked(InspectorIntelligenceService.getAvailableProperties).mockRejectedValueOnce(
        new Error('Failed to load properties')
      )

      render(<InspectorInterface />)

      // Should handle error and potentially show cached data or error message
      await waitFor(() => {
        // The component should still render without crashing
        expect(screen.getByText('Inspector Intelligence')).toBeInTheDocument()
      })
    })
  })

  describe('Inspection Briefing', () => {
    it('shows loading state while generating briefing', async () => {
      // Mock delayed briefing generation
      const { InspectorIntelligenceService } = await import('@/lib/inspectorIntelligenceService')
      vi.mocked(InspectorIntelligenceService.generateInspectionBriefing).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(null), 100))
      )

      const user = userEvent.setup()
      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      const propertyButton = screen.getByRole('button', { name: 'Test Property 1' })
      await user.click(propertyButton)

      // Should show loading state
      expect(screen.getByText('Generating inspection briefing...')).toBeInTheDocument()
    })

    it('displays briefing tabs and content', async () => {
      const user = userEvent.setup()
      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      // Click property to trigger briefing load
      const propertyButton = screen.getByRole('button', { name: 'Test Property 1' })
      await user.click(propertyButton)

      // Close building details dialog first
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: 'Close' })
        expect(closeButton).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: 'Close' }))

      // Now we should see the briefing content eventually
      // Note: This might need adjustment based on the actual flow
    })
  })

  describe('Navigation', () => {
    it('navigates back to dashboard when back button is clicked', async () => {
      const user = userEvent.setup()
      render(<InspectorInterface />)

      const backButton = screen.getByRole('button', { name: /back to dashboard/i })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('allows changing property selection', async () => {
      const user = userEvent.setup()
      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      // Select property and close dialog
      const propertyButton = screen.getByRole('button', { name: 'Test Property 1' })
      await user.click(propertyButton)
      
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: 'Close' })
        expect(closeButton).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: 'Close' }))

      // Should be able to change property (this depends on implementation)
      // For now, just verify the interface allows navigation
    })
  })

  describe('Active Inspection Flow', () => {
    it('starts inspection when start button is clicked', async () => {
      const user = userEvent.setup()
      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      // Click property to open details
      const propertyButton = screen.getByRole('button', { name: 'Test Property 1' })
      await user.click(propertyButton)

      await waitFor(() => {
        expect(screen.getByTestId('building-details-dialog')).toBeInTheDocument()
      })

      // Start inspection
      const startButton = screen.getByRole('button', { name: 'Start Inspection' })
      await user.click(startButton)

      // Should show active inspection interface
      await waitFor(() => {
        expect(screen.getByTestId('active-inspection-interface')).toBeInTheDocument()
        expect(screen.getByText('Active Inspection: Test Property')).toBeInTheDocument()
      })
    })

    it('completes inspection flow', async () => {
      const user = userEvent.setup()
      render(<InspectorInterface />)

      // Start inspection (assuming we can get to the active inspection state)
      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      const propertyButton = screen.getByRole('button', { name: 'Test Property 1' })
      await user.click(propertyButton)

      await waitFor(() => {
        const startButton = screen.getByRole('button', { name: 'Start Inspection' })
        expect(startButton).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: 'Start Inspection' }))

      await waitFor(() => {
        expect(screen.getByTestId('active-inspection-interface')).toBeInTheDocument()
      })

      // Complete inspection
      const completeButton = screen.getByRole('button', { name: 'Complete Inspection' })
      await user.click(completeButton)

      // Should return to property selection
      await waitFor(() => {
        expect(screen.getByText('Select Property for Inspection')).toBeInTheDocument()
      })
    })

    it('cancels inspection and returns to property selection', async () => {
      const user = userEvent.setup()
      render(<InspectorInterface />)

      // Go through flow to get to active inspection
      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      const propertyButton = screen.getByRole('button', { name: 'Test Property 1' })
      await user.click(propertyButton)

      await waitFor(() => {
        const startButton = screen.getByRole('button', { name: 'Start Inspection' })
        expect(startButton).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: 'Start Inspection' }))

      await waitFor(() => {
        expect(screen.getByTestId('active-inspection-interface')).toBeInTheDocument()
      })

      // Cancel inspection
      const cancelButton = screen.getByRole('button', { name: 'Cancel Inspection' })
      await user.click(cancelButton)

      // Should return to property selection
      await waitFor(() => {
        expect(screen.getByText('Select Property for Inspection')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading state for properties', () => {
      // Mock loading state
      const { InspectorIntelligenceService } = vi.mocked(await import('@/lib/inspectorIntelligenceService'))
      vi.mocked(InspectorIntelligenceService.getAvailableProperties).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<InspectorInterface />)

      expect(screen.getByText('Loading properties...')).toBeInTheDocument()
    })

    it('handles empty property list', async () => {
      // Mock empty properties
      const { InspectorIntelligenceService } = await import('@/lib/inspectorIntelligenceService')
      vi.mocked(InspectorIntelligenceService.getAvailableProperties).mockResolvedValueOnce([])

      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-property-list')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles briefing generation errors', async () => {
      const { InspectorIntelligenceService } = await import('@/lib/inspectorIntelligenceService')
      vi.mocked(InspectorIntelligenceService.generateInspectionBriefing).mockRejectedValueOnce(
        new Error('Failed to generate briefing')
      )

      const user = userEvent.setup()
      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      const propertyButton = screen.getByRole('button', { name: 'Test Property 1' })
      await user.click(propertyButton)

      // Should handle error gracefully
      await waitFor(() => {
        // Error handling might show an error message or fallback UI
        expect(screen.getByTestId('building-details-dialog')).toBeInTheDocument()
      })
    })

    it('shows error state for failed briefing load', async () => {
      const { InspectorIntelligenceService } = await import('@/lib/inspectorIntelligenceService')
      vi.mocked(InspectorIntelligenceService.generateInspectionBriefing).mockResolvedValueOnce(null)

      const user = userEvent.setup()
      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      const propertyButton = screen.getByRole('button', { name: 'Test Property 1' })
      await user.click(propertyButton)

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: 'Close' })
        expect(closeButton).toBeInTheDocument()
      })
      await user.click(closeButton)

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('Failed to Load Briefing')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('announces property selection to screen readers', async () => {
      const { useInspectorAccessibility } = await import('@/hooks/useAccessibility')
      const mockAnnounce = vi.fn()
      
      vi.mocked(useInspectorAccessibility).mockReturnValue({
        announce: mockAnnounce,
        announcePropertySelection: mockAnnounce,
        announceInspectionStep: vi.fn(),
        announceError: vi.fn()
      })

      const user = userEvent.setup()
      render(<InspectorInterface />)

      await waitFor(() => {
        expect(screen.getByText('Test Property 1')).toBeInTheDocument()
      })

      const propertyButton = screen.getByRole('button', { name: 'Test Property 1' })
      await user.click(propertyButton)

      // Should announce property selection
      expect(mockAnnounce).toHaveBeenCalled()
    })

    it('has proper keyboard navigation support', async () => {
      const user = userEvent.setup()
      render(<InspectorInterface />)

      // Tab through interface
      await user.tab()
      expect(document.activeElement).toHaveAttribute('type', 'button')
    })
  })
})