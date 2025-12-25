import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, X, Save, FileText, Image, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PdfViewer } from "@/components/notes/PdfViewer";

interface Note {
  id: string;
  title: string;
  content: string | null;
  file_url: string | null;
  file_type: string | null;
}

interface FilePreviewProps {
  note: Note;
  onClose: () => void;
  onUpdate: () => void;
}

export function FilePreview({ note, onClose, onUpdate }: FilePreviewProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(note.content || "");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setNotes(note.content || "");
    setHasChanges(false);
  }, [note.id]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setHasChanges(value !== (note.content || ""));
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("notes")
        .update({ content: notes })
        .eq("id", note.id);

      if (error) throw error;
      toast({ title: "Notes saved" });
      setHasChanges(false);
      onUpdate();
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({ title: "Failed to save notes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = () => {
    if (!note.file_url) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <FileText className="h-16 w-16 mb-4" />
          <p className="text-lg font-medium">Text Note</p>
          <p className="text-sm">No file attached</p>
        </div>
      );
    }

    const fileType = note.file_type || "";
    const fileName = note.title.toLowerCase();

    if (fileType.includes("image")) {
      return (
        <div className="h-full flex items-center justify-center p-4 bg-muted/30">
          <img
            src={note.file_url}
            alt={note.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          />
        </div>
      );
    }

    if (fileType.includes("pdf")) {
      return (
        <PdfViewer fileUrl={note.file_url!} title={note.title} />
      );
    }

    if (fileType.includes("text") || fileType.includes("markdown")) {
      return (
        <iframe
          src={note.file_url}
          className="w-full h-full border-0 rounded-lg bg-background"
          title={note.title}
        />
      );
    }

    // Office documents: Word, Excel, PowerPoint
    const isOfficeDoc = 
      fileType.includes("word") || 
      fileType.includes("document") ||
      fileType.includes("spreadsheet") ||
      fileType.includes("excel") ||
      fileType.includes("presentation") ||
      fileType.includes("powerpoint") ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc") ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".pptx") ||
      fileName.endsWith(".ppt");

    if (isOfficeDoc) {
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(note.file_url)}`;
      return (
        <iframe
          src={viewerUrl}
          className="w-full h-full border-0"
          title={note.title}
        />
      );
    }

    // Fallback for other file types
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <File className="h-16 w-16 mb-4" />
        <p className="text-lg font-medium">{note.title}</p>
        <p className="text-sm mb-4">Preview not available for this file type</p>
        <a href={note.file_url} target="_blank" rel="noopener noreferrer">
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex">
      {/* Main preview area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {note.file_type?.includes("image") ? (
              <Image className="h-5 w-5 text-primary" />
            ) : note.file_type?.includes("pdf") ? (
              <File className="h-5 w-5 text-destructive" />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
            <h2 className="font-semibold truncate max-w-md">{note.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {note.file_url && (
              <a href={note.file_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </a>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </div>

      {/* Notes sidebar */}
      <div className="w-80 border-l flex flex-col bg-muted/20">
        <div className="h-14 border-b flex items-center justify-between px-4">
          <h3 className="font-semibold">Notes</h3>
          <Button
            size="sm"
            onClick={saveNotes}
            disabled={!hasChanges || saving}
            className="focus-gradient"
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
        <div className="flex-1 p-4">
          <Textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Write important points here..."
            className="h-full resize-none text-sm"
          />
        </div>
      </div>
    </div>
  );
}
