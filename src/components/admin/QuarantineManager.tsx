import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, Trash2, CheckCircle, AlertTriangle, Clock, FileWarning, Eye, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuarantineFile {
  id: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  scan_id: string;
  threat_type: string;
  threat_details: string;
  scan_result: any;
  uploader_id: string;
  quarantined_at: string;
  expires_at: string;
  status: 'pending' | 'clean' | 'infected' | 'deleted';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export const QuarantineManager: React.FC = () => {
  const [files, setFiles] = useState<QuarantineFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<QuarantineFile | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQuarantineFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quarantine_files')
        .select('*')
        .order('quarantined_at', { ascending: false });

      if (error) throw error;
      setFiles((data as QuarantineFile[]) || []);
    } catch (error) {
      console.error('Error fetching quarantine files:', error);
      toast.error('Erreur lors du chargement des fichiers en quarantaine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuarantineFiles();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
      case 'clean':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Propre</Badge>;
      case 'infected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Infecté</Badge>;
      case 'deleted':
        return <Badge variant="outline" className="bg-muted text-muted-foreground"><Trash2 className="w-3 h-3 mr-1" /> Supprimé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleMarkClean = async () => {
    if (!selectedFile) return;
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('quarantine_files')
        .update({
          status: 'clean',
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', selectedFile.id);

      if (error) throw error;
      
      toast.success('Fichier marqué comme propre');
      setSelectedFile(null);
      setReviewNotes('');
      fetchQuarantineFiles();
    } catch (error) {
      console.error('Error marking file clean:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkInfected = async () => {
    if (!selectedFile) return;
    setActionLoading(true);
    
    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('content')
        .remove([selectedFile.storage_path]);

      if (storageError) {
        console.warn('Storage deletion warning:', storageError);
      }

      // Update record
      const { error } = await supabase
        .from('quarantine_files')
        .update({
          status: 'infected',
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', selectedFile.id);

      if (error) throw error;
      
      toast.success('Fichier marqué comme infecté et supprimé');
      setSelectedFile(null);
      setReviewNotes('');
      fetchQuarantineFiles();
    } catch (error) {
      console.error('Error marking file infected:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpired = async () => {
    setActionLoading(true);
    
    try {
      // Get expired pending files
      const { data: expiredFiles, error: fetchError } = await supabase
        .from('quarantine_files')
        .select('id, storage_path')
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());

      if (fetchError) throw fetchError;

      if (!expiredFiles || expiredFiles.length === 0) {
        toast.info('Aucun fichier expiré à supprimer');
        return;
      }

      // Delete from storage
      const paths = expiredFiles.map(f => f.storage_path);
      await supabase.storage.from('content').remove(paths);

      // Update status
      const { error } = await supabase
        .from('quarantine_files')
        .update({ status: 'deleted' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;

      toast.success(`${expiredFiles.length} fichiers expirés supprimés`);
      fetchQuarantineFiles();
    } catch (error) {
      console.error('Error deleting expired files:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const infectedCount = files.filter(f => f.status === 'infected').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-500" />
              Quarantaine Antivirus
            </CardTitle>
            <CardDescription>
              Gérez les fichiers suspects mis en quarantaine
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchQuarantineFiles} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteExpired}
              disabled={actionLoading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer expirés
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{files.length}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-500/10">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                <div className="text-sm text-muted-foreground">En attente</div>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{infectedCount}</div>
                <div className="text-sm text-muted-foreground">Infectés</div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {files.filter(f => f.status === 'clean').length}
                </div>
                <div className="text-sm text-muted-foreground">Propres</div>
              </CardContent>
            </Card>
          </div>

          {/* Files Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileWarning className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun fichier en quarantaine</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Menace</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Quarantaine</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {files.map((file) => (
                      <motion.tr
                        key={file.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b"
                      >
                        <TableCell>
                          <div className="max-w-[200px] truncate font-mono text-sm">
                            {file.original_filename}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {file.mime_type}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-red-600 font-medium">
                            {file.threat_type || 'Inconnu'}
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(file.file_size)}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(file.quarantined_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(file.expires_at), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell>{getStatusBadge(file.status)}</TableCell>
                        <TableCell>
                          {file.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFile(file)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-yellow-500" />
              Examiner le fichier
            </DialogTitle>
            <DialogDescription>
              Analysez les détails et décidez du sort du fichier
            </DialogDescription>
          </DialogHeader>

          {selectedFile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nom:</span>
                  <p className="font-mono truncate">{selectedFile.original_filename}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p>{selectedFile.mime_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Taille:</span>
                  <p>{formatFileSize(selectedFile.file_size)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Menace:</span>
                  <p className="text-red-600">{selectedFile.threat_type || 'Inconnu'}</p>
                </div>
              </div>

              {selectedFile.threat_details && (
                <div className="p-3 bg-red-500/10 rounded-lg text-sm">
                  <span className="font-medium text-red-600">Détails:</span>
                  <p className="mt-1 text-red-700">{selectedFile.threat_details}</p>
                </div>
              )}

              {selectedFile.scan_result && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Résultat du scan complet
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-40 text-xs">
                    {JSON.stringify(selectedFile.scan_result, null, 2)}
                  </pre>
                </details>
              )}

              <div>
                <label className="text-sm font-medium">Notes de review</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Ajoutez des notes sur votre décision..."
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedFile(null)}
              disabled={actionLoading}
            >
              Annuler
            </Button>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleMarkClean}
              disabled={actionLoading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Marquer propre
            </Button>
            <Button
              variant="destructive"
              onClick={handleMarkInfected}
              disabled={actionLoading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer (infecté)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
