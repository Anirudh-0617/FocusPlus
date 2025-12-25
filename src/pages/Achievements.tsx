import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Flame, Target, Clock, BookOpen, Brain, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AchievementData {
  id: number;
  title: string;
  description: string;
  icon: typeof Star;
  unlocked: boolean;
  progress: number;
  current?: number;
  target?: number;
}

export default function Achievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [stats, setStats] = useState({
    totalXP: 0,
    currentStreak: 0,
    unlockedCount: 0,
    totalAchievements: 6,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAchievementProgress();
    }
  }, [user]);

  const fetchAchievementProgress = async () => {
    if (!user) return;

    try {
      // Fetch all required data in parallel
      const [
        { data: studySessions },
        { data: tasks },
        { data: notes },
        { data: chatMessages },
      ] = await Promise.all([
        supabase.from("study_sessions").select("*").eq("user_id", user.id),
        supabase.from("tasks").select("*").eq("user_id", user.id),
        supabase.from("notes").select("*").eq("user_id", user.id),
        supabase.from("chat_messages").select("*").eq("user_id", user.id).eq("role", "user"),
      ]);

      // Calculate streak (consecutive days with study sessions)
      const sessionDates = (studySessions || [])
        .map((s) => new Date(s.started_at).toDateString())
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      let streak = 0;
      const today = new Date();
      for (let i = 0; i < sessionDates.length; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        if (sessionDates[i] === expectedDate.toDateString()) {
          streak++;
        } else {
          break;
        }
      }

      // Calculate night owl progress (study sessions after 10 PM)
      const nightSessions = (studySessions || []).filter((s) => {
        const hour = new Date(s.started_at).getHours();
        return hour >= 22 || hour < 4;
      });
      const nightMinutes = nightSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      const nightOwlProgress = Math.min(100, (nightMinutes / 120) * 100);

      // Calculate completed tasks
      const completedTasks = (tasks || []).filter((t) => t.status === "completed").length;

      // Calculate notes count
      const notesCount = (notes || []).length;

      // Calculate AI questions asked
      const questionsAsked = (chatMessages || []).length;

      // Calculate total XP (example: 50 per session + 25 per task + 10 per note)
      const totalXP =
        (studySessions?.length || 0) * 50 +
        completedTasks * 25 +
        notesCount * 10 +
        questionsAsked * 5;

      // Build achievements array with real data
      const achievementsData: AchievementData[] = [
        {
          id: 1,
          title: "First Steps",
          description: "Complete your first study session",
          icon: Star,
          unlocked: (studySessions?.length || 0) >= 1,
          progress: Math.min(100, (studySessions?.length || 0) >= 1 ? 100 : 0),
        },
        {
          id: 2,
          title: "Week Warrior",
          description: "Study 7 days in a row",
          icon: Flame,
          unlocked: streak >= 7,
          progress: Math.min(100, (streak / 7) * 100),
          current: streak,
          target: 7,
        },
        {
          id: 3,
          title: "Task Master",
          description: "Complete 10 tasks",
          icon: Target,
          unlocked: completedTasks >= 10,
          progress: Math.min(100, (completedTasks / 10) * 100),
          current: completedTasks,
          target: 10,
        },
        {
          id: 4,
          title: "Night Owl",
          description: "Study for 2 hours after 10 PM",
          icon: Clock,
          unlocked: nightMinutes >= 120,
          progress: nightOwlProgress,
          current: Math.floor(nightMinutes),
          target: 120,
        },
        {
          id: 5,
          title: "Bookworm",
          description: "Upload 20 notes",
          icon: BookOpen,
          unlocked: notesCount >= 20,
          progress: Math.min(100, (notesCount / 20) * 100),
          current: notesCount,
          target: 20,
        },
        {
          id: 6,
          title: "AI Explorer",
          description: "Ask the AI assistant 50 questions",
          icon: Brain,
          unlocked: questionsAsked >= 50,
          progress: Math.min(100, (questionsAsked / 50) * 100),
          current: questionsAsked,
          target: 50,
        },
      ];

      const unlockedCount = achievementsData.filter((a) => a.unlocked).length;

      setAchievements(achievementsData);
      setStats({
        totalXP,
        currentStreak: streak,
        unlockedCount,
        totalAchievements: achievementsData.length,
      });
    } catch (error) {
      console.error("Error fetching achievement progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsDisplay = [
    { label: "Total XP", value: stats.totalXP.toLocaleString(), icon: Star },
    { label: "Current Streak", value: `${stats.currentStreak} days`, icon: Flame },
    { label: "Achievements", value: `${stats.unlockedCount}/${stats.totalAchievements}`, icon: Trophy },
  ];

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-warning" />
            Achievements
          </h1>
          <p className="mt-1 text-muted-foreground">Track your progress and unlock rewards</p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {statsDisplay.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{loading ? "..." : stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <Card
              key={achievement.id}
              className={`transition-all ${
                achievement.unlocked
                  ? "border-warning/50 bg-warning/5"
                  : "opacity-75"
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div
                    className={`rounded-xl p-3 ${
                      achievement.unlocked ? "bg-warning text-warning-foreground" : "bg-muted"
                    }`}
                  >
                    {achievement.unlocked ? (
                      <achievement.icon className="h-6 w-6" />
                    ) : (
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  {achievement.unlocked && (
                    <Badge className="bg-warning text-warning-foreground">Unlocked!</Badge>
                  )}
                </div>
                <CardTitle className="mt-2">{achievement.title}</CardTitle>
                <CardDescription>{achievement.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={achievement.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(achievement.progress)}%</span>
                    {achievement.current !== undefined && achievement.target && (
                      <span>
                        {achievement.current} / {achievement.target}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coming Soon */}
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">More Achievements Coming Soon!</h3>
            <p className="text-muted-foreground max-w-md">
              Keep studying and completing tasks. New achievements and challenges will be added regularly.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
