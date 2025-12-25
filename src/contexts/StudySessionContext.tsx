import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface StudySessionState {
    isRunning: boolean;
    isPaused: boolean;
    elapsedSeconds: number;
    subject: string;
    startTime: Date | null;
}

interface StudySessionContextType extends StudySessionState {
    startSession: (subject: string) => void;
    pauseSession: () => void;
    resumeSession: () => void;
    endSession: () => Promise<void>;
    formatTime: (totalSeconds: number) => string;
}

const StudySessionContext = createContext<StudySessionContextType | undefined>(undefined);

const STORAGE_KEY = "focusplus_study_session";

export function StudySessionProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [subject, setSubject] = useState("Study Session");
    const [startTime, setStartTime] = useState<Date | null>(null);

    // Load session from localStorage on mount
    useEffect(() => {
        const savedSession = localStorage.getItem(STORAGE_KEY);
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                const savedStartTime = new Date(parsed.startTime);
                const now = new Date();

                // Calculate elapsed time based on saved start time
                const calculatedElapsed = Math.floor((now.getTime() - savedStartTime.getTime()) / 1000);

                setIsRunning(parsed.isRunning);
                setIsPaused(parsed.isPaused);
                setElapsedSeconds(calculatedElapsed);
                setSubject(parsed.subject);
                setStartTime(savedStartTime);
            } catch (error) {
                console.error("Error loading session from storage:", error);
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    // Save session to localStorage whenever state changes
    useEffect(() => {
        if (isRunning && startTime) {
            const sessionData = {
                isRunning,
                isPaused,
                subject,
                startTime: startTime.toISOString(),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [isRunning, isPaused, subject, startTime]);

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

    // Auto-save on page unload
    useEffect(() => {
        const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
            if (isRunning && user && startTime) {
                // Show warning
                e.preventDefault();
                e.returnValue = "You have an active study session. Are you sure you want to leave?";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isRunning, user, startTime]);

    const formatTime = useCallback((totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, []);

    const startSession = useCallback((sessionSubject: string) => {
        setIsRunning(true);
        setIsPaused(false);
        setStartTime(new Date());
        setElapsedSeconds(0);
        setSubject(sessionSubject);
        toast({
            title: "Session Started",
            description: `Started studying: ${sessionSubject}`,
        });
    }, [toast]);

    const pauseSession = useCallback(() => {
        setIsPaused(true);
    }, []);

    const resumeSession = useCallback(() => {
        setIsPaused(false);
    }, []);

    const endSession = useCallback(async () => {
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
            setSubject("Study Session");
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("Error saving session:", error);
            toast({
                title: "Error",
                description: "Failed to save session",
                variant: "destructive",
            });
        }
    }, [user, startTime, elapsedSeconds, subject, toast, formatTime]);

    const value: StudySessionContextType = {
        isRunning,
        isPaused,
        elapsedSeconds,
        subject,
        startTime,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        formatTime,
    };

    return (
        <StudySessionContext.Provider value={value}>
            {children}
        </StudySessionContext.Provider>
    );
}

export function useStudySession() {
    const context = useContext(StudySessionContext);
    if (context === undefined) {
        throw new Error("useStudySession must be used within a StudySessionProvider");
    }
    return context;
}
