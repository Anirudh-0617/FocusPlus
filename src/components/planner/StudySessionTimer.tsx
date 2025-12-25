import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Square, Timer, Clock } from "lucide-react";

interface StudySessionTimerProps {
  defaultSubject?: string;
  onSessionComplete?: () => void;
}

export function StudySessionTimer({ defaultSubject, onSessionComplete }: StudySessionTimerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [subject, setSubject] = useState(defaultSubject || "Study Session");
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    setStartTime(new Date());
    setElapsedSeconds(0);
    toast({
      title: "Session Started",
      description: `Started studying: ${subject}`,
    });
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = useCallback(async () => {
    if (!user || !startTime) return;

    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const endedAt = new Date();

    try {
      const { error } = await supabase.from("study_sessions").insert({
        user_id: user.id,
        subject: subject,
        started_at: startTime.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes,
      });

      if (error) throw error;

      toast({
        title: "Session Completed!",
        description: `${subject} - ${formatTime(elapsedSeconds)} recorded.`,
      });

      // Reset state
      setIsRunning(false);
      setIsPaused(false);
      setElapsedSeconds(0);
      setStartTime(null);
      onSessionComplete?.();
    } catch (error) {
      console.error("Error saving session:", error);
      toast({
        title: "Error",
        description: "Failed to save session",
        variant: "destructive",
      });
    }
  }, [user, startTime, elapsedSeconds, subject, toast, onSessionComplete]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-5 w-5 text-primary" />
          Study Session
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isRunning ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject / Topic</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What are you studying?"
              />
            </div>
            <Button onClick={handleStart} className="w-full gap-2">
              <Play className="h-4 w-4" />
              Start Session
            </Button>
          </>
        ) : (
          <>
            {/* Timer Display */}
            <div className="text-center py-4">
              <div className="text-4xl font-mono font-bold text-primary tracking-wider">
                {formatTime(elapsedSeconds)}
              </div>
              <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {subject}
              </p>
              {isPaused && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded bg-warning/20 text-warning text-xs">
                  PAUSED
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                onClick={handlePause}
                variant="outline"
                className="flex-1 gap-2"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                onClick={handleStop}
                variant="destructive"
                className="flex-1 gap-2"
              >
                <Square className="h-4 w-4" />
                End Session
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
