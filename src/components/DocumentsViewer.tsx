import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Download, Loader2, FileImage, FileSpreadsheet, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface CompanyDocument {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export function DocumentsViewer() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('company_documents')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [profile?.company_id]);

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-5 h-5" />;
    if (fileType.includes('image')) return <FileImage className="w-5 h-5" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="touch-card">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Company Documents</h3>
        </div>
        <div className="py-4 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="touch-card">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Company Documents</h3>
        </div>
        <p className="text-muted-foreground text-sm text-center py-4">No documents available</p>
      </div>
    );
  }

  return (
    <div className="touch-card">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Company Documents</h3>
      </div>
      
      <div className="space-y-3">
        {documents.slice(0, 5).map((doc) => (
          <div 
            key={doc.id} 
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {getFileIcon(doc.file_type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{doc.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(doc.created_at), 'dd MMM yyyy')}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={async () => {
                // Generate signed URL for secure access
                const filePath = doc.file_url.includes('/company-documents/') 
                  ? doc.file_url.split('/company-documents/')[1] 
                  : doc.file_url;
                const { data } = await supabase.storage
                  .from('company-documents')
                  .createSignedUrl(filePath, 3600); // 1 hour expiry
                if (data?.signedUrl) {
                  window.open(data.signedUrl, '_blank');
                }
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        ))}
        
        {documents.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{documents.length - 5} more documents
          </p>
        )}
      </div>
    </div>
  );
}