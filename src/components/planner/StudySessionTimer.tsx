import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudySession } from "@/contexts/StudySessionContext";
import { Play, Pause, Square, Timer, Clock } from "lucide-react";
import { useState } from "react";

interface StudySessionTimerProps {
  defaultSubject?: string;
  onSessionComplete?: () => void;
}

export function StudySessionTimer({ defaultSubject, onSessionComplete }: StudySessionTimerProps) {
  const {
    isRunning,
    isPaused,
    elapsedSeconds,
    subject: currentSubject,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    formatTime,
  } = useStudySession();

  const [inputSubject, setInputSubject] = useState(defaultSubject || "Study Session");

  const handleStart = () => {
    startSession(inputSubject);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeSession();
    } else {
      pauseSession();
    }
  };

  const handleStop = async () => {
    await endSession();
    onSessionComplete?.();
  };

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
                value={inputSubject}
                onChange={(e) => setInputSubject(e.target.value)}
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
                {currentSubject}
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
                onClick={handlePauseResume}
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
