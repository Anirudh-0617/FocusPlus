import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, CalendarPlus, Loader2 } from "lucide-react";
import { PlannerCalendar } from "@/components/planner/PlannerCalendar";
import { AIInsightsPanel } from "@/components/planner/AIInsightsPanel";
import { UpcomingEventsPanel } from "@/components/planner/UpcomingEventsPanel";
import { QuickAddDialog } from "@/components/planner/QuickAddDialog";
import { RevisionPlanPanel } from "@/components/planner/RevisionPlanPanel";
import { MissedSessionDialog } from "@/components/planner/MissedSessionDialog";
import { ScheduleChangesDialog } from "@/components/planner/ScheduleChangesDialog";
import { DayTasksDialog } from "@/components/planner/DayTasksDialog";
import { StudySessionTimer } from "@/components/planner/StudySessionTimer";
import { isSameDay } from "date-fns";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  subject: string | null;
  priority: string | null;
  status: string | null;
  estimated_minutes: number | null;
}

interface SessionChange {
  session_id: string;
  subject: string;
  original_date: string;
  new_date: string;
  reason: string;
}

interface ScheduleChange {
  task_id: string;
  task_title: string;
  original_date: string;
  new_due_date: string;
  reason: string;
}

export default function Planner() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [missedDialogOpen, setMissedDialogOpen] = useState(false);
  const [replanChanges, setReplanChanges] = useState<SessionChange[]>([]);
  const [replanSummary, setReplanSummary] = useState("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleChanges, setScheduleChanges] = useState<ScheduleChange[]>([]);
  const [scheduleSummary, setScheduleSummary] = useState("");
  const [applyingChanges, setApplyingChanges] = useState(false);
  const [dayTasksDialogOpen, setDayTasksDialogOpen] = useState(false);

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date, subject, priority, status, estimated_minutes")
        .eq("user_id", user!.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setDayTasksDialogOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("user_id", user!.id);

      if (error) throw error;
      
      toast({ title: "Task deleted", description: "The task has been removed." });
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
      throw error;
    }
  };

  const getTasksForSelectedDate = () => {
    return tasks.filter((task) => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), selectedDate);
    });
  };
  const handleQuickAdd = async (taskData: {
    title: string;
    subject: string | null;
    priority: string;
    due_date: Date | null;
    estimated_minutes: number | null;
  }) => {
    try {
      const { error } = await supabase.from("tasks").insert({
        user_id: user!.id,
        title: taskData.title,
        subject: taskData.subject,
        priority: taskData.priority,
        due_date: taskData.due_date?.toISOString() || null,
        estimated_minutes: taskData.estimated_minutes,
        status: "pending",
      });

      if (error) throw error;
      toast({ title: "Task added!", description: `"${taskData.title}" has been added to your planner.` });
      fetchTasks();
    } catch (error) {
      console.error("Error adding task:", error);
      toast({ title: "Error", description: "Failed to add task", variant: "destructive" });
    }
  };

  const handleOptimizeSchedule = async () => {
    setOptimizing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/timetable-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId: user!.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to optimize");
      }
      
      const data = await response.json();
      const changes = data.optimization?.schedule_changes || [];
      const summary = data.optimization?.overall_summary || "Schedule analyzed.";
      
      setScheduleChanges(changes);
      setScheduleSummary(summary);
      setScheduleDialogOpen(true);
    } catch (error) {
      console.error("Error optimizing:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to optimize schedule", 
        variant: "destructive" 
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleApplyScheduleChanges = async () => {
    setApplyingChanges(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/timetable-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ 
          userId: user!.id, 
          applyChanges: true, 
          proposedChanges: scheduleChanges 
        }),
      });

      if (!response.ok) throw new Error("Failed to apply changes");

      toast({ 
        title: "Schedule Updated!", 
        description: `Successfully rescheduled ${scheduleChanges.length} tasks.` 
      });
      setScheduleDialogOpen(false);
      fetchTasks();
    } catch (error) {
      console.error("Error applying changes:", error);
      toast({ 
        title: "Error", 
        description: "Failed to apply schedule changes", 
        variant: "destructive" 
      });
    } finally {
      setApplyingChanges(false);
    }
  };

  const handleAddRevisionToTimetable = async (topic: string, sessions: number) => {
    try {
      const startDate = new Date();
      
      for (let i = 0; i < sessions; i++) {
        const sessionDate = new Date(startDate);
        sessionDate.setDate(startDate.getDate() + i + 1);
        sessionDate.setHours(10, 0, 0, 0);

        await supabase.from("study_sessions").insert({
          user_id: user!.id,
          subject: topic,
          started_at: sessionDate.toISOString(),
          duration_minutes: 45,
          notes: `Revision session ${i + 1} of ${sessions}`,
        });
      }

      toast({
        title: "Revision sessions added",
        description: `Added ${sessions} revision sessions for ${topic}.`,
      });
    } catch (error) {
      console.error("Error adding revision sessions:", error);
      toast({
        title: "Error",
        description: "Failed to add revision sessions",
        variant: "destructive",
      });
    }
  };

  const handleMarkSessionMissed = async (sessionId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/timetable-replan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ sessionId, userId: user!.id }),
        }
      );

      if (!response.ok) throw new Error("Failed to replan");

      const data = await response.json();
      setReplanChanges(data.changes_log || []);
      setReplanSummary(data.summary || "Session has been rescheduled.");
      setMissedDialogOpen(true);
    } catch (error) {
      console.error("Error replanning session:", error);
      toast({
        title: "Error",
        description: "Failed to reschedule session",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold">Study Planner</h1>
              <Badge variant="secondary" className="text-xs">
                AI ENABLED
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              Manage your academic schedule with AI optimization.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleOptimizeSchedule}
              disabled={optimizing}
              className="gap-2"
            >
              {optimizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI Optimize Schedule
            </Button>
            <Button onClick={() => setQuickAddOpen(true)} className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              Quick Add
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Calendar */}
          <PlannerCalendar
            tasks={tasks}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />

          {/* Right Sidebar */}
          <div className="space-y-6">
            <StudySessionTimer onSessionComplete={fetchTasks} />
            <RevisionPlanPanel onAddToTimetable={handleAddRevisionToTimetable} />
            <AIInsightsPanel />
            <UpcomingEventsPanel tasks={tasks} />
          </div>
        </div>

        {/* Quick Add Dialog */}
        <QuickAddDialog
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          onAdd={handleQuickAdd}
        />

        {/* Missed Session Replan Dialog */}
        <MissedSessionDialog
          open={missedDialogOpen}
          onOpenChange={setMissedDialogOpen}
          changes={replanChanges}
          summary={replanSummary}
        />

        {/* Schedule Changes Dialog */}
        <ScheduleChangesDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          changes={scheduleChanges}
          summary={scheduleSummary}
          onApply={handleApplyScheduleChanges}
          applying={applyingChanges}
        />

        {/* Day Tasks Dialog */}
        <DayTasksDialog
          open={dayTasksDialogOpen}
          onOpenChange={setDayTasksDialogOpen}
          selectedDate={selectedDate}
          tasks={getTasksForSelectedDate()}
          onDeleteTask={handleDeleteTask}
        />
      </div>
    </AppLayout>
  );
}
