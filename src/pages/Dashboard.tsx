import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { TodaysAgenda } from "@/components/dashboard/TodaysAgenda";
import {
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Target,
  TrendingUp,
  Flame,
} from "lucide-react";

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  totalNotes: number;
  totalStudyMinutes: number;
  todaySessions: number;
}

interface RecentNote {
  id: string;
  title: string;
  file_type: string | null;
  updated_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    totalNotes: 0,
    totalStudyMinutes: 0,
    todaySessions: 0,
  });
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const [tasksRes, notesRes, sessionsRes, recentNotesRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user!.id),
        supabase.from("notes").select("id").eq("user_id", user!.id),
        supabase.from("study_sessions").select("*").eq("user_id", user!.id),
        supabase.from("notes").select("id, title, file_type, updated_at").eq("user_id", user!.id).order("updated_at", { ascending: false }).limit(5),
      ]);

      const tasks = tasksRes.data || [];
      const notes = notesRes.data || [];
      const sessions = sessionsRes.data || [];

      const today = new Date().toISOString().split("T")[0];
      const todaySessions = sessions.filter((s) => s.started_at.startsWith(today));

      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        totalNotes: notes.length,
        totalStudyMinutes: sessions.reduce((acc, s) => acc + s.duration_minutes, 0),
        todaySessions: todaySessions.length,
      });
      setRecentNotes(recentNotesRes.data || []);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const taskProgress = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;
  const studyHours = Math.floor(stats.totalStudyMinutes / 60);
  const studyMins = stats.totalStudyMinutes % 60;

  const quickActions = [
    { labelKey: "tasks.addTask", icon: Plus, to: "/tasks", color: "bg-primary" },
    { labelKey: "notes.uploadFile", icon: FileText, to: "/notes", color: "bg-accent" },
    { labelKey: "planner.startSession", icon: Clock, to: "/planner", color: "bg-success" },
    { labelKey: "nav.chat", icon: MessageSquare, to: "/chat", color: "bg-info" },
  ];

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {t("dashboard.welcome")},{" "}
            <span className="focus-gradient-text">
              {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student"}
            </span>
          </h1>
          <p className="mt-1 text-muted-foreground">{t("dashboard.todaysFocus")}</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.labelKey} to={action.to}>
              <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`rounded-lg ${action.color} p-2.5`}>
                    <action.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-medium group-hover:text-primary transition-colors">
                    {t(action.labelKey)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.tasksCompleted")}</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.completedTasks}/{stats.totalTasks}
              </div>
              <Progress value={taskProgress} className="mt-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {taskProgress.toFixed(0)}% {t("tasks.completed")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.hoursStudied")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {studyHours}h {studyMins}m
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("planner.sessionCompleted")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("notes.title")}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalNotes}</div>
              <p className="mt-2 text-xs text-muted-foreground">{t("notes.uploadFile")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("planner.todaySchedule")}</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todaySessions}</div>
              <p className="mt-2 text-xs text-muted-foreground">{t("planner.sessionActive")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Agenda */}
        <div className="mb-8">
          <TodaysAgenda />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Files */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {t("dashboard.recentFiles")}
                  </CardTitle>
                  <CardDescription>{t("dashboard.recentFilesDesc")}</CardDescription>
                </div>
                <Link to="/notes">
                  <Button variant="outline" size="sm">{t("common.viewAll")}</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="mb-2 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t("notes.noFiles")}</p>
                  <Link to="/notes">
                    <Button variant="link" className="mt-2">{t("notes.uploadFile")}</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentNotes.map((note) => (
                    <Link key={note.id} to="/notes" className="block">
                      <div className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                        <div className="rounded-md bg-primary/10 p-2">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{note.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {note.file_type?.toUpperCase() || "Note"} • {new Date(note.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Study Insights */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {t("landing.smartPlanning")}
                  </CardTitle>
                  <CardDescription>{t("landing.smartPlanningDesc")}</CardDescription>
                </div>
                <Link to="/chat">
                  <Button variant="outline" size="sm">{t("nav.chat")}</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm">
                  <span className="font-medium text-primary">💡 {t("landing.aiChat")}:</span> {t("landing.aiChatDesc")}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <Calendar className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t("planner.todaySchedule")}</p>
                  <p className="font-semibold">{stats.todaySessions}</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <Flame className="mx-auto mb-1 h-5 w-5 text-warning" />
                  <p className="text-xs text-muted-foreground">{t("dashboard.studyStreak")}</p>
                  <p className="font-semibold">{t("common.success")}!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
