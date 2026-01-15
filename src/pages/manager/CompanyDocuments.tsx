import { useState, useEffect, useRef } from 'react';
import { DesktopManagerLayout } from '@/components/layout/DesktopManagerLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Loader2, FileText, Trash2, Download, Upload, File, FileImage, FileSpreadsheet } from 'lucide-react';
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

export default function CompanyDocuments() {
  const { profile, user } = useAuth();
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<CompanyDocument | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchDocuments = async () => {
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
  };

  useEffect(() => {
    if (profile?.company_id) {
      fetchDocuments();
    }
  }, [profile?.company_id]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      toast({ title: 'Please provide a title and select a file', variant: 'destructive' });
      return;
    }
    if (!profile?.company_id || !user?.id) {
      toast({ title: 'Session error - please refresh', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${profile.company_id}/${Date.now()}_${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Store the file path (not URL) for signed URL generation later
      const filePath = fileName;

      // Create document record with file path instead of public URL
      const { error: insertError } = await supabase
        .from('company_documents')
        .insert({
          company_id: profile.company_id,
          title: title.trim(),
          description: description.trim() || null,
          file_url: filePath, // Store path, not public URL
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      toast({ title: 'Document uploaded successfully' });
      setDialogOpen(false);
      resetForm();
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({ title: 'Failed to upload document', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;

    try {
      // The file_url now stores the file path directly
      const filePath = deleteDoc.file_url;
      
      // Check if it's an old-style URL or new-style path
      if (filePath.includes('/company-documents/')) {
        const urlParts = filePath.split('/company-documents/');
        if (urlParts.length > 1) {
          await supabase.storage.from('company-documents').remove([urlParts[1]]);
        }
      } else {
        // New style: file_url is just the path
        await supabase.storage.from('company-documents').remove([filePath]);
      }

      const { error } = await supabase
        .from('company_documents')
        .delete()
        .eq('id', deleteDoc.id);

      if (error) throw error;
      toast({ title: 'Document deleted' });
      fetchDocuments();
    } catch (error: any) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    }
    setDeleteDoc(null);
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-8 h-8" />;
    if (fileType.includes('image')) return <FileImage className="w-8 h-8" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="w-8 h-8" />;
    return <FileText className="w-8 h-8" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DesktopManagerLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Company Documents</h1>
            <p className="text-muted-foreground">Upload and manage company-wide documents</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                  />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileText className="w-12 h-12 mx-auto text-primary" />
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Click to select a file</p>
                      <p className="text-xs text-muted-foreground">PDF, Word, Excel, PowerPoint, Images</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Document title" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Brief description of the document..."
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={handleUpload} 
                  disabled={saving || !selectedFile || !title.trim()} 
                  className="w-full"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  {saving ? 'Uploading...' : 'Upload Document'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : documents.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload company policies, newsletters, and more</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="touch-card group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{format(new Date(doc.created_at), 'dd MMM yyyy')}</span>
                      {doc.file_size && <span>• {formatFileSize(doc.file_size)}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={async () => {
                      // Generate signed URL for secure access
                      const filePath = doc.file_url.includes('/company-documents/') 
                        ? doc.file_url.split('/company-documents/')[1] 
                        : doc.file_url;
                      const { data, error } = await supabase.storage
                        .from('company-documents')
                        .createSignedUrl(filePath, 3600); // 1 hour expiry
                      if (data?.signedUrl) {
                        window.open(data.signedUrl, '_blank');
                      } else {
                        toast({ title: 'Failed to generate download link', variant: 'destructive' });
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteDoc(doc)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteDoc?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DesktopManagerLayout>
  );
}