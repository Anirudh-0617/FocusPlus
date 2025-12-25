import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("Generating revision plan for authenticated user:", userId);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Fetch all user data - RLS will restrict to user's own data
    const [tasksResult, sessionsResult, reviewsResult] = await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("study_sessions").select("*"),
      supabase.from("task_reviews").select("*, tasks!inner(subject, title)"),
    ]);

    const tasks = tasksResult.data || [];
    const sessions = sessionsResult.data || [];
    const reviews = reviewsResult.data || [];

    // Group data by subject/topic
    const topicData: Map<string, {
      totalTasks: number;
      completedTasks: number;
      pendingTasks: string[];
      totalSessions: number;
      missedSessions: number;
      totalStudyMinutes: number;
      avgDifficultyRating: number;
      difficultyCount: number;
      highDifficultyTasks: string[];
    }> = new Map();

    // Process tasks
    tasks.forEach((task: any) => {
      const topic = task.subject || "General";
      if (!topicData.has(topic)) {
        topicData.set(topic, {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: [],
          totalSessions: 0,
          missedSessions: 0,
          totalStudyMinutes: 0,
          avgDifficultyRating: 0,
          difficultyCount: 0,
          highDifficultyTasks: [],
        });
      }
      const data = topicData.get(topic)!;
      data.totalTasks++;
      if (task.status === "completed") {
        data.completedTasks++;
      } else {
        data.pendingTasks.push(task.title);
      }
    });

    // Process sessions
    sessions.forEach((session: any) => {
      const topic = session.subject || "General";
      if (!topicData.has(topic)) {
        topicData.set(topic, {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: [],
          totalSessions: 0,
          missedSessions: 0,
          totalStudyMinutes: 0,
          avgDifficultyRating: 0,
          difficultyCount: 0,
          highDifficultyTasks: [],
        });
      }
      const data = topicData.get(topic)!;
      data.totalSessions++;
      data.totalStudyMinutes += session.duration_minutes || 0;
      if (!session.ended_at || session.duration_minutes < 10) {
        data.missedSessions++;
      }
    });

    // Process reviews
    reviews.forEach((review: any) => {
      const topic = review.tasks?.subject || "General";
      if (topicData.has(topic)) {
        const data = topicData.get(topic)!;
        data.avgDifficultyRating =
          (data.avgDifficultyRating * data.difficultyCount + review.difficulty_rating) /
          (data.difficultyCount + 1);
        data.difficultyCount++;
        if (review.difficulty_rating >= 7) {
          data.highDifficultyTasks.push(review.tasks?.title || "Unknown task");
        }
      }
    });

    // Build topic summaries for AI
    const topicSummaries: any[] = [];
    topicData.forEach((data, topic) => {
      const missedRatio = data.totalSessions > 0 ? data.missedSessions / data.totalSessions : 0;
      const completionRate = data.totalTasks > 0 ? data.completedTasks / data.totalTasks : 1;
      const difficultyScore = data.difficultyCount > 0 ? data.avgDifficultyRating / 10 : 0;

      const weakness_score = Math.round(
        (missedRatio * 0.4 + difficultyScore * 0.3 + (1 - completionRate) * 0.2 + difficultyScore * 0.1) * 100
      ) / 100;

      topicSummaries.push({
        topic,
        weakness_score,
        total_tasks: data.totalTasks,
        completed_tasks: data.completedTasks,
        pending_tasks: data.pendingTasks.slice(0, 3),
        total_sessions: data.totalSessions,
        missed_sessions: data.missedSessions,
        total_study_minutes: data.totalStudyMinutes,
        avg_difficulty: Math.round(data.avgDifficultyRating * 10) / 10,
        high_difficulty_tasks: data.highDifficultyTasks.slice(0, 2),
      });
    });

    // Sort by weakness score
    topicSummaries.sort((a, b) => b.weakness_score - a.weakness_score);
    const weakTopics = topicSummaries.slice(0, 5);

    if (weakTopics.length === 0) {
      return new Response(
        JSON.stringify({
          topics: [],
          reasoning_summary: ["No study data found. Start adding tasks and study sessions to get personalized revision recommendations."],
          ai_analysis: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call AI for dynamic analysis
    console.log("Calling OpenAI for revision analysis...");

    const systemPrompt = `You are a study coach AI. Analyze weak topics and provide personalized revision recommendations. Be specific and actionable.`;

    const userPrompt = `Analyze these weak study topics and provide revision recommendations:

WEAK TOPICS DATA:
${JSON.stringify(weakTopics, null, 2)}

For each topic, provide:
1. A specific reason why it needs revision (based on the actual data)
2. A personalized recommendation
3. The recommended number of revision sessions (1-5)

Be specific - reference actual numbers from the data like missed sessions, incomplete tasks, difficulty ratings.`;

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
              name: "analyze_weak_topics",
              description: "Provide revision analysis for weak topics",
              parameters: {
                type: "object",
                properties: {
                  topic_analyses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string" },
                        weakness_reason: { type: "string", description: "Specific reason based on data why this topic is weak" },
                        recommendation: { type: "string", description: "Personalized study recommendation" },
                        recommended_sessions: { type: "number", description: "Number of revision sessions needed (1-5)" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["topic", "weakness_reason", "recommendation", "recommended_sessions", "priority"],
                    },
                  },
                  overall_advice: { type: "string", description: "General revision strategy advice" },
                },
                required: ["topic_analyses", "overall_advice"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_weak_topics" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", aiResponse.status);
      // Fallback to basic analysis
      return new Response(
        JSON.stringify({
          topics: weakTopics.map((t) => ({
            topic: t.topic,
            weakness_score: t.weakness_score,
            missed_sessions: t.missed_sessions,
            low_xp_tasks: t.total_tasks - t.completed_tasks,
            recommended_sessions: Math.max(1, Math.ceil(t.weakness_score * 5)),
            weakness_reason: `${t.missed_sessions} missed sessions and ${t.total_tasks - t.completed_tasks} incomplete tasks.`,
            recommendation: `Focus on completing pending tasks and scheduling regular study sessions.`,
            priority: t.weakness_score >= 0.7 ? "high" : t.weakness_score >= 0.4 ? "medium" : "low",
          })),
          reasoning_summary: weakTopics.map((t) =>
            `${t.topic}: ${Math.round(t.weakness_score * 100)}% weakness`
          ),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    let aiAnalysis: { topic_analyses?: any[]; overall_advice?: string } | null = null;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        aiAnalysis = JSON.parse(toolCall.function.arguments);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
    }

    // Merge AI analysis with topic data
    const enrichedTopics = weakTopics.map((t) => {
      const aiTopic = aiAnalysis?.topic_analyses?.find(
        (a: any) => a.topic.toLowerCase() === t.topic.toLowerCase()
      );

      return {
        topic: t.topic,
        weakness_score: t.weakness_score,
        missed_sessions: t.missed_sessions,
        low_xp_tasks: t.total_tasks - t.completed_tasks,
        total_study_minutes: t.total_study_minutes,
        avg_difficulty: t.avg_difficulty,
        recommended_sessions: aiTopic?.recommended_sessions || Math.max(1, Math.ceil(t.weakness_score * 5)),
        weakness_reason: aiTopic?.weakness_reason || `${t.missed_sessions} missed sessions and ${t.total_tasks - t.completed_tasks} incomplete tasks need attention.`,
        recommendation: aiTopic?.recommendation || "Schedule regular revision sessions to improve mastery.",
        priority: aiTopic?.priority || (t.weakness_score >= 0.7 ? "high" : t.weakness_score >= 0.4 ? "medium" : "low"),
      };
    });

    const reasoning_summary = enrichedTopics.map((t) =>
      `${t.topic}: ${t.weakness_reason}`
    );

    console.log("Revision plan generated successfully with AI analysis");

    return new Response(
      JSON.stringify({
        topics: enrichedTopics,
        reasoning_summary,
        overall_advice: aiAnalysis?.overall_advice || "Focus on your weakest topics first and maintain consistent study sessions.",
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("revision-plan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
