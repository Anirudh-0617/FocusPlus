import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Plus, CheckCircle, Clock, Calendar, Trash2, Edit2, Loader2, Trophy, Star } from "lucide-react";
import { format } from "date-fns";
import { TaskReviewDialog } from "@/components/tasks/TaskReviewDialog";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  subject: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  created_at: string;
  completed_at: string | null;
}

const getXPForTask = (priority: string | null, estimatedMinutes: number | null) => {
  let base = 20;
  if (priority === "high") base = 50;
  else if (priority === "medium") base = 30;
  if (estimatedMinutes && estimatedMinutes > 60) base += 10;
  return base;
};

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [taskToReview, setTaskToReview] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    subject: "",
    due_date: "",
    estimated_minutes: "",
  });

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const taskData = {
        user_id: user!.id,
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        subject: formData.subject || null,
        due_date: formData.due_date || null,
        estimated_minutes: formData.estimated_minutes ? parseInt(formData.estimated_minutes) : null,
        status: "pending",
      };

      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", editingTask.id);
        if (error) throw error;
        toast({ title: "Task updated successfully" });
      } else {
        const { error } = await supabase.from("tasks").insert(taskData);
        if (error) throw error;
        toast({ title: "Quest added!", description: `Complete it to earn XP!` });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      toast({ title: "Failed to save task", variant: "destructive" });
    }
  };

  const toggleComplete = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    
    if (newStatus === "completed") {
      // Show review dialog before completing
      setTaskToReview(task);
      setReviewDialogOpen(true);
      return;
    }

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "pending",
          completed_at: null,
        })
        .eq("id", task.id);

      if (error) throw error;
      fetchTasks();
      toast({ title: "Quest reopened" });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const completeTaskWithReview = async (rating: number, comments: string) => {
    if (!taskToReview) return;

    try {
      // Update task status
      const { error: taskError } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskToReview.id);

      if (taskError) throw taskError;

      // Insert review
      const { error: reviewError } = await supabase
        .from("task_reviews")
        .insert({
          task_id: taskToReview.id,
          user_id: user!.id,
          difficulty_rating: rating,
          comments: comments || null,
        });

      if (reviewError) throw reviewError;

      const xp = getXPForTask(taskToReview.priority, taskToReview.estimated_minutes);
      toast({
        title: "Quest completed! 🎉",
        description: `You earned ${xp} XP! Thanks for your review.`,
      });

      fetchTasks();
    } catch (error) {
      console.error("Error completing task:", error);
      toast({ title: "Failed to complete task", variant: "destructive" });
    } finally {
      setReviewDialogOpen(false);
      setTaskToReview(null);
    }
  };

  const skipReviewAndComplete = async () => {
    if (!taskToReview) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskToReview.id);

      if (error) throw error;

      const xp = getXPForTask(taskToReview.priority, taskToReview.estimated_minutes);
      toast({
        title: "Quest completed! 🎉",
        description: `You earned ${xp} XP!`,
      });

      fetchTasks();
    } catch (error) {
      console.error("Error completing task:", error);
    } finally {
      setReviewDialogOpen(false);
      setTaskToReview(null);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      fetchTasks();
      toast({ title: "Quest removed" });
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      subject: "",
      due_date: "",
      estimated_minutes: "",
    });
    setEditingTask(null);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "medium",
      subject: task.subject || "",
      due_date: task.due_date?.split("T")[0] || "",
      estimated_minutes: task.estimated_minutes?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  
  const totalXP = completedTasks.reduce((acc, task) => acc + getXPForTask(task.priority, task.estimated_minutes), 0);

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("tasks.title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("tasks.xpEarned")}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-warning/10 border border-warning/30 px-4 py-2">
              <Trophy className="h-5 w-5 text-warning" />
              <span className="font-bold">{t("tasks.totalXP")}: {totalXP}</span>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="focus-gradient gap-2">
                  <Plus className="h-4 w-4" /> {t("tasks.addTask")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingTask ? t("common.edit") : t("tasks.newTask")}</DialogTitle>
                  <DialogDescription>
                    {editingTask ? t("common.edit") : t("tasks.addTask")}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t("tasks.taskTitle")} *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Complete Physics Chapter 4..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add details..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (20 XP)</SelectItem>
                          <SelectItem value="medium">Medium (30 XP)</SelectItem>
                          <SelectItem value="high">High (50 XP)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Category</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Study, Work..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimated_minutes">Est. Minutes</Label>
                      <Input
                        id="estimated_minutes"
                        type="number"
                        value={formData.estimated_minutes}
                        onChange={(e) => setFormData({ ...formData, estimated_minutes: e.target.value })}
                        placeholder="60"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="focus-gradient">
                      {editingTask ? "Update" : "Create"} Quest
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Quests</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="focus-gradient">Add Quest</Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="mb-2 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No quests yet. Add one to start earning XP!</p>
                </div>
              ) : (
                <>
                  {pendingTasks.map((task) => {
                    const xp = getXPForTask(task.priority, task.estimated_minutes);
                    return (
                      <div
                        key={task.id}
                        className="group flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 transition-all hover:border-primary/40"
                      >
                        <button
                          onClick={() => toggleComplete(task)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary/50 transition-colors hover:bg-primary/20"
                        >
                          <div className="h-2 w-2 rounded-full" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium">{task.title}</h3>
                          {task.subject && (
                            <p className="text-sm text-muted-foreground">{task.subject}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30 gap-1">
                          {xp} XP <Star className="h-3 w-3 fill-warning" />
                        </Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(task)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {completedTasks.map((task) => {
                    const xp = getXPForTask(task.priority, task.estimated_minutes);
                    return (
                      <div
                        key={task.id}
                        className="group flex items-center gap-4 rounded-xl border border-success/20 bg-success/5 p-4 opacity-60"
                      >
                        <button
                          onClick={() => toggleComplete(task)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-success bg-success transition-colors"
                        >
                          <CheckCircle className="h-4 w-4 text-success-foreground" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium line-through text-muted-foreground">{task.title}</h3>
                          {task.subject && (
                            <p className="text-sm text-muted-foreground">{task.subject}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground gap-1">
                          {xp} XP <Star className="h-3 w-3" />
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Review Dialog */}
        <TaskReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          taskTitle={taskToReview?.title || ""}
          taskSubject={taskToReview?.subject || null}
          onSubmit={completeTaskWithReview}
          onSkip={skipReviewAndComplete}
        />
      </div>
    </AppLayout>
  );
}
