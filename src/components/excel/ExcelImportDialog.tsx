import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string }>;
  clientsCreated: number;
}

export function ExcelImportDialog({ open, onOpenChange, onImportComplete }: ExcelImportDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Invalid file type",
        description: "Please select an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Remove header row and filter empty rows
      const [headers, ...rows] = jsonData as string[][];
      const validRows = rows.filter(row => row.some(cell => cell && String(cell).trim()));

      if (validRows.length === 0) {
        throw new Error("No valid data found in the Excel file");
      }

      setProgress(25);

      // Call the edge function to process the data
      const { data: result, error } = await supabase.functions.invoke('import-roofs', {
        body: {
          headers,
          rows: validRows
        }
      });

      if (error) {
        throw error;
      }

      setProgress(100);
      setImportResult(result);
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${result.success} roofs. ${result.clientsCreated} new clients created.`,
      });

      onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      fileInputRef.current.files = e.dataTransfer.files;
      const event = { target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(event);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Roofs from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!uploading && !importResult && (
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your Excel file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports .xlsx and .xls files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {uploading && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Processing Excel file...</p>
                <Progress value={progress} className="w-full" />
              </div>
            </div>
          )}

          {importResult && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Import completed successfully! {importResult.success} roofs imported.
                  {importResult.clientsCreated > 0 && ` ${importResult.clientsCreated} new clients created.`}
                </AlertDescription>
              </Alert>

              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {importResult.errors.length} rows had errors:
                    <ul className="mt-2 text-xs">
                      {importResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>Row {error.row}: {error.error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>... and {importResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setImportResult(null);
                    setProgress(0);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Import Another File
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}