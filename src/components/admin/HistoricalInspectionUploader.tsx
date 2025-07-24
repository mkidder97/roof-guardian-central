import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Building2,
  Calendar,
  DollarSign,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadRoofFile } from "@/lib/fileStorage";
import { parsePDFInspectionReport } from "@/lib/pdfParser";
import { HistoricalInspectionService } from "@/lib/historicalInspectionService";

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'matched' | 'failed';
  matchedProperty?: {
    id: string;
    name: string;
    address: string;
  };
  extractedData?: {
    inspectionDate: string;
    findings: string[];
    issues: Array<{
      location: string;
      severity: 'high' | 'medium' | 'low';
      type: string;
      estimatedCost?: number;
    }>;
    recommendations: string[];
    totalEstimatedCost?: number;
  };
  error?: string;
}

interface Property {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export function HistoricalInspectionUploader() {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load properties on component mount
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error } = await supabase
          .from('roofs')
          .select('id, property_name, address, city, state, zip')
          .eq('is_deleted', false)
          .order('property_name');

        if (error) throw error;
        setProperties(data || []);
      } catch (error) {
        console.error('Error fetching properties:', error);
        toast({
          title: "Error",
          description: "Failed to load properties",
          variant: "destructive"
        });
      }
    };

    fetchProperties();
  }, [toast]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Only PDF files are allowed",
        variant: "destructive"
      });
    }

    const newFiles: UploadedFile[] = pdfFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}`,
      status: 'pending'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const matchPropertyByName = (filename: string): Property | undefined => {
    // Extract property name from filename (assumes format like "Property Name - Inspection 2024.pdf")
    const cleanName = filename
      .replace(/\.pdf$/i, '')
      .replace(/\s*-\s*(inspection|report|2024|2023).*$/i, '')
      .trim()
      .toLowerCase();

    return properties.find(prop => 
      prop.property_name.toLowerCase().includes(cleanName) ||
      cleanName.includes(prop.property_name.toLowerCase()) ||
      prop.address.toLowerCase().includes(cleanName)
    );
  };

  const extractPDFData = async (file: File): Promise<UploadedFile['extractedData']> => {
    try {
      const parsedData = await parsePDFInspectionReport(file);
      
      return {
        inspectionDate: parsedData.inspectionDate,
        findings: parsedData.findings,
        issues: parsedData.issues.map(issue => ({
          location: issue.location,
          severity: issue.severity,
          type: issue.type,
          estimatedCost: issue.estimatedCost
        })),
        recommendations: parsedData.recommendations,
        totalEstimatedCost: parsedData.totalEstimatedCost
      };
    } catch (error) {
      console.error('Error extracting PDF data:', error);
      throw error;
    }
  };

  const processFiles = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      
      try {
        // Update status to processing
        setUploadedFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'processing' } : f
        ));

        // Match property
        const matchedProperty = matchPropertyByName(file.file.name);
        if (!matchedProperty) {
          throw new Error('Could not match file to property');
        }

        // Extract data from PDF
        const extractedData = await extractPDFData(file.file);

        // Upload PDF to storage
        const { data: uploadData, error: uploadError } = await uploadRoofFile(
          matchedProperty.id, 
          file.file, 
          {
            file_type: 'inspection_report',
            is_public: false
          }
        );

        if (uploadError) throw uploadError;

        // Store extracted data in database
        const parsedData = await parsePDFInspectionReport(file.file);
        const storageResult = await HistoricalInspectionService.storeHistoricalInspection(
          matchedProperty.id,
          parsedData,
          uploadData.file_url || ''
        );

        if (!storageResult.success) {
          throw new Error(`Failed to store inspection data: ${storageResult.error}`);
        }

        // Update file status
        setUploadedFiles(prev => prev.map(f => 
          f.id === file.id ? { 
            ...f, 
            status: 'matched',
            matchedProperty: {
              id: matchedProperty.id,
              name: matchedProperty.property_name,
              address: matchedProperty.address
            },
            extractedData
          } : f
        ));

      } catch (error) {
        console.error(`Error processing file ${file.file.name}:`, error);
        
        setUploadedFiles(prev => prev.map(f => 
          f.id === file.id ? { 
            ...f, 
            status: 'failed',
            error: error instanceof Error ? error.message : 'Processing failed'
          } : f
        ));
      }

      // Update progress
      setProgress(((i + 1) / uploadedFiles.length) * 100);
    }

    setIsProcessing(false);
    
    const successCount = uploadedFiles.filter(f => f.status === 'matched').length;
    const failedCount = uploadedFiles.filter(f => f.status === 'failed').length;
    
    toast({
      title: "Processing Complete",
      description: `Successfully processed ${successCount} files. ${failedCount} failed.`,
      variant: successCount > 0 ? "default" : "destructive"
    });
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return <FileText className="h-4 w-4 text-gray-500" />;
      case 'processing': return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />;
      case 'matched': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'default';
      case 'matched': return 'default';
      case 'failed': return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Historical Inspection Report Upload
          </CardTitle>
          <CardDescription>
            Upload PDF inspection reports from last year to populate Inspector Intelligence insights.
            Files will be automatically matched to properties and data will be extracted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/10' 
                : 'border-gray-300 hover:border-primary'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Drop PDF files here or click to browse</p>
            <p className="text-sm text-gray-500 mb-4">
              Upload up to 280 inspection report PDFs. Files will be automatically matched to properties.
            </p>
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <Button asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                Select PDF Files
              </label>
            </Button>
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Uploaded Files ({uploadedFiles.length})
                </h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setUploadedFiles([])}
                    disabled={isProcessing}
                  >
                    Clear All
                  </Button>
                  <Button 
                    onClick={processFiles}
                    disabled={isProcessing || uploadedFiles.length === 0}
                  >
                    {isProcessing ? 'Processing...' : 'Process Files'}
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing files...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <ScrollArea className="h-96 border rounded-lg">
                <div className="p-4 space-y-3">
                  {uploadedFiles.map((file) => (
                    <Card key={file.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(file.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">{file.file.name}</p>
                              <Badge variant={getStatusColor(file.status)}>
                                {file.status}
                              </Badge>
                            </div>
                            
                            {file.matchedProperty && (
                              <div className="flex items-center gap-1 text-sm text-green-600 mb-2">
                                <Building2 className="h-3 w-3" />
                                <span>{file.matchedProperty.name}</span>
                              </div>
                            )}

                            {file.extractedData && (
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{file.extractedData.inspectionDate}</span>
                                  </div>
                                  {file.extractedData.totalEstimatedCost && (
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      <span>${file.extractedData.totalEstimatedCost.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {file.extractedData.issues.length} issues found, 
                                  {file.extractedData.findings.length} findings
                                </div>
                              </div>
                            )}

                            {file.error && (
                              <Alert className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{file.error}</AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </div>
                        
                        {!isProcessing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {uploadedFiles.filter(f => f.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {uploadedFiles.filter(f => f.status === 'processing').length}
                </div>
                <div className="text-sm text-gray-500">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {uploadedFiles.filter(f => f.status === 'matched').length}
                </div>
                <div className="text-sm text-gray-500">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {uploadedFiles.filter(f => f.status === 'failed').length}
                </div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}