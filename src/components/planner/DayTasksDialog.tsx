import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Clock, BookOpen, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  subject: string | null;
  priority: string | null;
  status: string | null;
  estimated_minutes: number | null;
  description?: string | null;
}

interface DayTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  tasks: Task[];
  onDeleteTask: (taskId: string) => Promise<void>;
}

function getPriorityColor(priority: string | null) {
  switch (priority) {
    case "high":
      return "bg-destructive/20 text-destructive border-destructive/30";
    case "medium":
      return "bg-primary/20 text-primary border-primary/30";
    case "low":
      return "bg-green-500/20 text-green-600 border-green-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "completed":
      return <Badge variant="outline" className="bg-green-500/20 text-green-600">Completed</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-primary/20 text-primary">In Progress</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

export function DayTasksDialog({
  open,
  onOpenChange,
  selectedDate,
  tasks,
  onDeleteTask,
}: DayTasksDialogProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      await onDeleteTask(taskToDelete.id);
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              {tasks.length === 0
                ? "No tasks scheduled for this day."
                : `${tasks.length} task${tasks.length > 1 ? "s" : ""} scheduled`}
            </DialogDescription>
          </DialogHeader>

          {tasks.length > 0 ? (
            <ScrollArea className="max-h-[400px] pr-2">
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium truncate">{task.title}</h4>
                          {getStatusBadge(task.status)}
                        </div>

                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge
                            variant="outline"
                            className={getPriorityColor(task.priority)}
                          >
                            {task.priority || "No"} priority
                          </Badge>

                          {task.subject && (
                            <Badge variant="secondary" className="gap-1">
                              <BookOpen className="h-3 w-3" />
                              {task.subject}
                            </Badge>
                          )}

                          {task.estimated_minutes && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {task.estimated_minutes} min
                            </Badge>
                          )}
                        </div>

                        {task.description && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDeleteClick(task)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tasks for this day</p>
              <p className="text-sm mt-1">Click "Quick Add" to create one</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
