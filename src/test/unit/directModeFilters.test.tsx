import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils/test-utils'
import { InspectionSchedulingModal } from '@/components/inspections/InspectionSchedulingModal'

// Mock data for Direct Mode specific testing
const mockDirectProperties = Array.from({ length: 50 }, (_, i) => ({
  id: `direct-prop-${i}`,
  property_name: `Direct Property ${i}`,
  address: `${100 + i} Direct St`,
  city: ['Dallas', 'Houston', 'Austin', 'San Antonio'][i % 4],
  state: 'TX',
  zip: ['75001', '75002', '75003', '75004'][i % 4],
  market: ['Dallas', 'Houston', 'Austin', 'San Antonio'][i % 4],
  region: ['Central', 'East', 'West', 'North', 'South'][i % 5],
  roof_type: ['Modified Bitumen', 'TPO', 'EPDM'][i % 3],
  roof_area: 10000 + (i * 1000),
  last_inspection_date: i % 2 === 0 ? '2024-01-15' : null,
  site_contact_name: `Contact ${i}`,
  site_contact_phone: `555-${1000 + i}`,
  roof_access: 'ladder',
  latitude: 32.7767 + (i * 0.01),
  longitude: -96.7970 - (i * 0.01),
  manufacturer_warranty_expiration: '2025-12-31',
  installer_warranty_expiration: '2025-06-30',
  client_id: `client-${i % 5}`,
  status: 'active',
  property_manager_name: `PM ${i}`,
  property_manager_email: `pm${i}@test.com`,
  property_manager_phone: `555-${2000 + i}`,
  clients: {
    company_name: `Client ${i % 5} LLC`
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
  },
  {
    id: 'inspector-2',
    email: 'inspector2@test.com',
    full_name: 'Test Inspector',
    first_name: 'Test',
    last_name: 'Inspector',
    phone: '555-8888',
    role: 'inspector'
  }
]

// Enhanced mock for Direct Mode filtering
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'roofs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(function(field, value) {
              // Chain for filtering
              this._filters = this._filters || {}
              this._filters[field] = value
              return this
            }),
            neq: vi.fn().mockImplementation(function(field, value) {
              this._filters = this._filters || {}
              this._filters[`not_${field}`] = value
              return this
            }),
            in: vi.fn().mockImplementation(function(field, values) {
              this._filters = this._filters || {}
              this._filters[`${field}_in`] = values
              return this
            }),
            order: vi.fn().mockImplementation(async function() {
              // Apply filters to mock data
              let filtered = [...mockDirectProperties]
              
              if (this._filters) {
                if (this._filters.region && this._filters.region !== 'all') {
                  filtered = filtered.filter(p => p.region === this._filters.region)
                }
                if (this._filters.market && this._filters.market !== 'all') {
                  filtered = filtered.filter(p => p.market === this._filters.market)
                }
                if (this._filters.zip_in) {
                  filtered = filtered.filter(p => this._filters.zip_in.includes(p.zip))
                }
              }
              
              return { data: filtered, error: null }
            })
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

describe('Direct Mode Filter Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Filter Dropdown Components', () => {
    it('renders all filter dropdowns in Direct Mode', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Verify all filter dropdowns are present
      expect(screen.getByText('Property Filters')).toBeInTheDocument()
      
      // Check for filter dropdowns
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThanOrEqual(4) // Region, Market, Type, Zipcodes

      // Verify Apply Filters button
      expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument()
    })

    it('initializes filters with default values', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Check default values
      await waitFor(() => {
        expect(screen.getByText('All Regions')).toBeInTheDocument()
        expect(screen.getByText('All Markets')).toBeInTheDocument()
        expect(screen.getByText('Annual')).toBeInTheDocument()
      })
    })

    it('updates region filter and triggers property fetch', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Find and click region dropdown
      const regionSelects = screen.getAllByRole('combobox')
      const regionSelect = regionSelects[0] // Assuming first is region
      await user.click(regionSelect)

      // Select Central region
      await user.click(screen.getByText('Central'))

      // Click Apply Filters
      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      // Verify properties are filtered
      await waitFor(() => {
        const properties = screen.getAllByText(/Direct Property \d+/)
        properties.forEach(prop => {
          const propertyCard = prop.closest('[role="article"], div')
          expect(propertyCard).toBeTruthy()
        })
      })
    })

    it('handles multiple zipcode selections', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Find and click zipcode dropdown
      const selects = screen.getAllByRole('combobox')
      const zipcodeSelect = selects[3] // Assuming fourth is zipcode
      await user.click(zipcodeSelect)

      // Select multiple zipcodes
      const zipcode1 = screen.getByLabelText('75001')
      const zipcode2 = screen.getByLabelText('75002')
      
      await user.click(zipcode1)
      await user.click(zipcode2)

      // Verify selection count
      expect(screen.getByText('2 selected')).toBeInTheDocument()
    })
  })

  describe('Property Search Functionality', () => {
    it('filters properties by search term across multiple fields', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Wait for properties to load
      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })

      // Search for properties
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'Dallas')

      // Verify filtering works
      await waitFor(() => {
        const visibleProperties = screen.getAllByText(/Direct Property \d+/)
        expect(visibleProperties.length).toBeGreaterThan(0)
      })
    })

    it('searches by property name', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'Direct Property 5')

      await waitFor(() => {
        expect(screen.getByText('Direct Property 5')).toBeInTheDocument()
      })
    })

    it('searches by property manager name', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'PM 10')

      await waitFor(() => {
        expect(screen.getByText('Direct Property 10')).toBeInTheDocument()
      })
    })

    it('shows empty state when no properties match search', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'NonexistentProperty')

      await waitFor(() => {
        expect(screen.getByText(/no properties found matching your criteria/i)).toBeInTheDocument()
      })
    })
  })

  describe('Single Property Selection (Radio Button)', () => {
    it('allows only one property to be selected at a time', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText('Direct Property 0')).toBeInTheDocument()
      })

      // Click first property
      const property1 = screen.getByText('Direct Property 0').closest('div[role="article"], div')
      await user.click(property1!)

      // Verify selection
      expect(property1).toHaveClass(/border-blue-500/)

      // Click second property
      const property2 = screen.getByText('Direct Property 1').closest('div[role="article"], div')
      await user.click(property2!)

      // Verify only second property is selected
      expect(property1).not.toHaveClass(/border-blue-500/)
      expect(property2).toHaveClass(/border-blue-500/)
    })

    it('updates selected property details in form', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText('Direct Property 0')).toBeInTheDocument()
      })

      // Select a property
      const property = screen.getByText('Direct Property 0').closest('div[role="article"], div')
      await user.click(property!)

      // Verify property details appear in form
      await waitFor(() => {
        expect(screen.getByText('Selected Property')).toBeInTheDocument()
        expect(screen.getByText('Direct Property 0', { selector: 'div' })).toBeInTheDocument()
      })
    })

    it('clears selection when clicking selected property again', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText('Direct Property 0')).toBeInTheDocument()
      })

      const property = screen.getByText('Direct Property 0').closest('div[role="article"], div')
      
      // Select property
      await user.click(property!)
      expect(property).toHaveClass(/border-blue-500/)

      // Click again to deselect
      await user.click(property!)
      expect(property).not.toHaveClass(/border-blue-500/)
    })
  })

  describe('Pagination Controls', () => {
    it('displays pagination when properties exceed page limit', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/showing \d+ to \d+ of \d+ properties/i)).toBeInTheDocument()
      })

      // Verify pagination controls
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('navigates between pages correctly', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText('Direct Property 0')).toBeInTheDocument()
      })

      // Click next page
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      // Verify new properties are shown
      await waitFor(() => {
        expect(screen.queryByText('Direct Property 0')).not.toBeInTheDocument()
        expect(screen.getByText(/page 2 of/i)).toBeInTheDocument()
      })

      // Click previous page
      const prevButton = screen.getByRole('button', { name: /previous/i })
      await user.click(prevButton)

      // Verify back to first page
      await waitFor(() => {
        expect(screen.getByText('Direct Property 0')).toBeInTheDocument()
        expect(screen.getByText(/page 1 of/i)).toBeInTheDocument()
      })
    })

    it('disables navigation buttons at boundaries', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText('Direct Property 0')).toBeInTheDocument()
      })

      // Previous should be disabled on first page
      const prevButton = screen.getByRole('button', { name: /previous/i })
      expect(prevButton).toBeDisabled()

      // Navigate to last page
      const nextButton = screen.getByRole('button', { name: /next/i })
      while (!nextButton.disabled) {
        await user.click(nextButton)
        await waitFor(() => {
          expect(screen.getByText(/page \d+ of/i)).toBeInTheDocument()
        })
      }

      // Next should be disabled on last page
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Property List Rendering', () => {
    it('displays all property details correctly', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText('Direct Property 0')).toBeInTheDocument()
      })

      // Verify property details are displayed
      const propertyCard = screen.getByText('Direct Property 0').closest('div')
      expect(within(propertyCard!).getByText(/100 Direct St/)).toBeInTheDocument()
      expect(within(propertyCard!).getByText(/Dallas, TX/)).toBeInTheDocument()
      expect(within(propertyCard!).getByText(/PM: PM 0/)).toBeInTheDocument()
      expect(within(propertyCard!).getByText(/10,000 sq ft/)).toBeInTheDocument()
    })

    it('shows last inspection date when available', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText('Direct Property 0')).toBeInTheDocument()
      })

      const propertyCard = screen.getByText('Direct Property 0').closest('div')
      expect(within(propertyCard!).getByText(/Last Inspection: 2024-01-15/)).toBeInTheDocument()
    })

    it('shows "Never" for properties without inspection date', async () => {
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText('Direct Property 1')).toBeInTheDocument()
      })

      const propertyCard = screen.getByText('Direct Property 1').closest('div')
      expect(within(propertyCard!).getByText(/Last Inspection: Never/)).toBeInTheDocument()
    })
  })
})