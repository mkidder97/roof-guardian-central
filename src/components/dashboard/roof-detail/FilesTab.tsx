import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Download, Upload, Plus, FolderOpen, File } from "lucide-react";

interface FilesTabProps {
  roof: any;
}

export function FilesTab({ roof }: FilesTabProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock file data - in a real app, this would come from Supabase Storage
  const mockFiles = [
    {
      id: 1,
      name: "Property_Survey_2023.pdf",
      type: "pdf",
      category: "survey",
      size: "2.4 MB",
      uploadedAt: "2023-03-15",
      uploadedBy: "John Smith"
    },
    {
      id: 2,
      name: "Aerial_Photo_Main.jpg",
      type: "image",
      category: "photos",
      size: "5.2 MB",
      uploadedAt: "2023-03-10",
      uploadedBy: "Jane Doe"
    },
    {
      id: 3,
      name: "Warranty_Documentation.pdf",
      type: "pdf",
      category: "warranty",
      size: "892 KB",
      uploadedAt: "2023-02-28",
      uploadedBy: "Mike Johnson"
    },
    {
      id: 4,
      name: "Inspection_Report_Q1_2023.pdf",
      type: "pdf",
      category: "inspection",
      size: "1.8 MB",
      uploadedAt: "2023-03-31",
      uploadedBy: "Sarah Wilson"
    },
    {
      id: 5,
      name: "Building_Plans.dwg",
      type: "cad",
      category: "plans",
      size: "12.5 MB",
      uploadedAt: "2023-01-15",
      uploadedBy: "Tom Brown"
    }
  ];

  const categories = [
    { value: 'all', label: 'All Files', count: mockFiles.length },
    { value: 'photos', label: 'Photos', count: mockFiles.filter(f => f.category === 'photos').length },
    { value: 'inspection', label: 'Inspections', count: mockFiles.filter(f => f.category === 'inspection').length },
    { value: 'warranty', label: 'Warranties', count: mockFiles.filter(f => f.category === 'warranty').length },
    { value: 'survey', label: 'Surveys', count: mockFiles.filter(f => f.category === 'survey').length },
    { value: 'plans', label: 'Plans', count: mockFiles.filter(f => f.category === 'plans').length }
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-8 w-8 text-blue-500" />;
      case 'pdf': return <FileText className="h-8 w-8 text-red-500" />;
      case 'cad': return <File className="h-8 w-8 text-green-500" />;
      default: return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'default';
      case 'pdf': return 'destructive';
      case 'cad': return 'secondary';
      default: return 'outline';
    }
  };

  const filteredFiles = selectedCategory === 'all' 
    ? mockFiles 
    : mockFiles.filter(file => file.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* File Categories */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Card 
            key={category.value}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedCategory === category.value ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedCategory(category.value)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{category.count}</div>
              <p className="text-sm text-gray-600">{category.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              File Management
            </CardTitle>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Property Files</h3>
            <p className="text-gray-600 mb-4">
              Drag and drop files here, or click to browse
            </p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedCategory === 'all' ? 'All Files' : categories.find(c => c.value === selectedCategory)?.label}
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({filteredFiles.length} files)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Files Found</h3>
              <p className="text-gray-600 mb-4">
                No files have been uploaded in this category yet.
              </p>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload First File
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {getFileIcon(file.type)}
                    <div className="flex-1">
                      <h4 className="font-medium">{file.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{file.size}</span>
                        <span>•</span>
                        <span>Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>by {file.uploadedBy}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant={getFileTypeColor(file.type) as any}>
                      {file.type.toUpperCase()}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {(mockFiles.reduce((sum, file) => sum + parseFloat(file.size.replace(/[^\d.]/g, '')), 0)).toFixed(1)} MB
            </div>
            <p className="text-sm text-gray-600">Total Storage Used</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {mockFiles.filter(f => f.uploadedAt >= '2023-03-01').length}
            </div>
            <p className="text-sm text-gray-600">Files This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(mockFiles.map(f => f.uploadedBy)).size}
            </div>
            <p className="text-sm text-gray-600">Contributors</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}