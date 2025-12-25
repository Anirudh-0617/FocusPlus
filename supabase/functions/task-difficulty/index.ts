import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const languageNames: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { taskTitle, taskDescription, taskSubject, language = "en" } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const langName = languageNames[language] || "English";

    const systemPrompt = `You are an educational difficulty analyzer with access to real educational resources. Given a task or topic, analyze its difficulty level for students.

CRITICAL: You MUST respond ENTIRELY in ${langName} language. All text including reasoning_summary, reasoning_signals, source titles, and source descriptions MUST be in ${langName}. Do NOT mix languages.
    
You MUST respond using the suggest_difficulty function with the exact schema provided.

Consider these factors for difficulty assessment:
- Cognitive complexity required
- Prerequisite knowledge needed
- Abstract vs concrete concepts
- Time typically needed to master
- Common student struggles with this topic

CRITICAL - SOURCES REQUIREMENT:
You MUST provide 2-3 REAL educational resources with WORKING URLs. Use these trusted sources:
- Khan Academy: https://www.khanacademy.org/... (for various subjects)
- MIT OpenCourseWare: https://ocw.mit.edu/... (for university-level content)
- Coursera: https://www.coursera.org/... (for online courses)
- edX: https://www.edx.org/... (for online courses)
- Wikipedia: https://en.wikipedia.org/... (for general knowledge)
- BBC Bitesize: https://www.bbc.co.uk/bitesize/... (for school subjects)
- CK-12: https://www.ck12.org/... (for K-12 subjects)
- Paul's Online Math Notes: https://tutorial.math.lamar.edu/... (for math)
- Physics Classroom: https://www.physicsclassroom.com/... (for physics)

ACCURACY CALCULATION:
The accuracy/confidence score MUST be calculated based on:
1. Quality and specificity of reasoning (30% weight) - How detailed and accurate are the reasons?
2. Number and reliability of sources (40% weight) - Are sources from reputable educational platforms?
3. Alignment between difficulty score and reasoning (30% weight) - Does the reasoning support the difficulty level?

High accuracy (85-100%): Strong reasoning with 3 reliable sources from major educational platforms
Medium accuracy (60-84%): Good reasoning with 2 sources from known platforms
Low accuracy (below 60%): Limited reasoning or sources from less authoritative sources`;

    const userPrompt = `Analyze the difficulty of this study task:
Title: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ""}
${taskSubject ? `Subject: ${taskSubject}` : ""}

Provide a comprehensive difficulty analysis with:
1. Detailed reasoning explaining the difficulty level
2. 2-3 REAL educational resources with WORKING URLs (from Khan Academy, MIT OCW, Coursera, Wikipedia, etc.)
3. Calculate accuracy based on the quality of your reasoning and the reliability of sources

Remember to respond ENTIRELY in ${langName} language.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
              name: "suggest_difficulty",
              description: "Return a comprehensive difficulty analysis for the task with real educational resources",
              parameters: {
                type: "object",
                properties: {
                  difficulty_score: {
                    type: "number",
                    description: "Difficulty score from 0-100 based on cognitive complexity, prerequisites, and typical student performance",
                  },
                  difficulty_label: {
                    type: "string",
                    enum: ["Easy", "Medium", "Hard", "Expert"],
                    description: "Human-readable difficulty label (keep in English for consistency)",
                  },
                  reasoning_summary: {
                    type: "array",
                    items: { type: "string" },
                    description: `List of 4-6 detailed reasons explaining why this topic has this difficulty level. Each reason should be specific and evidence-based. MUST be in ${langName}.`,
                  },
                  reasoning_signals: {
                    type: "array",
                    items: { type: "string" },
                    description: `4-5 short 2-3 word tags describing key difficulty factors. MUST be in ${langName}.`,
                  },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: `Full resource title in ${langName}` },
                        description: { type: "string", description: `Brief description explaining how this resource relates to the topic. In ${langName}.` },
                        type: { type: "string", description: `Type: Online Course, Textbook, Tutorial, Encyclopedia, Video Series. In ${langName}.` },
                        url: { type: "string", description: "REAL working URL from trusted educational platforms (Khan Academy, MIT OCW, Coursera, Wikipedia, etc.)" },
                      },
                      required: ["title", "description", "type", "url"],
                    },
                    description: `2-3 educational resources with REAL URLs from trusted platforms. URLs must be valid and accessible.`,
                  },
                  confidence: {
                    type: "number",
                    description: "Accuracy score (0-100) calculated as: 30% reasoning quality + 40% source reliability + 30% alignment between score and reasoning. High accuracy = detailed reasoning with reliable sources.",
                  },
                  accuracy_breakdown: {
                    type: "object",
                    properties: {
                      reasoning_quality: { type: "number", description: "Score 0-100 for reasoning specificity and detail" },
                      source_reliability: { type: "number", description: "Score 0-100 for source trustworthiness (major platforms = high)" },
                      alignment_score: { type: "number", description: "Score 0-100 for how well reasoning supports the difficulty level" },
                    },
                    required: ["reasoning_quality", "source_reliability", "alignment_score"],
                    description: "Breakdown of how accuracy was calculated",
                  },
                  estimated_time_minutes: {
                    type: "number",
                    description: "Estimated time in minutes to complete this task based on difficulty and typical student pace",
                  },
                },
                required: [
                  "difficulty_score",
                  "difficulty_label",
                  "reasoning_summary",
                  "reasoning_signals",
                  "sources",
                  "confidence",
                  "accuracy_breakdown",
                  "estimated_time_minutes",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_difficulty" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "suggest_difficulty") {
      throw new Error("Invalid response from AI");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Ensure sources array exists with valid URLs
    if (!analysis.sources || !Array.isArray(analysis.sources)) {
      analysis.sources = [];
    }

    // Validate and filter sources to ensure they have URLs
    analysis.sources = analysis.sources.filter((source: any) =>
      source && source.url && typeof source.url === 'string' && source.url.startsWith('http')
    );

    // Ensure accuracy breakdown exists
    if (!analysis.accuracy_breakdown) {
      analysis.accuracy_breakdown = {
        reasoning_quality: 70,
        source_reliability: analysis.sources.length >= 2 ? 80 : 50,
        alignment_score: 75,
      };
      // Recalculate confidence if needed
      analysis.confidence = Math.round(
        analysis.accuracy_breakdown.reasoning_quality * 0.3 +
        analysis.accuracy_breakdown.source_reliability * 0.4 +
        analysis.accuracy_breakdown.alignment_score * 0.3
      );
    }

    console.log("Task difficulty analysis completed:", {
      title: taskTitle,
      difficulty: analysis.difficulty_label,
      confidence: analysis.confidence,
      sourcesCount: analysis.sources.length,
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Task difficulty analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
