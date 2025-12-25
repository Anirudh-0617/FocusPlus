import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Get the authorization header to extract user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.replace("Bearer", "").trim();
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { applyChanges, proposedChanges } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Create client with anon key to verify user from JWT
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("Authenticated user ID:", userId);

    // If applying changes, update task due dates
    if (applyChanges && proposedChanges && Array.isArray(proposedChanges)) {
      console.log("Applying schedule changes:", proposedChanges.length);

      for (const change of proposedChanges) {
        if (change.task_id && change.new_due_date) {
          // RLS will ensure user can only update their own tasks
          const { error } = await supabase
            .from("tasks")
            .update({ due_date: change.new_due_date })
            .eq("id", change.task_id);

          if (error) {
            console.error("Error updating task:", change.task_id, error);
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Applied ${proposedChanges.length} schedule changes.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch user's tasks and study sessions - RLS will restrict to user's own data
    const [tasksResult, sessionsResult, profileResult] = await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("study_sessions").select("*").order("started_at", { ascending: false }).limit(20),
      supabase.from("profiles").select("daily_focus_hours, study_goal").maybeSingle(),
    ]);

    const tasks = tasksResult.data || [];
    const studySessions = sessionsResult.data || [];
    const profile = profileResult.data;

    const pendingTasks = tasks.filter(t => t.status === "pending");
    const completedTasks = tasks.filter(t => t.status === "completed");

    // Group tasks by date
    const tasksByDate: Record<string, typeof tasks> = {};
    pendingTasks.forEach(task => {
      const dateKey = task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : "no_date";
      if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
      tasksByDate[dateKey].push(task);
    });

    // Calculate study patterns
    const sessionsByHour: Record<number, number> = {};
    studySessions.forEach(s => {
      const hour = new Date(s.started_at).getHours();
      sessionsByHour[hour] = (sessionsByHour[hour] || 0) + s.duration_minutes;
    });

    const peakHours = Object.entries(sessionsByHour)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Build detailed task list for AI
    const taskListForAI = pendingTasks.map(t => ({
      id: t.id,
      title: t.title,
      subject: t.subject || "General",
      priority: t.priority || "medium",
      due_date: t.due_date,
      estimated_minutes: t.estimated_minutes || 45,
    }));

    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = `You are an AI study schedule optimizer. Your job is to reschedule tasks to help the student complete them more easily. Analyze the workload per day and redistribute tasks to avoid overwhelming days. Always move tasks to realistic dates and explain each change.`;

    const userPrompt = `Analyze and reschedule this student's tasks:

TODAY'S DATE: ${today}

PENDING TASKS:
${JSON.stringify(taskListForAI, null, 2)}

TASKS PER DAY:
${Object.entries(tasksByDate).map(([date, t]) => `${date}: ${t.length} tasks (${t.map(task => task.title).join(", ")})`).join("\n")}

STUDY PATTERNS:
- Peak productivity hours: ${peakHours.length > 0 ? peakHours.map(h => `${h}:00`).join(", ") : "Evening (18:00)"}
- Daily focus capacity: ${profile?.daily_focus_hours || 4} hours
- Recommended max tasks per day: 3-4

INSTRUCTIONS:
1. Identify overloaded days (more than 3 tasks)
2. Identify tasks with passed due dates that need rescheduling
3. Redistribute tasks to balance the workload
4. Keep high-priority tasks closer to their original dates
5. For each moved task, provide a clear reason
6. Tasks without dates should be scheduled based on priority`;

    console.log("Calling OpenAI for schedule optimization...");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "reschedule_tasks",
              description: "Propose task schedule changes to balance workload",
              parameters: {
                type: "object",
                properties: {
                  schedule_changes: {
                    type: "array",
                    description: "List of proposed task date changes",
                    items: {
                      type: "object",
                      properties: {
                        task_id: { type: "string", description: "The task ID to reschedule" },
                        task_title: { type: "string", description: "Task title for display" },
                        original_date: { type: "string", description: "Original due date (ISO format or 'Not set')" },
                        new_due_date: { type: "string", description: "New proposed due date (ISO 8601 format)" },
                        reason: { type: "string", description: "Human-readable explanation for this change" },
                      },
                      required: ["task_id", "task_title", "original_date", "new_due_date", "reason"],
                    },
                  },
                  daily_summary: {
                    type: "array",
                    description: "Summary of tasks per day after optimization",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        task_count: { type: "number" },
                        tasks: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["suggestion", "warning", "improvement"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        reasoning: { type: "string" },
                      },
                    },
                  },
                  overall_summary: { type: "string", description: "Brief summary of all changes made" },
                },
                required: ["schedule_changes", "overall_summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "reschedule_tasks" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received:", JSON.stringify(aiData).slice(0, 500));

    let optimization;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        optimization = JSON.parse(toolCall.function.arguments);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
    }

    // Fallback if AI parsing fails
    if (!optimization || !optimization.schedule_changes) {
      // Smart fallback: distribute overloaded days
      const changes: any[] = [];
      const overloadedDays = Object.entries(tasksByDate).filter(([_, t]) => t.length > 3);

      overloadedDays.forEach(([date, dayTasks]) => {
        const excessTasks = dayTasks.slice(3);
        excessTasks.forEach((task, i) => {
          const newDate = new Date(date);
          newDate.setDate(newDate.getDate() + i + 1);
          changes.push({
            task_id: task.id,
            task_title: task.title,
            original_date: date,
            new_due_date: newDate.toISOString(),
            reason: `Moved to balance workload. Original day had ${dayTasks.length} tasks.`,
          });
        });
      });

      optimization = {
        schedule_changes: changes,
        overall_summary: changes.length > 0
          ? `Redistributed ${changes.length} tasks from overloaded days.`
          : "Your schedule looks balanced! No changes needed.",
        insights: [],
      };
    }

    return new Response(JSON.stringify({
      optimization,
      sources: [
        { type: "tasks", count: pendingTasks.length, description: "Your pending tasks" },
        { type: "sessions", count: studySessions.length, description: "Study session history" },
      ],
      generated_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("timetable-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
