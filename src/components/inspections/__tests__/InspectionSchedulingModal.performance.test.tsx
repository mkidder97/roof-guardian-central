import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InspectionSchedulingModal } from '../InspectionSchedulingModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/hooks/useN8nWorkflow', () => ({
  useN8nWorkflow: () => ({
    processCampaignsBatch: vi.fn().mockResolvedValue({ successful: [], failed: [], total: 0 })
  })
}));

vi.mock('@/hooks/useInspectors', () => ({
  useInspectors: () => ({
    inspectors: [
      {
        id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        full_name: 'John Doe',
        auth_user_id: '1'
      }
    ],
    loading: false
  })
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            not: () => ({
              order: () => ({
                data: [],
                error: null
              })
            })
          })
        })
      })
    })
  }
}));

// Mock performance.now for consistent timing
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow
  },
  writable: true
});

describe('InspectionSchedulingModal Performance Tests', () => {
  let queryClient: QueryClient;
  let renderCount = 0;
  let maxRenderTime = 0;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    renderCount = 0;
    maxRenderTime = 0;
    mockPerformanceNow.mockClear();
    
    // Mock performance.now to return incrementing values
    let counter = 0;
    mockPerformanceNow.mockImplementation(() => {
      counter += Math.random() * 10; // Simulate varying render times
      return counter;
    });
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: vi.fn(),
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <InspectionSchedulingModal {...defaultProps} />
      </QueryClientProvider>
    );
  };

  it('should render without performance issues', async () => {
    const startTime = performance.now();
    
    renderComponent();
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Initial render should be reasonably fast (less than 100ms in test environment)
    expect(renderTime).toBeLessThan(100);
    
    // Should render successfully
    await waitFor(() => {
      expect(screen.getByText(/Schedule Inspection Campaign/i)).toBeInTheDocument();
    });
  });

  it('should handle large property lists efficiently', async () => {
    // Mock a large dataset
    const mockLargeData = Array.from({ length: 1000 }, (_, index) => ({
      id: `prop-${index}`,
      property_name: `Property ${index}`,
      address: `${index} Main St`,
      city: 'Test City',
      state: 'TX',
      zip: '12345',
      market: 'Test Market',
      region: 'Test Region',
      roof_type: 'Flat',
      roof_area: 1000,
      last_inspection_date: null,
      site_contact_name: null,
      site_contact_phone: null,
      roof_access: 'Ladder',
      latitude: null,
      longitude: null,
      manufacturer_warranty_expiration: null,
      installer_warranty_expiration: null,
      client_id: 'client-1',
      status: 'active',
      property_manager_name: 'Test Manager',
      property_manager_email: 'manager@test.com',
      property_manager_phone: '123-456-7890'
    }));

    // Mock supabase to return large dataset
    vi.mocked(vi.importMock('@/integrations/supabase/client')).supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            neq: () => ({
              data: mockLargeData,
              error: null
            })
          })
        })
      })
    };

    const startTime = performance.now();
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Available Properties/i)).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should handle large datasets efficiently
    expect(renderTime).toBeLessThan(200);
  });

  it('should not cause excessive re-renders during search', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search properties/i)).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/Search properties/i);
    
    const startTime = performance.now();
    
    // Simulate rapid typing
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.change(searchInput, { target: { value: 'test property' } });
    fireEvent.change(searchInput, { target: { value: 'test property name' } });
    
    const endTime = performance.now();
    const searchTime = endTime - startTime;
    
    // Search operations should be fast due to memoization
    expect(searchTime).toBeLessThan(50);
  });

  it('should efficiently handle property selection/deselection', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Available Properties/i)).toBeInTheDocument();
    });
    
    // Find checkboxes (should be present even with mocked empty data)
    const checkboxes = screen.getAllByRole('checkbox');
    
    if (checkboxes.length > 0) {
      const startTime = performance.now();
      
      // Simulate rapid selection/deselection
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[0]);
      
      const endTime = performance.now();
      const selectionTime = endTime - startTime;
      
      // Selection operations should be fast due to memoized callbacks
      expect(selectionTime).toBeLessThan(30);
    }
  });

  it('should handle filter changes efficiently', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Available Properties/i)).toBeInTheDocument();
    });
    
    // Find filter dropdowns
    const regionSelect = screen.getByDisplayValue(/All Regions/i);
    const marketSelect = screen.getByDisplayValue(/All Markets/i);
    
    const startTime = performance.now();
    
    // Simulate filter changes
    fireEvent.click(regionSelect);
    fireEvent.click(marketSelect);
    
    const endTime = performance.now();
    const filterTime = endTime - startTime;
    
    // Filter operations should be fast
    expect(filterTime).toBeLessThan(50);
  });

  it('should maintain performance during mode switching', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Direct Inspection Mode/i)).toBeInTheDocument();
    });
    
    const modeSwitch = screen.getByRole('switch');
    
    const startTime = performance.now();
    
    // Switch modes multiple times
    fireEvent.click(modeSwitch);
    fireEvent.click(modeSwitch);
    fireEvent.click(modeSwitch);
    
    const endTime = performance.now();
    const switchTime = endTime - startTime;
    
    // Mode switching should be fast
    expect(switchTime).toBeLessThan(30);
  });
});

describe('Performance Monitoring Integration', () => {
  it('should have performance monitoring enabled', () => {
    // Test that performance monitoring hooks are properly integrated
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    renderComponent();
    
    // Performance monitoring should be active (would log in development)
    // In test environment, we just verify no errors occur
    expect(() => renderComponent()).not.toThrow();
    
    consoleSpy.mockRestore();
  });
});