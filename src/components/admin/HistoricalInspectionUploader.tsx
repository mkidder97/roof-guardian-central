import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { HistoricalInspectionService, ProcessedPDFResult } from "@/lib/historicalInspectionService";
import { PropertyMatch } from "@/lib/propertyMatcher";
import { ExtractedPDFData } from "@/lib/realPdfParser";

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'matched' | 'failed';
  matchedProperty?: PropertyMatch;
  extractedData?: ExtractedPDFData;
  processedResult?: ProcessedPDFResult;
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
  const [showManualMatchDialog, setShowManualMatchDialog] = useState(false);
  const [selectedFileForManualMatch, setSelectedFileForManualMatch] = useState<UploadedFile | null>(null);
  const [manualSelectedPropertyId, setManualSelectedPropertyId] = useState<string>('');

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

  // Removed - now using PropertyMatcher from real PDF parser

  // Removed - now using RealPDFParser through HistoricalInspectionService

  const handleManualPropertyMatch = async () => {
    if (!selectedFileForManualMatch || !manualSelectedPropertyId) return;

    try {
      // Find the selected property
      const selectedProperty = properties.find(p => p.id === manualSelectedPropertyId);
      if (!selectedProperty) {
        toast({
          title: "Error",
          description: "Selected property not found",
          variant: "destructive"
        });
        return;
      }

      // Update the file to processing status
      setUploadedFiles(prev => prev.map(f => 
        f.id === selectedFileForManualMatch.id ? { ...f, status: 'processing' as const } : f
      ));

      // Store the inspection with the manually selected property
      const storedResult = await HistoricalInspectionService.storeHistoricalInspection(
        selectedProperty.id,
        selectedFileForManualMatch.extractedData || {} as ExtractedPDFData,
        selectedFileForManualMatch.file
      );

      if (storedResult.success) {
        // Update file status to matched
        setUploadedFiles(prev => prev.map(f => 
          f.id === selectedFileForManualMatch.id ? { 
            ...f, 
            status: 'matched' as const,
            matchedProperty: {
              id: selectedProperty.id,
              property_name: selectedProperty.property_name,
              address: selectedProperty.address,
              city: selectedProperty.city,
              state: selectedProperty.state,
              confidence: 1.0, // Manual selection is 100% confidence
              matchType: 'manual' as const
            },
            error: undefined
          } : f
        ));

        toast({
          title: "Success",
          description: `Successfully processed ${selectedFileForManualMatch.file.name} with ${selectedProperty.property_name}`,
        });
      } else {
        // Update file status back to failed with new error
        setUploadedFiles(prev => prev.map(f => 
          f.id === selectedFileForManualMatch.id ? { 
            ...f, 
            status: 'failed' as const,
            error: storedResult.error || 'Failed to store inspection data'
          } : f
        ));

        toast({
          title: "Error",
          description: storedResult.error || 'Failed to process file',
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error in manual property matching:', error);
      
      // Update file status back to failed
      setUploadedFiles(prev => prev.map(f => 
        f.id === selectedFileForManualMatch.id ? { 
          ...f, 
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Processing failed'
        } : f
      ));

      toast({
        title: "Error",
        description: "Failed to process file with selected property",
        variant: "destructive"
      });
    } finally {
      // Close dialog and reset state
      setShowManualMatchDialog(false);
      setSelectedFileForManualMatch(null);
      setManualSelectedPropertyId('');
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

        // Process PDF using the new real PDF parser and property matcher
        const processedResult = await HistoricalInspectionService.processPDFFile(file.file);
        
        if (processedResult.success && processedResult.propertyMatch) {
          // Update file status to matched
          setUploadedFiles(prev => prev.map(f => 
            f.id === file.id ? { 
              ...f, 
              status: 'matched',
              matchedProperty: processedResult.propertyMatch!,
              extractedData: processedResult.extractedData,
              processedResult
            } : f
          ));
        } else {
          // Processing failed or no property match
          throw new Error(processedResult.error || 'Processing failed');
        }

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
                                <span>{file.matchedProperty.property_name}</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {Math.round(file.matchedProperty.confidence * 100)}% match
                                </Badge>
                              </div>
                            )}

                            {file.extractedData && (
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{file.extractedData.reportDate || 'Date not found'}</span>
                                  </div>
                                  {file.extractedData.roofArea > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      <span>{file.extractedData.roofArea.toLocaleString()} sq ft</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {file.extractedData.reportType} • {file.extractedData.inspectionCompany}
                                  {file.extractedData.roofSystem && ` • ${file.extractedData.roofSystem}`}
                                </div>
                                {file.extractedData.inspectionTypeClassification && file.extractedData.inspectionTypeClassification.primaryType !== 'unknown' && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      Type: {file.extractedData.inspectionTypeClassification.primaryType.replace('_', ' ')}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {Math.round(file.extractedData.inspectionTypeClassification.confidence * 100)}% confidence
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {file.error && (
                              <Alert className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{file.error}</AlertDescription>
                                {file.status === 'failed' && file.error.includes('Could not match property') && (
                                  <div className="mt-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedFileForManualMatch(file);
                                        setShowManualMatchDialog(true);
                                      }}
                                    >
                                      Select Property Manually
                                    </Button>
                                  </div>
                                )}
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

      {/* Manual Property Selection Dialog */}
      <Dialog open={showManualMatchDialog} onOpenChange={setShowManualMatchDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual Property Selection</DialogTitle>
          </DialogHeader>
          
          {selectedFileForManualMatch && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Failed File:</h4>
                <p className="text-sm">{selectedFileForManualMatch.file.name}</p>
                {selectedFileForManualMatch.extractedData && (
                  <p className="text-sm text-gray-600 mt-1">
                    Extracted Property: "{selectedFileForManualMatch.extractedData.propertyName}"
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Correct Property:
                </label>
                <Select value={manualSelectedPropertyId} onValueChange={setManualSelectedPropertyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a property..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.property_name} - {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowManualMatchDialog(false);
                setSelectedFileForManualMatch(null);
                setManualSelectedPropertyId('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleManualPropertyMatch()}
              disabled={!manualSelectedPropertyId}
            >
              Process with Selected Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}