import { useStudySession } from "@/contexts/StudySessionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Timer, Play, Pause, Square, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ActiveSessionIndicator() {
    const {
        isRunning,
        isPaused,
        elapsedSeconds,
        subject,
        pauseSession,
        resumeSession,
        endSession,
        formatTime,
    } = useStudySession();

    const [isExpanded, setIsExpanded] = useState(false);

    if (!isRunning) return null;

    return (
        <div className="fixed top-4 right-4 z-50">
            <Card className={cn(
                "border-primary/40 bg-background/95 backdrop-blur-sm shadow-lg transition-all duration-200",
                isExpanded ? "w-80" : "w-auto"
            )}>
                <CardContent className="p-3">
                    {/* Compact View */}
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center gap-2 cursor-pointer flex-1"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <div className={cn(
                                "flex items-center justify-center h-8 w-8 rounded-full",
                                isPaused ? "bg-warning/20" : "bg-primary/20"
                            )}>
                                <Timer className={cn(
                                    "h-4 w-4",
                                    isPaused ? "text-warning" : "text-primary animate-pulse"
                                )} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-mono font-bold text-primary">
                                        {formatTime(elapsedSeconds)}
                                    </span>
                                    {isPaused && (
                                        <span className="px-1.5 py-0.5 rounded bg-warning/20 text-warning text-xs font-medium">
                                            PAUSED
                                        </span>
                                    )}
                                </div>
                                {!isExpanded && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        {subject}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Quick Controls (always visible) */}
                        {!isExpanded && (
                            <div className="flex items-center gap-1">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isPaused) {
                                            resumeSession();
                                        } else {
                                            pauseSession();
                                        }
                                    }}
                                >
                                    {isPaused ? (
                                        <Play className="h-3.5 w-3.5" />
                                    ) : (
                                        <Pause className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Expanded View */}
                    {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border space-y-3">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Subject</p>
                                <p className="text-sm font-medium">{subject}</p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 gap-2"
                                    onClick={() => {
                                        if (isPaused) {
                                            resumeSession();
                                        } else {
                                            pauseSession();
                                        }
                                    }}
                                >
                                    {isPaused ? (
                                        <>
                                            <Play className="h-3.5 w-3.5" />
                                            Resume
                                        </>
                                    ) : (
                                        <>
                                            <Pause className="h-3.5 w-3.5" />
                                            Pause
                                        </>
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="flex-1 gap-2"
                                    onClick={async () => {
                                        await endSession();
                                        setIsExpanded(false);
                                    }}
                                >
                                    <Square className="h-3.5 w-3.5" />
                                    End
                                </Button>
                            </div>

                            <Button
                                size="sm"
                                variant="ghost"
                                className="w-full gap-2"
                                onClick={() => setIsExpanded(false)}
                            >
                                <X className="h-3.5 w-3.5" />
                                Collapse
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
