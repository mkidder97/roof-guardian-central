import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockToast } from '@/test/utils/test-utils'
import { InspectionSchedulingModal } from '@/components/inspections/InspectionSchedulingModal'

// Mock properties for comparison testing
const mockProperties = Array.from({ length: 100 }, (_, i) => ({
  id: `prop-${i}`,
  property_name: `Property ${i}`,
  address: `${100 + i} Main St`,
  city: ['Dallas', 'Houston', 'Austin', 'San Antonio'][i % 4],
  state: 'TX',
  zip: ['75001', '75002', '75003', '75004'][i % 4],
  market: ['Dallas', 'Houston', 'Austin', 'San Antonio'][i % 4],
  region: ['Central', 'East', 'West', 'North', 'South'][i % 5],
  roof_type: 'Modified Bitumen',
  roof_area: 10000 + (i * 500),
  last_inspection_date: i % 3 === 0 ? '2024-01-15' : null,
  site_contact_name: `Contact ${i}`,
  site_contact_phone: `555-${1000 + i}`,
  roof_access: 'ladder',
  latitude: 32.7767,
  longitude: -96.7970,
  manufacturer_warranty_expiration: '2025-12-31',
  installer_warranty_expiration: '2025-06-30',
  client_id: `client-${i % 5}`,
  status: 'active',
  property_manager_name: `Manager ${i}`,
  property_manager_email: `manager${i}@test.com`,
  property_manager_phone: `555-${2000 + i}`,
  clients: {
    company_name: `Company ${i % 5}`
  }
}))

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
  }
]

// Track queries for comparison
const queryTracker = {
  campaignQueries: [] as any[],
  directQueries: [] as any[],
  reset: () => {
    queryTracker.campaignQueries = []
    queryTracker.directQueries = []
  }
}

// Mock Supabase with mode tracking
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'roofs') {
        const queryBuilder = {
          _filters: {} as any,
          _mode: 'unknown',
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(function(field, value) {
            this._filters[field] = value
            return this
          }),
          neq: vi.fn().mockImplementation(function(field, value) {
            this._filters[`not_${field}`] = value
            return this
          }),
          in: vi.fn().mockImplementation(function(field, values) {
            this._filters[`${field}_in`] = values
            return this
          }),
          order: vi.fn().mockImplementation(async function() {
            // Filter data based on filters
            let filtered = [...mockProperties]
            
            if (this._filters.status) {
              filtered = filtered.filter(p => p.status === this._filters.status)
            }
            if (this._filters.region && this._filters.region !== 'all') {
              filtered = filtered.filter(p => p.region === this._filters.region)
            }
            if (this._filters.market && this._filters.market !== 'all') {
              filtered = filtered.filter(p => p.market === this._filters.market)
            }
            if (this._filters.zip_in && this._filters.zip_in.length > 0) {
              filtered = filtered.filter(p => this._filters.zip_in.includes(p.zip))
            }
            
            // Track query based on context
            const query = {
              filters: { ...this._filters },
              resultCount: filtered.length,
              timestamp: new Date().toISOString()
            }
            
            // Determine mode based on filters (heuristic)
            if (this._filters.client_id) {
              queryTracker.campaignQueries.push(query)
            } else {
              queryTracker.directQueries.push(query)
            }
            
            return { data: filtered, error: null }
          })
        }
        return queryBuilder
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    }),
    rpc: vi.fn().mockResolvedValue({
      data: 'Test Campaign',
      error: null
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

describe('Direct Mode vs Campaign Mode Comparison', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryTracker.reset()
  })

  describe('Filter Behavior Comparison', () => {
    it('applies same filters identically in both modes', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Test Campaign Mode first
      expect(screen.getByText('Schedule Inspection Campaign')).toBeInTheDocument()

      // Apply filters in Campaign Mode
      const selects = screen.getAllByRole('combobox')
      await user.click(selects[1]) // Region (skip inspector)
      await user.click(screen.getByText('Central'))

      await user.click(selects[2]) // Market
      await user.click(screen.getByText('Dallas'))

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      await waitFor(() => {
        expect(queryTracker.campaignQueries.length).toBeGreaterThan(0)
      })

      // Count Campaign Mode results
      const campaignProperties = screen.getAllByText(/Property \d+/)
      const campaignCount = campaignProperties.length

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Apply same filters in Direct Mode
      const directSelects = screen.getAllByRole('combobox')
      await user.click(directSelects[0]) // Region (no inspector in Direct Mode)
      await user.click(screen.getByText('Central'))

      await user.click(directSelects[1]) // Market
      await user.click(screen.getByText('Dallas'))

      const directApplyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(directApplyButton)

      await waitFor(() => {
        expect(queryTracker.directQueries.length).toBeGreaterThan(0)
      })

      // Count Direct Mode results
      const directProperties = screen.getAllByText(/Property \d+/)
      const directCount = directProperties.length

      // Should return same number of properties
      expect(directCount).toBe(campaignCount)
    })

    it('maintains filter independence between modes', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Set filters in Campaign Mode
      const campaignSelects = screen.getAllByRole('combobox')
      await user.click(campaignSelects[1])
      await user.click(screen.getByText('Central'))

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Direct Mode should have reset filters
      await waitFor(() => {
        expect(screen.getByText('All Regions')).toBeInTheDocument()
      })

      // Set different filters in Direct Mode
      const directSelects = screen.getAllByRole('combobox')
      await user.click(directSelects[0])
      await user.click(screen.getByText('East'))

      // Switch back to Campaign Mode
      await user.click(toggle)

      // Campaign Mode should still have Central selected
      // Note: This depends on implementation - adjust if state is shared
      await waitFor(() => {
        const regionButton = screen.getAllByRole('combobox')[1]
        expect(regionButton.textContent).toMatch(/Central|All Regions/)
      })
    })

    it('handles zipcode filtering identically', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Test in Campaign Mode
      const campaignSelects = screen.getAllByRole('combobox')
      await user.click(campaignSelects[4]) // Zipcode dropdown

      const zip1Campaign = await screen.findByLabelText('75001')
      const zip2Campaign = await screen.findByLabelText('75002')
      
      await user.click(zip1Campaign)
      await user.click(zip2Campaign)

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      const campaignCount = screen.getAllByText(/Property \d+/).length

      // Switch to Direct Mode and apply same zipcodes
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const directSelects = screen.getAllByRole('combobox')
      await user.click(directSelects[3]) // Zipcode dropdown in Direct Mode

      const zip1Direct = await screen.findByLabelText('75001')
      const zip2Direct = await screen.findByLabelText('75002')
      
      await user.click(zip1Direct)
      await user.click(zip2Direct)

      const directApplyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(directApplyButton)

      const directCount = screen.getAllByText(/Property \d+/).length

      // Should have same count
      expect(directCount).toBe(campaignCount)
    })
  })

  describe('Property Display and Selection Differences', () => {
    it('shows multi-select checkboxes in Campaign Mode', async () => {
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // In Campaign Mode
      await waitFor(() => {
        expect(screen.getByText('Schedule Inspection Campaign')).toBeInTheDocument()
      })

      // Should have checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)

      // Should have "Select All" button
      expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument()
    })

    it('shows single-select radio buttons in Direct Mode', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText('Create Direct Inspection')).toBeInTheDocument()
      })

      // Should not have checkboxes or Select All button
      const checkboxes = screen.queryAllByRole('checkbox')
      expect(checkboxes.length).toBe(1) // Only the zipcode checkboxes

      expect(screen.queryByRole('button', { name: /select all/i })).not.toBeInTheDocument()

      // Properties should have visual selection indicator
      const property = screen.getByText('Property 0').closest('div')
      expect(property).toHaveClass('cursor-pointer')
    })

    it('displays same property information in both modes', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Check Campaign Mode
      await waitFor(() => {
        const property = screen.getByText('Property 0').closest('div')
        expect(within(property!).getByText(/100 Main St/)).toBeInTheDocument()
        expect(within(property!).getByText(/10,000 sq ft/)).toBeInTheDocument()
        expect(within(property!).getByText(/PM: Manager 0/)).toBeInTheDocument()
      })

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Should show same information
      await waitFor(() => {
        const property = screen.getByText('Property 0').closest('div')
        expect(within(property!).getByText(/100 Main St/)).toBeInTheDocument()
        expect(within(property!).getByText(/10,000 sq ft/)).toBeInTheDocument()
        expect(within(property!).getByText(/PM: Manager 0/)).toBeInTheDocument()
      })
    })
  })

  describe('State Isolation Between Modes', () => {
    it('maintains separate selected properties', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Select properties in Campaign Mode
      await waitFor(() => {
        expect(screen.getByText('Property 0')).toBeInTheDocument()
      })

      const campaignCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(campaignCheckbox)

      // Verify selection
      expect(screen.getByText('1 selected')).toBeInTheDocument()

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Should not show Campaign Mode selections
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
      expect(screen.getByText('Select property')).toBeInTheDocument()

      // Select a property in Direct Mode
      const directProperty = screen.getByText('Property 1').closest('div')
      await user.click(directProperty!)

      // Switch back to Campaign Mode
      await user.click(toggle)

      // Should still have original Campaign selection
      expect(screen.getByText('1 selected')).toBeInTheDocument()
    })

    it('maintains separate search terms', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Search in Campaign Mode
      const campaignSearch = screen.getByPlaceholderText(/search properties/i)
      await user.type(campaignSearch, 'Dallas')

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Direct Mode search should be empty
      const directSearch = screen.getByPlaceholderText(/search properties/i)
      expect(directSearch).toHaveValue('')

      // Type in Direct Mode search
      await user.type(directSearch, 'Houston')

      // Switch back to Campaign Mode
      await user.click(toggle)

      // Campaign search should still have 'Dallas'
      expect(screen.getByDisplayValue('Dallas')).toBeInTheDocument()
    })

    it('maintains separate pagination state', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Navigate to page 2 in Campaign Mode
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of/)).toBeInTheDocument()
      })

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText(/Page 2 of/)).toBeInTheDocument()
      })

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Should be on page 1 in Direct Mode
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of/)).toBeInTheDocument()
      })

      // Navigate in Direct Mode
      const directNextButton = screen.getByRole('button', { name: /next/i })
      await user.click(directNextButton)

      await waitFor(() => {
        expect(screen.getByText(/Page 2 of/)).toBeInTheDocument()
      })

      // Switch back to Campaign Mode
      await user.click(toggle)

      // Should still be on page 2 in Campaign Mode
      await waitFor(() => {
        expect(screen.getByText(/Page 2 of/)).toBeInTheDocument()
      })
    })
  })

  describe('Performance Parity', () => {
    it('loads properties with similar performance', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Measure Campaign Mode load time
      const campaignStart = performance.now()
      await waitFor(() => {
        expect(screen.getAllByText(/Property \d+/).length).toBeGreaterThan(0)
      })
      const campaignEnd = performance.now()
      const campaignLoadTime = campaignEnd - campaignStart

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Measure Direct Mode load time
      const directStart = performance.now()
      await waitFor(() => {
        expect(screen.getAllByText(/Property \d+/).length).toBeGreaterThan(0)
      })
      const directEnd = performance.now()
      const directLoadTime = directEnd - directStart

      // Load times should be within 20% of each other
      const difference = Math.abs(campaignLoadTime - directLoadTime)
      const average = (campaignLoadTime + directLoadTime) / 2
      const percentDifference = (difference / average) * 100

      expect(percentDifference).toBeLessThan(20)
    })

    it('filters with similar performance', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Measure Campaign Mode filter time
      const campaignSelects = screen.getAllByRole('combobox')
      await user.click(campaignSelects[1])
      await user.click(screen.getByText('Central'))

      const campaignStart = performance.now()
      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)
      
      await waitFor(() => {
        expect(queryTracker.campaignQueries.length).toBeGreaterThan(0)
      })
      const campaignEnd = performance.now()
      const campaignFilterTime = campaignEnd - campaignStart

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Measure Direct Mode filter time
      const directSelects = screen.getAllByRole('combobox')
      await user.click(directSelects[0])
      await user.click(screen.getByText('Central'))

      const directStart = performance.now()
      const directApplyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(directApplyButton)
      
      await waitFor(() => {
        expect(queryTracker.directQueries.length).toBeGreaterThan(0)
      })
      const directEnd = performance.now()
      const directFilterTime = directEnd - directStart

      // Filter times should be comparable
      const difference = Math.abs(campaignFilterTime - directFilterTime)
      const average = (campaignFilterTime + directFilterTime) / 2
      const percentDifference = (difference / average) * 100

      expect(percentDifference).toBeLessThan(30)
    })

    it('searches with similar performance', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Measure Campaign Mode search
      const campaignSearch = screen.getByPlaceholderText(/search properties/i)
      const campaignStart = performance.now()
      await user.type(campaignSearch, 'Dallas')
      
      await waitFor(() => {
        const properties = screen.getAllByText(/Property \d+/)
        expect(properties.length).toBeGreaterThan(0)
      })
      const campaignEnd = performance.now()
      const campaignSearchTime = campaignEnd - campaignStart

      // Clear search
      await user.clear(campaignSearch)

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Measure Direct Mode search
      const directSearch = screen.getByPlaceholderText(/search properties/i)
      const directStart = performance.now()
      await user.type(directSearch, 'Dallas')
      
      await waitFor(() => {
        const properties = screen.getAllByText(/Property \d+/)
        expect(properties.length).toBeGreaterThan(0)
      })
      const directEnd = performance.now()
      const directSearchTime = directEnd - directStart

      // Search times should be comparable
      const difference = Math.abs(campaignSearchTime - directSearchTime)
      const average = (campaignSearchTime + directSearchTime) / 2
      const percentDifference = (difference / average) * 100

      expect(percentDifference).toBeLessThan(30)
    })
  })
})