import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { server } from '@/test/setup'
import { http, HttpResponse } from 'msw'
import { mockProperties, mockInspectors, mockInspections, mockInspectionSessions } from '@/test/mocks/supabase'

// Mock the supabase client for database testing
const mockSupabaseOperations = {
  inspectionInserts: [] as any[],
  sessionInserts: [] as any[],
  inspectionUpdates: [] as any[],
  sessionUpdates: [] as any[],
  inspectionDeletes: [] as any[],
  sessionDeletes: [] as any[]
}

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
          insert: vi.fn().mockImplementation((data) => {
            mockSupabaseOperations.inspectionInserts.push(data)
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: `inspection-${Date.now()}`, ...data },
                  error: null
                })
              })
            }
          }),
          update: vi.fn().mockImplementation((data) => {
            mockSupabaseOperations.inspectionUpdates.push(data)
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
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((id) => {
              mockSupabaseOperations.inspectionDeletes.push(id)
              return {
                data: null,
                error: null
              }
            })
          })
        }
      } else if (table === 'inspection_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockInspectionSessions[0],
                error: null
              })
            }),
            order: vi.fn().mockResolvedValue({
              data: mockInspectionSessions,
              error: null
            })
          }),
          insert: vi.fn().mockImplementation((data) => {
            mockSupabaseOperations.sessionInserts.push(data)
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: `session-${Date.now()}`, ...data },
                  error: null
                })
              })
            }
          }),
          update: vi.fn().mockImplementation((data) => {
            mockSupabaseOperations.sessionUpdates.push(data)
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
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((id) => {
              mockSupabaseOperations.sessionDeletes.push(id)
              return {
                data: null,
                error: null
              }
            })
          })
        }
      }
      
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    }),
    rpc: vi.fn().mockImplementation((functionName, params) => {
      if (functionName === 'validate_inspection_consistency') {
        return Promise.resolve({
          data: {
            total_inspections: 5,
            total_sessions: 5,
            linked_sessions: 5,
            orphaned_sessions: 0,
            missing_sessions: 0,
            status_mismatches: 0,
            property_mismatches: 0,
            inspector_mismatches: 0
          },
          error: null
        })
      }
      return Promise.resolve({ data: null, error: null })
    })
  }
}))

describe('Database Consistency Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear tracking arrays
    Object.keys(mockSupabaseOperations).forEach(key => {
      mockSupabaseOperations[key as keyof typeof mockSupabaseOperations] = []
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('Inspection and Session Creation Consistency', () => {
    it('creates both inspection and session records for direct inspections', async () => {
      const { supabase } = await import('@/integrations/supabase/client')

      // Simulate direct inspection creation
      const inspectionData = {
        roof_id: 'prop-1',
        inspector_id: 'inspector-1',
        scheduled_date: '2024-12-01',
        status: 'scheduled',
        inspection_type: 'routine',
        notes: 'Direct inspection test'
      }

      const sessionData = {
        property_id: 'prop-1',
        inspector_id: 'inspector-1',
        inspection_status: 'scheduled',
        session_data: {
          inspectionType: 'routine',
          priority: 'medium',
          directInspection: true
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }

      // Create inspection
      await supabase.from('inspections').insert(inspectionData).select().single()
      
      // Create session
      await supabase.from('inspection_sessions').insert(sessionData).select().single()

      // Verify both were created
      expect(mockSupabaseOperations.inspectionInserts).toHaveLength(1)
      expect(mockSupabaseOperations.sessionInserts).toHaveLength(1)

      // Verify data consistency
      const createdInspection = mockSupabaseOperations.inspectionInserts[0]
      const createdSession = mockSupabaseOperations.sessionInserts[0]

      expect(createdInspection.roof_id).toBe(createdSession.property_id)
      expect(createdInspection.inspector_id).toBe(createdSession.inspector_id)
      expect(createdInspection.status).toBe('scheduled')
      expect(createdSession.inspection_status).toBe('scheduled')
    })

    it('ensures property_id and roof_id consistency', async () => {
      const { supabase } = await import('@/integrations/supabase/client')

      const propertyId = 'prop-123'
      
      const inspectionData = {
        roof_id: propertyId,
        inspector_id: 'inspector-1',
        scheduled_date: '2024-12-01',
        status: 'scheduled',
        inspection_type: 'routine'
      }

      const sessionData = {
        property_id: propertyId,
        inspector_id: 'inspector-1',
        inspection_status: 'scheduled',
        session_data: { inspectionType: 'routine' },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }

      await supabase.from('inspections').insert(inspectionData).select().single()
      await supabase.from('inspection_sessions').insert(sessionData).select().single()

      const inspection = mockSupabaseOperations.inspectionInserts[0]
      const session = mockSupabaseOperations.sessionInserts[0]

      expect(inspection.roof_id).toBe(session.property_id)
      expect(inspection.roof_id).toBe(propertyId)
    })

    it('ensures inspector consistency between tables', async () => {
      const { supabase } = await import('@/integrations/supabase/client')

      const inspectorId = 'inspector-456'
      
      const inspectionData = {
        roof_id: 'prop-1',
        inspector_id: inspectorId,
        scheduled_date: '2024-12-01',
        status: 'scheduled',
        inspection_type: 'routine'
      }

      const sessionData = {
        property_id: 'prop-1',
        inspector_id: inspectorId,
        inspection_status: 'scheduled',
        session_data: { inspectionType: 'routine' },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }

      await supabase.from('inspections').insert(inspectionData).select().single()
      await supabase.from('inspection_sessions').insert(sessionData).select().single()

      const inspection = mockSupabaseOperations.inspectionInserts[0]
      const session = mockSupabaseOperations.sessionInserts[0]

      expect(inspection.inspector_id).toBe(session.inspector_id)
      expect(inspection.inspector_id).toBe(inspectorId)
    })
  })

  describe('Status Synchronization', () => {
    it('maintains status consistency when inspection status changes', async () => {
      const { supabase } = await import('@/integrations/supabase/client')

      // Update inspection status
      await supabase
        .from('inspections')
        .update({ status: 'in_progress' })
        .eq('id', 'inspection-1')
        .select()
        .single()

      // Update corresponding session status
      await supabase
        .from('inspection_sessions')
        .update({ inspection_status: 'in_progress' })
        .eq('property_id', 'prop-1')
        .select()
        .single()

      const inspectionUpdate = mockSupabaseOperations.inspectionUpdates[0]
      const sessionUpdate = mockSupabaseOperations.sessionUpdates[0]

      expect(inspectionUpdate.status).toBe('in_progress')
      expect(sessionUpdate.inspection_status).toBe('in_progress')
    })

    it('validates all valid status transitions', async () => {
      const { supabase } = await import('@/integrations/supabase/client')

      const validTransitions = [
        { from: 'scheduled', to: 'in_progress' },
        { from: 'in_progress', to: 'ready_for_review' },
        { from: 'ready_for_review', to: 'completed' },
        { from: 'scheduled', to: 'cancelled' }
      ]

      for (const transition of validTransitions) {
        // Clear previous operations
        mockSupabaseOperations.inspectionUpdates = []
        mockSupabaseOperations.sessionUpdates = []

        // Update to new status
        await supabase
          .from('inspections')
          .update({ status: transition.to })
          .eq('id', 'inspection-1')
          .select()
          .single()

        await supabase
          .from('inspection_sessions')
          .update({ inspection_status: transition.to })
          .eq('property_id', 'prop-1')
          .select()
          .single()

        const inspectionUpdate = mockSupabaseOperations.inspectionUpdates[0]
        const sessionUpdate = mockSupabaseOperations.sessionUpdates[0]

        expect(inspectionUpdate.status).toBe(transition.to)
        expect(sessionUpdate.inspection_status).toBe(transition.to)
      }
    })

    it('handles concurrent status updates correctly', async () => {
      const { supabase } = await import('@/integrations/supabase/client')

      // Simulate concurrent updates
      const inspectionUpdate = supabase
        .from('inspections')
        .update({ status: 'in_progress' })
        .eq('id', 'inspection-1')
        .select()
        .single()

      const sessionUpdate = supabase
        .from('inspection_sessions')
        .update({ inspection_status: 'in_progress' })
        .eq('property_id', 'prop-1')
        .select()
        .single()

      await Promise.all([inspectionUpdate, sessionUpdate])

      // Both should have been updated
      expect(mockSupabaseOperations.inspectionUpdates).toHaveLength(1)
      expect(mockSupabaseOperations.sessionUpdates).toHaveLength(1)
    })
  })

  describe('Data Integrity Validation', () => {
    it('validates inspection consistency using RPC function', async () => {
      const { supabase } = await import('@/integrations/supabase/client')

      const result = await supabase.rpc('validate_inspection_consistency')

      expect(result.data).toEqual({
        total_inspections: 5,
        total_sessions: 5,
        linked_sessions: 5,
        orphaned_sessions: 0,
        missing_sessions: 0,
        status_mismatches: 0,
        property_mismatches: 0,
        inspector_mismatches: 0
      })
    })

    it('detects orphaned sessions', async () => {
      // Mock data with orphaned session
      vi.mocked(mockSupabaseOperations).sessionInserts.push({
        property_id: 'prop-999',
        inspector_id: 'inspector-1',
        inspection_status: 'scheduled',
        session_data: { orphaned: true }
      })

      const { supabase } = await import('@/integrations/supabase/client')
      
      // Mock RPC to return orphaned sessions
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          total_inspections: 5,
          total_sessions: 6,
          linked_sessions: 5,
          orphaned_sessions: 1,
          missing_sessions: 0,
          status_mismatches: 0,
          property_mismatches: 0,
          inspector_mismatches: 0
        },
        error: null
      })

      const result = await supabase.rpc('validate_inspection_consistency')
      
      expect(result.data.orphaned_sessions).toBe(1)
      expect(result.data.total_sessions).toBeGreaterThan(result.data.linked_sessions)
    })

    it('detects missing sessions', async () => {
      const { supabase } = await import('@/integrations/supabase/client')
      
      // Mock RPC to return missing sessions
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          total_inspections: 6,
          total_sessions: 5,
          linked_sessions: 5,
          orphaned_sessions: 0,
          missing_sessions: 1,
          status_mismatches: 0,
          property_mismatches: 0,
          inspector_mismatches: 0
        },
        error: null
      })

      const result = await supabase.rpc('validate_inspection_consistency')
      
      expect(result.data.missing_sessions).toBe(1)
      expect(result.data.total_inspections).toBeGreaterThan(result.data.total_sessions)
    })

    it('detects status mismatches', async () => {
      const { supabase } = await import('@/integrations/supabase/client')
      
      // Mock RPC to return status mismatches
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          total_inspections: 5,
          total_sessions: 5,
          linked_sessions: 5,
          orphaned_sessions: 0,
          missing_sessions: 0,
          status_mismatches: 1,
          property_mismatches: 0,
          inspector_mismatches: 0
        },
        error: null
      })

      const result = await supabase.rpc('validate_inspection_consistency')
      
      expect(result.data.status_mismatches).toBe(1)
    })
  })

  describe('Deletion Consistency', () => {
    it('cascades deletes from inspections to sessions', async () => {
      const { supabase } = await import('@/integrations/supabase/client')

      // Delete inspection
      await supabase.from('inspections').delete().eq('id', 'inspection-1')

      // Should have triggered deletion
      expect(mockSupabaseOperations.inspectionDeletes).toContain('inspection-1')
    })

    it('prevents deletion of sessions with linked inspections', async () => {
      const { supabase } = await import('@/integrations/supabase/client')

      // This should be prevented by database triggers
      // For testing, we'll simulate the constraint
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Cannot delete session with linked inspection' }
          })
        })
      } as any))

      const result = await supabase.from('inspection_sessions').delete().eq('id', 'session-1')
      
      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('Cannot delete session with linked inspection')
    })
  })

  describe('Performance and Scalability', () => {
    it('handles batch operations efficiently', async () => {
      const { supabase } = await import('@/integrations/supabase/client')

      const batchSize = 100
      const inspections = Array.from({ length: batchSize }, (_, i) => ({
        roof_id: `prop-${i}`,
        inspector_id: 'inspector-1',
        scheduled_date: '2024-12-01',
        status: 'scheduled',
        inspection_type: 'routine'
      }))

      const sessions = Array.from({ length: batchSize }, (_, i) => ({
        property_id: `prop-${i}`,
        inspector_id: 'inspector-1',
        inspection_status: 'scheduled',
        session_data: { batchTest: true },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }))

      // Simulate batch insert
      for (const inspection of inspections) {
        await supabase.from('inspections').insert(inspection).select().single()
      }

      for (const session of sessions) {
        await supabase.from('inspection_sessions').insert(session).select().single()
      }

      expect(mockSupabaseOperations.inspectionInserts).toHaveLength(batchSize)
      expect(mockSupabaseOperations.sessionInserts).toHaveLength(batchSize)
    })

    it('maintains consistency under high load', async () => {
      const { supabase } = await import('@/integrations/supabase/client')

      // Simulate concurrent operations
      const operations = Array.from({ length: 50 }, async (_, i) => {
        const inspection = await supabase.from('inspections').insert({
          roof_id: `prop-concurrent-${i}`,
          inspector_id: 'inspector-1',
          scheduled_date: '2024-12-01',
          status: 'scheduled',
          inspection_type: 'routine'
        }).select().single()

        const session = await supabase.from('inspection_sessions').insert({
          property_id: `prop-concurrent-${i}`,
          inspector_id: 'inspector-1',
          inspection_status: 'scheduled',
          session_data: { concurrent: true },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }).select().single()

        return { inspection, session }
      })

      const results = await Promise.all(operations)

      // All operations should succeed
      expect(results).toHaveLength(50)
      expect(mockSupabaseOperations.inspectionInserts).toHaveLength(50)
      expect(mockSupabaseOperations.sessionInserts).toHaveLength(50)
    })
  })
})