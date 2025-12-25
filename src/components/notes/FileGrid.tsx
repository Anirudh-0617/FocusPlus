import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, File, Image, Trash2, MoreVertical, FolderInput } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
}

interface FileGridProps {
  notes: Note[];
  folders: Folder[];
  onSelectNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onMoveToFolder: (noteId: string, folderId: string | null) => void;
}

export function FileGrid({ notes, folders, onSelectNote, onDeleteNote, onMoveToFolder }: FileGridProps) {
  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileText className="h-10 w-10 text-primary" />;
    if (fileType.includes("pdf")) return <File className="h-10 w-10 text-destructive" />;
    if (fileType.includes("image")) return <Image className="h-10 w-10 text-blue-500" />;
    return <FileText className="h-10 w-10 text-primary" />;
  };

  const getThumbnail = (note: Note) => {
    if (note.file_url && note.file_type?.includes("image")) {
      return (
        <div className="h-24 w-full rounded-md overflow-hidden bg-muted mb-2">
          <img
            src={note.file_url}
            alt={note.title}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    return (
      <div className="h-24 w-full rounded-md bg-muted/50 flex items-center justify-center mb-2">
        {getFileIcon(note.file_type)}
      </div>
    );
  };

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No files in this folder</p>
        <p className="text-sm">Upload a file or create a note to get started</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {notes.map((note) => (
        <Card
          key={note.id}
          className="group cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg relative"
          onClick={() => onSelectNote(note)}
        >
          <CardContent className="p-3">
            {getThumbnail(note)}
            <div className="flex items-start justify-between gap-1">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{note.title}</h3>
                {note.subject && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {note.subject}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(note.updated_at), "MMM d, yyyy")}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FolderInput className="h-4 w-4 mr-2" />
                      Move to folder
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => onMoveToFolder(note.id, null)}>
                        No folder
                      </DropdownMenuItem>
                      {folders.map((folder) => (
                        <DropdownMenuItem
                          key={folder.id}
                          onClick={() => onMoveToFolder(note.id, folder.id)}
                        >
                          {folder.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDeleteNote(note.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
