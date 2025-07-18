import { supabase } from '@/integrations/supabase/client';

export const uploadRoofFile = async (
  roofId: string, 
  file: File, 
  metadata: {
    file_type: string;
    is_public: boolean;
  }
): Promise<{ data: any; error: any }> => {
  try {
    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${roofId}/${Date.now()}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('roof-files')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('roof-files')
      .getPublicUrl(fileName);
    
    // Save file metadata to database
    const { data, error } = await supabase
      .from('roof_files')
      .insert({
        roof_id: roofId,
        file_name: file.name,
        file_type: metadata.file_type,
        file_size: file.size,
        file_url: publicUrl,
        storage_path: fileName,
        mime_type: file.type,
        is_public: metadata.is_public
      })
      .select()
      .single();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteRoofFile = async (fileId: string, storagePath: string) => {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('roof-files')
      .remove([storagePath]);
    
    if (storageError) throw storageError;
    
    // Delete from database
    const { error } = await supabase
      .from('roof_files')
      .delete()
      .eq('id', fileId);
    
    return { error };
  } catch (error) {
    return { error };
  }
};