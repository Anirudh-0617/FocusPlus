import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Upload, Loader2 } from "lucide-react";
import { FolderSidebar } from "@/components/notes/FolderSidebar";
import { FileGrid } from "@/components/notes/FileGrid";
import { FilePreview } from "@/components/notes/FilePreview";

interface Note {
  id: string;
  title: string;
  content: string | null;
  subject: string | null;
  tags: string[] | null;
  file_url: string | null;
  file_type: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
}

export default function Notes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    subject: "",
    tags: "",
  });

  useEffect(() => {
    if (user) {
      fetchNotes();
      fetchFolders();
    }
  }, [user]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", user!.id)
        .order("name");

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const noteData = {
        user_id: user!.id,
        title: formData.title,
        content: formData.content || null,
        subject: formData.subject || null,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
        folder_id: selectedFolderId,
      };

      const { error } = await supabase.from("notes").insert(noteData);
      if (error) throw error;

      toast({ title: "Note created successfully" });
      setIsDialogOpen(false);
      resetForm();
      fetchNotes();
    } catch (error) {
      console.error("Error creating note:", error);
      toast({ title: "Failed to create note", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 50MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user!.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("notes")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("notes").getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("notes").insert({
        user_id: user!.id,
        title: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        folder_id: selectedFolderId,
      });

      if (insertError) throw insertError;

      toast({ title: "File uploaded successfully" });
      fetchNotes();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({ title: "Failed to upload file", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
      fetchNotes();
      toast({ title: "Note deleted" });
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const createFolder = async (name: string, parentId?: string | null) => {
    try {
      const { error } = await supabase.from("folders").insert({
        user_id: user!.id,
        name,
        parent_id: parentId || null,
      });
      if (error) throw error;
      toast({ title: "Folder created" });
      fetchFolders();
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({ title: "Failed to create folder", variant: "destructive" });
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase.from("folders").delete().eq("id", folderId);
      if (error) throw error;
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      toast({ title: "Folder deleted" });
      fetchFolders();
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  const moveToFolder = async (noteId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from("notes")
        .update({ folder_id: folderId })
        .eq("id", noteId);
      if (error) throw error;
      toast({ title: folderId ? "Moved to folder" : "Removed from folder" });
      fetchNotes();
    } catch (error) {
      console.error("Error moving note:", error);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", subject: "", tags: "" });
  };

  const filteredNotes = notes.filter((note) => {
    const matchesFolder = selectedFolderId === null || note.folder_id === selectedFolderId;
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Folder sidebar */}
        <FolderSidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={createFolder}
          onDeleteFolder={deleteFolder}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t("notes.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("notes.uploadFile")}</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload File
                </Button>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="focus-gradient gap-2">
                    <Plus className="h-4 w-4" /> New Note
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Note</DialogTitle>
                    <DialogDescription>Add a new note to your collection</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Note title..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Write your notes..."
                        rows={6}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder="Math, Science..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tags">Tags (comma-separated)</Label>
                        <Input
                          id="tags"
                          value={formData.tags}
                          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                          placeholder="exam, chapter1..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="focus-gradient">
                        Create Note
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="pl-10"
              />
            </div>
          </div>

          {/* File grid */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <FileGrid
                notes={filteredNotes}
                folders={folders}
                onSelectNote={setSelectedNote}
                onDeleteNote={deleteNote}
                onMoveToFolder={moveToFolder}
              />
            )}
          </div>
        </div>
      </div>

      {/* File preview overlay */}
      {selectedNote && (
        <FilePreview
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onUpdate={fetchNotes}
        />
      )}
    </AppLayout>
  );
}
