import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils/test-utils'
import { InspectionSchedulingModal } from '@/components/inspections/InspectionSchedulingModal'

// Generate large dataset for performance testing
const generateLargeDataset = (size: number) => {
  const regions = ['Central', 'East', 'West', 'North', 'South']
  const markets = ['Dallas', 'Houston', 'Austin', 'San Antonio', 'Fort Worth']
  const zipcodes = Array.from({ length: 20 }, (_, i) => `750${String(i).padStart(2, '0')}`)
  
  return Array.from({ length: size }, (_, i) => ({
    id: `prop-${i}`,
    property_name: `Property ${i}`,
    address: `${100 + i} Street ${i % 10}`,
    city: markets[i % markets.length],
    state: 'TX',
    zip: zipcodes[i % zipcodes.length],
    market: markets[i % markets.length],
    region: regions[i % regions.length],
    roof_type: ['Modified Bitumen', 'TPO', 'EPDM', 'PVC'][i % 4],
    roof_area: 10000 + (i * 100),
    last_inspection_date: i % 4 === 0 ? `2024-0${(i % 9) + 1}-15` : null,
    site_contact_name: `Contact ${i}`,
    site_contact_phone: `555-${1000 + (i % 9999)}`,
    roof_access: ['ladder', 'stairs', 'hoist'][i % 3],
    latitude: 32.7767 + (i * 0.001),
    longitude: -96.7970 - (i * 0.001),
    manufacturer_warranty_expiration: '2025-12-31',
    installer_warranty_expiration: '2025-06-30',
    client_id: `client-${i % 50}`,
    status: 'active',
    property_manager_name: `Manager ${i}`,
    property_manager_email: `manager${i}@test.com`,
    property_manager_phone: `555-${2000 + (i % 9999)}`,
    clients: {
      company_name: `Company ${i % 50}`
    }
  }))
}

// Performance tracking
const performanceTracker = {
  metrics: [] as any[],
  addMetric: (name: string, value: number, metadata?: any) => {
    performanceTracker.metrics.push({
      name,
      value,
      metadata,
      timestamp: performance.now()
    })
  },
  getMetric: (name: string) => {
    return performanceTracker.metrics.filter(m => m.name === name)
  },
  reset: () => {
    performanceTracker.metrics = []
  }
}

// Mock datasets of different sizes
const smallDataset = generateLargeDataset(50)
const mediumDataset = generateLargeDataset(288) // Realistic dataset size
const largeDataset = generateLargeDataset(1000) // Stress test size

let currentDataset = mediumDataset

// Enhanced Supabase mock with performance tracking
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
            
            // Simulate database query time based on dataset size
            const queryTime = Math.log(currentDataset.length) * 10 // Logarithmic scaling
            await new Promise(resolve => setTimeout(resolve, queryTime))
            
            // Apply filters
            let filtered = [...currentDataset]
            
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
            
            const endTime = performance.now()
            const duration = endTime - startTime
            
            performanceTracker.addMetric('api_query', duration, {
              datasetSize: currentDataset.length,
              resultSize: filtered.length,
              filters: this._filters
            })
            
            return { data: filtered, error: null }
          })
        }
        return queryBuilder
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    })
  }
}))

vi.mock('@/hooks/useInspectors', () => ({
  useInspectors: () => ({
    inspectors: [
      {
        id: 'inspector-1',
        email: 'mkidder@southernroof.biz',
        full_name: 'Michael Kidder',
        first_name: 'Michael',
        last_name: 'Kidder',
        phone: '555-9999',
        role: 'inspector'
      }
    ],
    loading: false
  })
}))

vi.mock('@/hooks/useN8nWorkflow', () => ({
  useN8nWorkflow: () => ({
    processCampaignsBatch: vi.fn()
  })
}))

describe('Direct Mode Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    performanceTracker.reset()
    currentDataset = mediumDataset
  })

  describe('Large Dataset Filtering Performance', () => {
    it('handles 288+ properties filtering within performance thresholds', async () => {
      currentDataset = mediumDataset
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      // Switch to Direct Mode
      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Measure initial load time
      const loadStart = performance.now()
      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })
      const loadEnd = performance.now()
      const loadTime = loadEnd - loadStart

      performanceTracker.addMetric('initial_load', loadTime, { datasetSize: 288 })

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)

      // Measure filter application time
      const filterStart = performance.now()
      
      const selects = screen.getAllByRole('combobox')
      await user.click(selects[0])
      await user.click(screen.getByText('Central'))

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      await waitFor(() => {
        expect(screen.getAllByText(/Property \d+/).length).toBeGreaterThan(0)
      })

      const filterEnd = performance.now()
      const filterTime = filterEnd - filterStart

      performanceTracker.addMetric('filter_application', filterTime, { 
        datasetSize: 288,
        filter: 'region=Central'
      })

      // Filter should apply within 2 seconds
      expect(filterTime).toBeLessThan(2000)
    })

    it('maintains performance with 1000+ properties', async () => {
      currentDataset = largeDataset
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Measure load time for large dataset
      const loadStart = performance.now()
      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      }, { timeout: 10000 })
      const loadEnd = performance.now()
      const loadTime = loadEnd - loadStart

      performanceTracker.addMetric('large_dataset_load', loadTime, { datasetSize: 1000 })

      // Should still load within 5 seconds for large dataset
      expect(loadTime).toBeLessThan(5000)

      // Test multiple filter combinations
      const filterTests = [
        { region: 'Central', market: 'Dallas' },
        { region: 'East', market: 'Houston' },
        { region: 'West', market: 'Austin' }
      ]

      for (const test of filterTests) {
        const filterStart = performance.now()
        
        const selects = screen.getAllByRole('combobox')
        
        // Set region
        await user.click(selects[0])
        await user.click(screen.getByText(test.region))

        // Set market
        await user.click(selects[1])
        await user.click(screen.getByText(test.market))

        const applyButton = screen.getByRole('button', { name: /apply filters/i })
        await user.click(applyButton)

        await waitFor(() => {
          expect(screen.getAllByText(/Property \d+/).length).toBeGreaterThan(0)
        })

        const filterEnd = performance.now()
        const filterTime = filterEnd - filterStart

        performanceTracker.addMetric('large_dataset_filter', filterTime, {
          datasetSize: 1000,
          filter: test
        })

        // Each filter should still apply within 3 seconds
        expect(filterTime).toBeLessThan(3000)
      }
    })

    it('handles complex filter combinations efficiently', async () => {
      currentDataset = mediumDataset
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })

      // Apply multiple filters simultaneously
      const complexFilterStart = performance.now()

      const selects = screen.getAllByRole('combobox')
      
      // Region + Market + Zipcodes
      await user.click(selects[0])
      await user.click(screen.getByText('Central'))

      await user.click(selects[1])
      await user.click(screen.getByText('Dallas'))

      // Select multiple zipcodes
      await user.click(selects[3])
      const zipcode1 = await screen.findByLabelText('75000')
      const zipcode2 = await screen.findByLabelText('75001')
      await user.click(zipcode1)
      await user.click(zipcode2)

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      await waitFor(() => {
        expect(screen.getAllByText(/Property \d+/).length).toBeGreaterThan(0)
      })

      const complexFilterEnd = performance.now()
      const complexFilterTime = complexFilterEnd - complexFilterStart

      performanceTracker.addMetric('complex_filter', complexFilterTime, {
        filters: ['region', 'market', 'zipcodes'],
        datasetSize: 288
      })

      // Complex filters should still be fast
      expect(complexFilterTime).toBeLessThan(2500)
    })
  })

  describe('Search Performance with Large Datasets', () => {
    it('provides responsive search across 288+ properties', async () => {
      currentDataset = mediumDataset
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search properties/i)

      // Test different search scenarios
      const searchTests = [
        { term: 'Property 1', description: 'specific property' },
        { term: 'Dallas', description: 'city name' },
        { term: 'Manager', description: 'manager name' },
        { term: '123', description: 'address number' }
      ]

      for (const test of searchTests) {
        const searchStart = performance.now()
        
        // Clear previous search
        await user.clear(searchInput)
        
        // Type search term
        await user.type(searchInput, test.term)

        // Wait for search results
        await waitFor(() => {
          const properties = screen.getAllByText(/Property \d+/)
          expect(properties.length).toBeGreaterThan(0)
        })

        const searchEnd = performance.now()
        const searchTime = searchEnd - searchStart

        performanceTracker.addMetric('search_response', searchTime, {
          searchTerm: test.term,
          description: test.description,
          datasetSize: 288
        })

        // Search should respond within 500ms
        expect(searchTime).toBeLessThan(500)
      }
    })

    it('maintains search performance during rapid typing', async () => {
      currentDataset = mediumDataset
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search properties/i)

      // Simulate rapid typing
      const rapidTypingStart = performance.now()
      
      // Type quickly character by character
      const searchTerm = 'Property'
      for (let i = 0; i < searchTerm.length; i++) {
        await user.type(searchInput, searchTerm[i])
        // Small delay to simulate typing
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Wait for final results
      await waitFor(() => {
        const properties = screen.getAllByText(/Property \d+/)
        expect(properties.length).toBeGreaterThan(0)
      })

      const rapidTypingEnd = performance.now()
      const rapidTypingTime = rapidTypingEnd - rapidTypingStart

      performanceTracker.addMetric('rapid_typing', rapidTypingTime, {
        charactersTyped: searchTerm.length,
        datasetSize: 288
      })

      // Should handle rapid typing within reasonable time
      expect(rapidTypingTime).toBeLessThan(2000)
    })
  })

  describe('Memory Usage During Operations', () => {
    it('does not cause memory leaks during repeated filtering', async () => {
      currentDataset = mediumDataset
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })

      // Record initial memory usage (if available)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Perform many filter operations
      const selects = screen.getAllByRole('combobox')
      const applyButton = screen.getByRole('button', { name: /apply filters/i })

      const regions = ['Central', 'East', 'West', 'North', 'South']
      
      for (let i = 0; i < 10; i++) {
        const region = regions[i % regions.length]
        
        await user.click(selects[0])
        await user.click(screen.getByText(region))
        await user.click(applyButton)

        await waitFor(() => {
          expect(screen.getAllByText(/Property \d+/).length).toBeGreaterThan(0)
        })
      }

      // Check memory usage after operations
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100

        performanceTracker.addMetric('memory_usage', memoryIncreasePercent, {
          initialMemory,
          finalMemory,
          operations: 10
        })

        // Memory increase should be reasonable (less than 50%)
        expect(memoryIncreasePercent).toBeLessThan(50)
      }
    })

    it('efficiently handles pagination with large datasets', async () => {
      currentDataset = largeDataset
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
      })

      // Navigate through multiple pages quickly
      const paginationStart = performance.now()

      for (let page = 1; page <= 5; page++) {
        if (page > 1) {
          const nextButton = screen.getByRole('button', { name: /next/i })
          if (!nextButton.disabled) {
            await user.click(nextButton)
            await waitFor(() => {
              expect(screen.getByText(`Page ${page} of`)).toBeInTheDocument()
            })
          }
        }
      }

      const paginationEnd = performance.now()
      const paginationTime = paginationEnd - paginationStart

      performanceTracker.addMetric('pagination_performance', paginationTime, {
        pages: 5,
        datasetSize: 1000
      })

      // Pagination should be smooth
      expect(paginationTime).toBeLessThan(3000)
    })
  })

  describe('UI Responsiveness Under Load', () => {
    it('maintains responsive UI during data loading', async () => {
      currentDataset = largeDataset
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // While data is loading, UI should remain responsive
      const responsiveStart = performance.now()

      // Try to interact with UI elements during load
      const searchInput = screen.getByPlaceholderText(/search properties/i)
      await user.type(searchInput, 'test')

      // Should be able to interact with filters
      const selects = screen.getAllByRole('combobox')
      await user.click(selects[0])

      const responsiveEnd = performance.now()
      const responsiveTime = responsiveEnd - responsiveStart

      performanceTracker.addMetric('ui_responsiveness', responsiveTime, {
        actions: ['type', 'click'],
        duringLoad: true
      })

      // UI interactions should be fast even during loading
      expect(responsiveTime).toBeLessThan(1000)

      // Elements should not be locked during loading
      expect(searchInput).not.toBeDisabled()
    })

    it('handles rapid mode switching without performance degradation', async () => {
      currentDataset = mediumDataset
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })

      // Rapidly switch between modes
      const modeSwitchStart = performance.now()

      for (let i = 0; i < 5; i++) {
        await user.click(toggle) // To Direct Mode
        await waitFor(() => {
          expect(screen.getByText('Create Direct Inspection')).toBeInTheDocument()
        })

        await user.click(toggle) // Back to Campaign Mode
        await waitFor(() => {
          expect(screen.getByText('Schedule Inspection Campaign')).toBeInTheDocument()
        })
      }

      const modeSwitchEnd = performance.now()
      const modeSwitchTime = modeSwitchEnd - modeSwitchStart

      performanceTracker.addMetric('mode_switching', modeSwitchTime, {
        switches: 10,
        datasetSize: 288
      })

      // Mode switching should be smooth
      expect(modeSwitchTime).toBeLessThan(5000)
    })
  })

  describe('Performance Regression Detection', () => {
    it('establishes baseline performance metrics', async () => {
      currentDataset = mediumDataset
      const user = userEvent.setup()
      render(<InspectionSchedulingModal open={true} onOpenChange={vi.fn()} />)

      const toggle = screen.getByRole('switch', { name: /direct inspection mode/i })
      await user.click(toggle)

      // Measure key operations
      const operations = [
        {
          name: 'initial_load',
          action: async () => {
            await waitFor(() => {
              expect(screen.getByText(/Available Properties/)).toBeInTheDocument()
            })
          }
        },
        {
          name: 'filter_apply',
          action: async () => {
            const selects = screen.getAllByRole('combobox')
            await user.click(selects[0])
            await user.click(screen.getByText('Central'))
            const applyButton = screen.getByRole('button', { name: /apply filters/i })
            await user.click(applyButton)
            await waitFor(() => {
              expect(screen.getAllByText(/Property \d+/).length).toBeGreaterThan(0)
            })
          }
        },
        {
          name: 'property_search',
          action: async () => {
            const searchInput = screen.getByPlaceholderText(/search properties/i)
            await user.type(searchInput, 'Property')
            await waitFor(() => {
              expect(screen.getAllByText(/Property \d+/).length).toBeGreaterThan(0)
            })
          }
        }
      ]

      const baselines = {}
      
      for (const op of operations) {
        const start = performance.now()
        await op.action()
        const end = performance.now()
        
        baselines[op.name] = end - start
        performanceTracker.addMetric('baseline_' + op.name, end - start)
      }

      // All baseline operations should be under reasonable limits
      expect(baselines['initial_load']).toBeLessThan(3000)
      expect(baselines['filter_apply']).toBeLessThan(2000)
      expect(baselines['property_search']).toBeLessThan(500)

      // Store baselines for future comparison
      console.log('Performance baselines:', baselines)
    })
  })
})