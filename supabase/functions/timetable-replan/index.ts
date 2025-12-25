import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionChange {
  session_id: string;
  subject: string;
  original_date: string;
  new_date: string;
  reason: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to extract user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sessionId } = await req.json();

    // Create client with anon key first to verify user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("Replanning missed session:", sessionId, "for user:", userId);

    // Fetch the missed session
    const { data: missedSession, error: sessionError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !missedSession) {
      console.error("Error fetching session:", sessionError);
      throw new Error("Session not found");
    }

    // Fetch all upcoming sessions for the user to check load
    const { data: upcomingSessions, error: upcomingError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("started_at", new Date().toISOString())
      .order("started_at", { ascending: true });

    if (upcomingError) {
      console.error("Error fetching upcoming sessions:", upcomingError);
    }

    // Fetch user tasks with due dates
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("due_date", { ascending: true });

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
    }

    // Calculate daily load for next 7 days
    const dailyLoad: Map<string, number> = new Map();
    const maxDailyLoad = 4; // Maximum sessions per day

    (upcomingSessions || []).forEach((session: any) => {
      const dateKey = new Date(session.started_at).toISOString().split("T")[0];
      dailyLoad.set(dateKey, (dailyLoad.get(dateKey) || 0) + 1);
    });

    // Find the next available day with capacity
    const today = new Date();
    let targetDate: Date | null = null;
    let reason = "";

    for (let i = 1; i <= 14; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dateKey = checkDate.toISOString().split("T")[0];
      const currentLoad = dailyLoad.get(dateKey) || 0;

      if (currentLoad < maxDailyLoad) {
        targetDate = checkDate;
        if (currentLoad === 0) {
          reason = `Moved to ${checkDate.toLocaleDateString("en-US", { weekday: "long" })} as it has no scheduled sessions.`;
        } else if (currentLoad < 2) {
          reason = `Moved to ${checkDate.toLocaleDateString("en-US", { weekday: "long" })} which has light load (${currentLoad} sessions).`;
        } else {
          reason = `Moved to ${checkDate.toLocaleDateString("en-US", { weekday: "long" })} to balance weekly workload.`;
        }
        break;
      }
    }

    if (!targetDate) {
      targetDate = new Date(today);
      targetDate.setDate(today.getDate() + 1);
      reason = "All days are full. Added to tomorrow with overflow.";
    }

    // Set time to 10 AM
    targetDate.setHours(10, 0, 0, 0);

    const originalDate = new Date(missedSession.started_at);
    const change: SessionChange = {
      session_id: sessionId,
      subject: missedSession.subject || "Study Session",
      original_date: originalDate.toISOString(),
      new_date: targetDate.toISOString(),
      reason,
    };

    // Create a new session for the rescheduled time
    const { data: newSession, error: insertError } = await supabase
      .from("study_sessions")
      .insert({
        user_id: userId,
        subject: missedSession.subject,
        started_at: targetDate.toISOString(),
        duration_minutes: missedSession.duration_minutes || 45,
        notes: `Rescheduled from ${originalDate.toLocaleDateString()}`,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating new session:", insertError);
      throw insertError;
    }

    // Update the original session with a note
    await supabase
      .from("study_sessions")
      .update({
        notes: `Missed - rescheduled to ${targetDate.toLocaleDateString()}`,
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    console.log("Session replanned successfully");

    return new Response(
      JSON.stringify({
        success: true,
        original_session: missedSession,
        new_session: newSession,
        changes_log: [change],
        summary: `Your ${change.subject} session has been rescheduled. ${reason}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("timetable-replan error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
