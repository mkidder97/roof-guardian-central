import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, Plus, FileText, FileImage, Shield, Camera, File, Archive } from "lucide-react";
import { uploadRoofFile } from "@/lib/fileStorage";
import { useToast } from "@/hooks/use-toast";

export function FilesTab({ roof }: { roof: any }) {
  const [files, setFiles] = useState<any[]>([]);
  const [fileCategories, setFileCategories] = useState<any[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form state
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        // Fetch files for this roof
        const { data: filesData, error: filesError } = await supabase
          .from('roof_files')
          .select('*')
          .eq('roof_id', roof.id)
          .order('created_at', { ascending: false });

        if (filesError) throw filesError;

        // Fetch file categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('file_categories')
          .select('*')
          .order('name');

        if (categoriesError) throw categoriesError;

        setFiles(filesData || []);
        setFileCategories(categoriesData || []);
      } catch (error) {
        console.error('Error fetching files:', error);
        toast({
          title: "Error",
          description: "Failed to load files",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [roof.id, toast]);

  const getFileTypeColor = (fileType: string) => {
    const category = fileCategories.find(c => c.name === fileType);
    if (!category) return 'bg-muted text-muted-foreground';
    
    switch (category.color) {
      case 'blue': return 'bg-primary/10 text-primary';
      case 'green': return 'bg-accent/10 text-accent';
      case 'orange': return 'bg-destructive/10 text-destructive';
      case 'purple': return 'bg-secondary/10 text-secondary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getFileIcon = (fileType: string) => {
    const category = fileCategories.find(c => c.name === fileType);
    if (!category) return <File className="h-5 w-5" />;
    
    switch (category.icon) {
      case 'file-image': return <FileImage className="h-5 w-5" />;
      case 'file-text': return <FileText className="h-5 w-5" />;
      case 'shield': return <Shield className="h-5 w-5" />;
      case 'camera': return <Camera className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !fileName || !fileType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select a file",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const { data, error } = await uploadRoofFile(roof.id, selectedFile, {
        file_type: fileType,
        is_public: isPublic
      });

      if (error) throw error;

      // Update local state
      setFiles(prev => [data, ...prev]);
      
      // Reset form
      setFileName("");
      setFileType("");
      setSelectedFile(null);
      setUploadDialogOpen(false);

      toast({
        title: "Success",
        description: "File uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading files...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Files Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Roof Files</h3>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Add File
        </Button>
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {files.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">No Files</h4>
              <p className="text-muted-foreground mb-4">No files have been uploaded for this property yet.</p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload First File
              </Button>
            </CardContent>
          </Card>
        ) : (
          files.map((file) => (
            <Card key={file.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg">
                      {getFileIcon(file.file_type)}
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-lg">{file.file_name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Date Added: {new Date(file.created_at).toLocaleDateString()}</span>
                        <Badge className={getFileTypeColor(file.file_type)}>
                          {file.file_type}
                        </Badge>
                        <span>Public: {file.is_public ? 'Yes' : 'No'}</span>
                        {file.file_size && (
                          <span>Size: {(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* File Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fileCategories.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                {getFileIcon(category.name)}
                <span className="ml-2">{category.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {files.filter(f => f.file_type === category.name).length}
                </div>
                <p className="text-sm text-muted-foreground">Files</p>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Archive className="h-5 w-5 mr-2" />
              Total Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{files.length}</div>
              <p className="text-sm text-muted-foreground">Files</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Add a new file to this roof's document library
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">File Name</label>
              <Input 
                placeholder="Enter file name" 
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">File Type</label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select file type" />
                </SelectTrigger>
                <SelectContent>
                  {fileCategories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="public" 
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <label htmlFor="public" className="text-sm">Make file public</label>
            </div>
            
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mb-2"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
              <p className="text-sm text-muted-foreground">
                Select a file to upload
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, JPG, PNG up to 10MB
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFileUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}