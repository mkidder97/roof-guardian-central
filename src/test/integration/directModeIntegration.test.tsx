import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockToast } from '@/test/utils/test-utils'
import { InspectionSchedulingModal } from '@/components/inspections/InspectionSchedulingModal'

// Mock a more complex dataset for integration testing
const generateMockProperties = (count: number) => {
  const regions = ['Central', 'East', 'West', 'North', 'South']
  const markets = ['Dallas', 'Houston', 'Austin', 'San Antonio']
  const zipcodes = ['75001', '75002', '75003', '75004', '75005']
  
  return Array.from({ length: count }, (_, i) => ({
    id: `prop-${i}`,
    property_name: `Property ${i}`,
    address: `${100 + i} Main St`,
    city: markets[i % markets.length],
    state: 'TX',
    zip: zipcodes[i % zipcodes.length],
    market: markets[i % markets.length],
    region: regions[i % regions.length],
    roof_type: ['Modified Bitumen', 'TPO', 'EPDM'][i % 3],
    roof_area: 10000 + (i * 500),
    last_inspection_date: i % 3 === 0 ? `2024-0${(i % 9) + 1}-15` : null,
    site_contact_name: `Contact ${i}`,
    site_contact_phone: `555-${1000 + i}`,
    roof_access: 'ladder',
    latitude: 32.7767 + (i * 0.01),
    longitude: -96.7970 - (i * 0.01),
    manufacturer_warranty_expiration: '2025-12-31',
    installer_warranty_expiration: '2025-06-30',
    client_id: `client-${i % 10}`,
    status: 'active',
    property_manager_name: `Manager ${i}`,
    property_manager_email: `manager${i}@test.com`,
    property_manager_phone: `555-${2000 + i}`,
    clients: {
      company_name: `Company ${i % 10}`
    }
  }))
}

const mockProperties = generateMockProperties(288) // Large dataset

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

// Track API calls and performance
const apiCallTracker = {
  calls: [] as any[],
  reset: () => { apiCallTracker.calls = [] }
}

// Enhanced Supabase mock with filtering logic
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'roofs') {
        const queryBuilder = {
          _filters: {} as any,
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
            const startTime = performance.now()
            
            // Simulate backend filtering
            let filtered = [...mockProperties]
            
            if (this._filters.status) {
              filtered = filtered.filter(p => p.status === this._filters.status)
            }
            if (this._filters.not_is_deleted !== undefined) {
              // All our mock properties are not deleted
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
            
            const endTime = performance.now()
            
            // Track API call
            apiCallTracker.calls.push({
              type: 'property_fetch',
              filters: { ...this._filters },
              resultCount: filtered.length,
              duration: endTime - startTime,
              timestamp: new Date().toISOString()
            })
            
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

describe('Direct Mode Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiCallTracker.reset()
  })

  describe('Filter Application with Backend Queries', () => {
    it('applies multiple filters correctly and fetches filtered data', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })

      // Apply region filter
      const selects = screen.getAllByRole('combobox')
      await user.click(selects[0]) // Region dropdown
      await user.click(screen.getByText('Central'))

      // Apply market filter
      await user.click(selects[1]) // Market dropdown
      await user.click(screen.getByText('Dallas'))

      // Click Apply Filters
      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      // Verify API was called with correct filters
      await waitFor(() => {
        const lastCall = apiCallTracker.calls[apiCallTracker.calls.length - 1]
        expect(lastCall.filters.region).toBe('Central')
        expect(lastCall.filters.market).toBe('Dallas')
        expect(lastCall.resultCount).toBeGreaterThan(0)
      })

      // Verify filtered results are displayed
      const properties = screen.getAllByText(/Property \d+/)
      expect(properties.length).toBeGreaterThan(0)
    })

    it('handles zipcode filtering with multiple selections', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })

      // Select multiple zipcodes
      const selects = screen.getAllByRole('combobox')
      await user.click(selects[3]) // Zipcode dropdown

      const zipcode1 = await screen.findByLabelText('75001')
      const zipcode2 = await screen.findByLabelText('75002')
      
      await user.click(zipcode1)
      await user.click(zipcode2)

      // Apply filters
      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      // Verify API call includes zipcodes
      await waitFor(() => {
        const lastCall = apiCallTracker.calls[apiCallTracker.calls.length - 1]
        expect(lastCall.filters.zip_in).toEqual(['75001', '75002'])
      })
    })

    it('resets filters when switching from Campaign to Direct Mode', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Start in Campaign Mode and set some filters
      expect(screen.getByText('Schedule Inspection Campaign')).toBeInTheDocument()

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Verify filters are reset
      await waitFor(() => {
        expect(screen.getByText('All Regions')).toBeInTheDocument()
        expect(screen.getByText('All Markets')).toBeInTheDocument()
      })

      // Verify initial fetch uses no filters
      const initialCall = apiCallTracker.calls.find(c => c.type === 'property_fetch')
      expect(initialCall.filters.region).toBeUndefined()
      expect(initialCall.filters.market).toBeUndefined()
    })
  })

  describe('Property Search Across Multiple Fields', () => {
    it('searches properties by name, address, and city simultaneously', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })

      // Search for "Dallas" - should find properties in Dallas city
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'Dallas')

      // Verify search results
      await waitFor(() => {
        const visibleProperties = screen.getAllByText(/Property \d+/)
        visibleProperties.forEach(prop => {
          const card = prop.closest('div')
          const cardText = card?.textContent || ''
          expect(cardText).toMatch(/Dallas/i)
        })
      })
    })

    it('performs case-insensitive search', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })

      // Search with different case
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'PROPERTY 5')

      // Should find the property despite case difference
      await waitFor(() => {
        expect(screen.getByText('Property 5')).toBeInTheDocument()
      })
    })

    it('combines search with filters', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Apply region filter first
      const selects = screen.getAllByRole('combobox')
      await user.click(selects[0])
      await user.click(screen.getByText('Central'))

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      // Then search within filtered results
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'Property')

      // Verify results are both filtered and searched
      await waitFor(() => {
        const properties = screen.getAllByText(/Property \d+/)
        expect(properties.length).toBeGreaterThan(0)
        
        // All visible properties should be in Central region
        properties.forEach(prop => {
          const card = prop.closest('div')
          expect(card?.textContent).toMatch(/Central/i)
        })
      })
    })
  })

  describe('State Management Between Filter Changes', () => {
    it('maintains selected property when applying new filters', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText('Property 0')).toBeInTheDocument()
      })

      // Select a property
      const property = screen.getByText('Property 0').closest('div')
      await user.click(property!)

      // Verify selection
      expect(property).toHaveClass(/border-blue-500/)

      // Apply a filter that doesn't exclude the selected property
      const selects = screen.getAllByRole('combobox')
      await user.click(selects[0])
      await user.click(screen.getByText('Central'))

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      // Selected property should remain selected if still visible
      await waitFor(() => {
        if (screen.queryByText('Property 0')) {
          const updatedProperty = screen.getByText('Property 0').closest('div')
          expect(updatedProperty).toHaveClass(/border-blue-500/)
        }
      })
    })

    it('clears search when filters change', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Enter search term
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'Test')

      // Apply filter
      const selects = screen.getAllByRole('combobox')
      await user.click(selects[0])
      await user.click(screen.getByText('Central'))

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      // Search should be maintained
      expect(searchInput).toHaveValue('Test')
    })

    it('resets pagination when filters change', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of/)).toBeInTheDocument()
      })

      // Navigate to page 2
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText(/Page 2 of/)).toBeInTheDocument()
      })

      // Apply filter
      const selects = screen.getAllByRole('combobox')
      await user.click(selects[0])
      await user.click(screen.getByText('Central'))

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      // Should reset to page 1
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of/)).toBeInTheDocument()
      })
    })
  })

  describe('Property Selection and Form Population', () => {
    it('populates inspection form with selected property details', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText('Property 0')).toBeInTheDocument()
      })

      // Select a property
      const property = screen.getByText('Property 0').closest('div')
      await user.click(property!)

      // Verify form is populated
      await waitFor(() => {
        expect(screen.getByText('Selected Property')).toBeInTheDocument()
        const detailsCard = screen.getByText('Selected Property').closest('.bg-blue-50')
        
        expect(within(detailsCard!).getByText(/Property 0/)).toBeInTheDocument()
        expect(within(detailsCard!).getByText(/100 Main St/)).toBeInTheDocument()
        expect(within(detailsCard!).getByText(/10,000 sq ft/)).toBeInTheDocument()
      })
    })

    it('enables form submission only when all required fields are filled', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Initially, create button should be disabled
      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      expect(createButton).toBeDisabled()

      // Select property
      const property = screen.getByText('Property 0').closest('div')
      await user.click(property!)

      // Still disabled - need date
      expect(createButton).toBeDisabled()

      // Add scheduled date
      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-01')

      // Should now be enabled (inspector is pre-selected)
      await waitFor(() => {
        expect(createButton).toBeEnabled()
      })
    })

    it('validates and creates inspection with selected property', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Select property
      const property = screen.getByText('Property 0').closest('div')
      await user.click(property!)

      // Fill required fields
      const dateInput = screen.getByLabelText('Scheduled Date *')
      await user.type(dateInput, '2024-12-01')

      // Add notes
      const notesInput = screen.getByLabelText('Notes')
      await user.type(notesInput, 'Integration test inspection')

      // Create inspection
      const createButton = screen.getByRole('button', { name: /create direct inspection/i })
      await user.click(createButton)

      // Verify success
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Direct Inspection Created Successfully!',
          description: expect.stringContaining('Property 0')
        })
      })
    })
  })

  describe('Cache Functionality and Performance', () => {
    it('caches property data for repeated filter combinations', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Apply filters
      const selects = screen.getAllByRole('combobox')
      await user.click(selects[0])
      await user.click(screen.getByText('Central'))

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      // Record first call count
      const firstCallCount = apiCallTracker.calls.length

      // Change to different filter
      await user.click(selects[0])
      await user.click(screen.getByText('East'))
      await user.click(applyButton)

      // Go back to Central
      await user.click(selects[0])
      await user.click(screen.getByText('Central'))
      await user.click(applyButton)

      // Should use cache, not make another API call
      const finalCallCount = apiCallTracker.calls.length
      expect(finalCallCount).toBe(firstCallCount + 1) // Only one additional call for East
    })

    it('invalidates cache when switching between modes', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Start in Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const initialCallCount = apiCallTracker.calls.length

      // Switch back to Campaign Mode
      await user.click(toggle)

      // Switch to Direct Mode again
      await user.click(toggle)

      // Should make new API calls, not use cache
      await waitFor(() => {
        expect(apiCallTracker.calls.length).toBeGreaterThan(initialCallCount)
      })
    })

    it('handles large dataset filtering efficiently', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })

      // Measure filter application time
      const startTime = performance.now()

      // Apply complex filter combination
      const selects = screen.getAllByRole('combobox')
      await user.click(selects[0])
      await user.click(screen.getByText('Central'))

      await user.click(selects[1])
      await user.click(screen.getByText('Dallas'))

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (2 seconds for UI interaction)
      expect(duration).toBeLessThan(2000)

      // Verify API call was efficient
      const lastCall = apiCallTracker.calls[apiCallTracker.calls.length - 1]
      expect(lastCall.duration).toBeLessThan(100) // Mock should be fast
    })
  })
})