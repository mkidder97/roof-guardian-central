import { supabase } from '@/integrations/supabase/client';

export interface DuplicateInspection {
  id: string;
  roof_id: string;
  inspector_id: string;
  status: string;
  created_at: string;
  scheduled_date: string | null;
  notes: string | null;
  property_name?: string;
  inspector_name?: string;
}

export interface CleanupResult {
  duplicatesFound: number;
  duplicatesRemoved: number;
  archivedInspections: string[];
  errors: string[];
}

/**
 * Find duplicate inspections for the same property and inspector
 */
export async function findDuplicateInspections(): Promise<DuplicateInspection[]> {
  try {
    const { data: inspections, error } = await supabase
      .from('inspections')
      .select(`
        id,
        roof_id,
        inspector_id,
        status,
        created_at,
        scheduled_date,
        notes,
        roofs(property_name),
        users(first_name, last_name)
      `)
      .is('archived_at', null)
      .order('roof_id')
      .order('inspector_id')
      .order('created_at');

    if (error) throw error;

    const duplicates: DuplicateInspection[] = [];
    const groupedInspections = new Map<string, any[]>();

    // Group inspections by property and inspector
    inspections?.forEach(inspection => {
      const key = `${inspection.roof_id}-${inspection.inspector_id}`;
      if (!groupedInspections.has(key)) {
        groupedInspections.set(key, []);
      }
      groupedInspections.get(key)!.push(inspection);
    });

    // Find groups with multiple inspections (duplicates)
    groupedInspections.forEach(group => {
      if (group.length > 1) {
        // Sort by created_at to keep the oldest one
        group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Mark all but the first (oldest) as duplicates
        for (let i = 1; i < group.length; i++) {
          const inspection = group[i];
          duplicates.push({
            id: inspection.id,
            roof_id: inspection.roof_id,
            inspector_id: inspection.inspector_id,
            status: inspection.status,
            created_at: inspection.created_at,
            scheduled_date: inspection.scheduled_date,
            notes: inspection.notes,
            property_name: inspection.roofs?.property_name,
            inspector_name: `${inspection.users?.first_name || ''} ${inspection.users?.last_name || ''}`.trim()
          });
        }
      }
    });

    return duplicates;
  } catch (error) {
    console.error('Error finding duplicate inspections:', error);
    throw error;
  }
}

/**
 * Archive duplicate inspections (safe removal)
 */
export async function archiveDuplicateInspections(duplicateIds: string[]): Promise<CleanupResult> {
  const result: CleanupResult = {
    duplicatesFound: duplicateIds.length,
    duplicatesRemoved: 0,
    archivedInspections: [],
    errors: []
  };

  if (duplicateIds.length === 0) {
    return result;
  }

  try {
    // Archive duplicates in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < duplicateIds.length; i += batchSize) {
      const batch = duplicateIds.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from('inspections')
          .update({
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', batch);

        if (error) throw error;

        result.duplicatesRemoved += batch.length;
        result.archivedInspections.push(...batch);
      } catch (batchError) {
        console.error(`Error archiving batch ${i}-${i + batch.length}:`, batchError);
        result.errors.push(`Batch ${i}-${i + batch.length}: ${batchError}`);
      }
    }

    return result;
  } catch (error) {
    console.error('Error during duplicate cleanup:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
}

/**
 * Get statistics about potential duplicates
 */
export async function getDuplicateStatistics() {
  try {
    // Count total inspections
    const { count: totalInspections, error: totalError } = await supabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .is('archived_at', null);

    if (totalError) throw totalError;

    // Find duplicates
    const duplicates = await findDuplicateInspections();

    // Group by property for summary
    const propertiesWithDuplicates = new Set();
    duplicates.forEach(dup => propertiesWithDuplicates.add(dup.roof_id));

    return {
      totalInspections: totalInspections || 0,
      duplicateInspections: duplicates.length,
      propertiesAffected: propertiesWithDuplicates.size,
      duplicatesByStatus: duplicates.reduce((acc, dup) => {
        acc[dup.status] = (acc[dup.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  } catch (error) {
    console.error('Error getting duplicate statistics:', error);
    throw error;
  }
}

/**
 * Complete cleanup workflow - find and archive duplicates
 */
export async function performDuplicateCleanup(): Promise<CleanupResult> {
  try {
    console.log('🔍 Finding duplicate inspections...');
    const duplicates = await findDuplicateInspections();
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found');
      return {
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        archivedInspections: [],
        errors: []
      };
    }

    console.log(`📊 Found ${duplicates.length} duplicate inspections`);
    
    const duplicateIds = duplicates.map(d => d.id);
    const result = await archiveDuplicateInspections(duplicateIds);
    
    console.log(`✅ Cleanup complete: ${result.duplicatesRemoved}/${result.duplicatesFound} duplicates archived`);
    
    if (result.errors.length > 0) {
      console.warn('⚠️ Some errors occurred during cleanup:', result.errors);
    }

    return result;
  } catch (error) {
    console.error('❌ Error during duplicate cleanup:', error);
    return {
      duplicatesFound: 0,
      duplicatesRemoved: 0,
      archivedInspections: [],
      errors: [`Cleanup failed: ${error}`]
    };
  }
}

/**
 * Reset the test data population flag (for development/testing)
 */
export function resetTestDataFlag() {
  localStorage.removeItem('inspector_test_data_populated');
  console.log('🔄 Test data population flag reset');
}