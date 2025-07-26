import { vi } from 'vitest'

// Mock data for testing
export const mockProperties = [
  {
    id: 'prop-1',
    property_name: 'Test Property 1',
    address: '123 Test St',
    city: 'Test City',
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
  }
]

export const mockInspectors = [
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

export const mockInspections = [
  {
    id: 'inspection-1',
    roof_id: 'prop-1',
    inspector_id: 'inspector-1',
    scheduled_date: '2024-12-01',
    status: 'scheduled',
    inspection_type: 'routine',
    notes: 'Standard inspection',
    created_at: '2024-11-26T10:00:00Z',
    roofs: {
      property_name: 'Test Property 1'
    },
    users: {
      first_name: 'Michael',
      last_name: 'Kidder'
    }
  }
]

export const mockInspectionSessions = [
  {
    id: 'session-1',
    property_id: 'prop-1',
    inspector_id: 'inspector-1',
    inspection_status: 'scheduled',
    session_data: {
      inspectionType: 'routine',
      priority: 'medium',
      notes: 'Test session',
      directInspection: true
    },
    expires_at: '2024-12-03T10:00:00Z',
    created_at: '2024-11-26T10:00:00Z'
  }
]

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: mockProperties,
              error: null
            })
          })
        })
      }),
      order: vi.fn().mockReturnValue({
        data: mockInspections,
        error: null
      }),
      single: vi.fn().mockReturnValue({
        data: mockInspections[0],
        error: null
      })
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockReturnValue({
          data: { id: 'new-inspection', ...mockInspections[0] },
          error: null
        })
      })
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        data: mockInspections[0],
        error: null
      })
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        data: null,
        error: null
      })
    })
  })

  return {
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({
      data: 'Test Campaign - Routine - 1 Properties (11/26/2024)',
      error: null
    })
  }
}

// Mock the entire supabase module
export const mockSupabase = createMockSupabaseClient()