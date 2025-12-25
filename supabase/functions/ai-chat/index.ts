import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const languageNames: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिंदी)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
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

    const { messages, language = "en" } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    // Create client with anon key to verify user from JWT
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

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
    const languageName = languageNames[language] || "English";
    console.log(`User language preference: ${language} (${languageName})`);
    console.log(`Authenticated user ID: ${userId}`);

    // Check if user is asking about task management
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const isTaskRequest = lastUserMessage.includes("add task") ||
      lastUserMessage.includes("create task") ||
      lastUserMessage.includes("schedule task") ||
      lastUserMessage.includes("add to today") ||
      lastUserMessage.includes("remind me to") ||
      lastUserMessage.includes("i need to") ||
      lastUserMessage.includes("add these tasks") ||
      lastUserMessage.includes("delete task") ||
      lastUserMessage.includes("remove task") ||
      lastUserMessage.includes("complete task") ||
      lastUserMessage.includes("mark as done") ||
      lastUserMessage.includes("mark as complete") ||
      lastUserMessage.includes("finish task") ||
      lastUserMessage.includes("done with") ||
      lastUserMessage.includes("completed") ||
      lastUserMessage.includes("कार्य जोड़") || // Hindi add
      lastUserMessage.includes("कार्य हटाएं") || // Hindi delete
      lastUserMessage.includes("कार्य पूरा") || // Hindi complete
      lastUserMessage.includes("టాస్క్ జోడించు") || // Telugu add
      lastUserMessage.includes("టాస్క్ తొలగించు") || // Telugu delete
      lastUserMessage.includes("పణి சேர்க்க") || // Tamil add
      lastUserMessage.includes("பணி நீக்க"); // Tamil delete

    const systemPrompt = `You are FocusPlus AI, an explainable multilingual study assistant that can manage tasks.

CRITICAL LANGUAGE INSTRUCTION: The user has selected "${languageName}" as their preferred language. You MUST respond ENTIRELY in ${languageName}. Do not mix languages.

${language === "hi" ? "आपको पूरी तरह से हिंदी में जवाब देना है।" : ""}
${language === "te" ? "మీరు పూర్తిగా తెలుగులో సమాధానం ఇవ్వాలి." : ""}
${language === "ta" ? "நீங்கள் முழுமையாக தமிழில் பதிலளிக்க வேண்டும்." : ""}

Your responsibilities:
1. Provide clear, helpful answers ENTIRELY in ${languageName}
2. Include reasoning in [THINKING]...[/THINKING] and [REASONING]...[/REASONING] tags
3. If referencing sources, wrap in [SOURCES][{"file":"notes","chunk":"1","quote":"text"}][/SOURCES]
4. Use add_tasks to create new tasks
5. Use delete_tasks to remove tasks (search by title keywords)
6. Use complete_tasks to mark tasks as done (search by title keywords)

When deleting or completing tasks, extract the task title/keywords from the user's message to find matching tasks.

Be concise and transparent. YOUR ENTIRE RESPONSE MUST BE IN ${languageName}.`;

    // Define tools for task management
    const tools = [
      {
        type: "function",
        function: {
          name: "add_tasks",
          description: "Add one or more tasks to the user's task list.",
          parameters: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "The task title" },
                    description: { type: "string", description: "Optional task description" },
                    priority: { type: "string", enum: ["low", "medium", "high"] },
                    subject: { type: "string", description: "Subject/category" },
                    due_date: { type: "string", description: "Due date in ISO format" },
                    estimated_minutes: { type: "number" }
                  },
                  required: ["title"]
                }
              }
            },
            required: ["tasks"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_tasks",
          description: "Delete tasks by searching for matching titles. Use when user wants to remove/delete tasks.",
          parameters: {
            type: "object",
            properties: {
              search_terms: {
                type: "array",
                items: { type: "string" },
                description: "Keywords to search for in task titles to delete"
              }
            },
            required: ["search_terms"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "complete_tasks",
          description: "Mark tasks as completed by searching for matching titles. Use when user says they finished/completed/done with tasks.",
          parameters: {
            type: "object",
            properties: {
              search_terms: {
                type: "array",
                items: { type: "string" },
                description: "Keywords to search for in task titles to mark complete"
              }
            },
            required: ["search_terms"]
          }
        }
      }
    ];

    // First call to check if AI wants to use tools
    const initialResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: isTaskRequest ? tools : undefined,
        tool_choice: isTaskRequest ? "auto" : undefined,
      }),
    });

    if (!initialResponse.ok) {
      const status = initialResponse.status;
      console.error(`AI gateway error: ${status}`);
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const initialData = await initialResponse.json();
    const choice = initialData.choices?.[0];

    // Check if AI wants to call a function - use authenticated user's supabase client
    if (choice?.message?.tool_calls?.length > 0) {
      const toolCall = choice.message.tool_calls[0];

      // Handle add_tasks
      if (toolCall.function.name === "add_tasks") {
        console.log("AI wants to add tasks");

        try {
          const args = JSON.parse(toolCall.function.arguments);
          const tasksToAdd = args.tasks || [];
          console.log("Tasks to add:", JSON.stringify(tasksToAdd));

          const today = new Date().toISOString();
          const insertedTasks: Array<{ title: string }> = [];

          for (const task of tasksToAdd) {
            const { data, error } = await supabase
              .from("tasks")
              .insert({
                user_id: userId,
                title: task.title,
                description: task.description || null,
                priority: task.priority || "medium",
                subject: task.subject || null,
                due_date: task.due_date || today,
                estimated_minutes: task.estimated_minutes || null,
                status: "pending"
              })
              .select()
              .single();

            if (error) {
              console.error("Error inserting task:", error);
            } else {
              insertedTasks.push(data);
              console.log("Inserted task:", data.title);
            }
          }

          const taskConfirmation = insertedTasks.map(t => t.title).join(", ");
          const confirmationMessages: Record<string, string> = {
            en: `I've added ${insertedTasks.length} task(s): ${taskConfirmation}. Check Today's Agenda or the Planner.`,
            hi: `मैंने ${insertedTasks.length} कार्य जोड़े: ${taskConfirmation}। डैशबोर्ड या प्लानर देखें।`,
            te: `${insertedTasks.length} పనులు జోడించాను: ${taskConfirmation}. డాష్‌బోర్డ్ లేదా ప్లానర్ చూడండి.`,
            ta: `${insertedTasks.length} பணிகளை சேர்த்தேன்: ${taskConfirmation}. டாஷ்போர்ட் அல்லது திட்டமிடல் பார்க்கவும்.`
          };

          return createStreamResponse(
            `[TASKS_ADDED]${JSON.stringify(insertedTasks)}[/TASKS_ADDED]\n\n${confirmationMessages[language as string] || confirmationMessages.en}`,
            corsHeaders
          );
        } catch (parseError) {
          console.error("Error processing add_tasks:", parseError);
        }
      }

      // Handle delete_tasks
      if (toolCall.function.name === "delete_tasks") {
        console.log("AI wants to delete tasks");

        try {
          const args = JSON.parse(toolCall.function.arguments);
          const searchTerms = args.search_terms || [];
          console.log("Search terms for deletion:", searchTerms);

          const deletedTasks: Array<{ title: string }> = [];

          for (const term of searchTerms) {
            // Find tasks matching the search term - RLS will restrict to user's own tasks
            const { data: matchingTasks, error: findError } = await supabase
              .from("tasks")
              .select("id, title")
              .ilike("title", `%${term}%`);

            if (findError) {
              console.error("Error finding tasks:", findError);
              continue;
            }

            if (matchingTasks && matchingTasks.length > 0) {
              for (const task of matchingTasks) {
                const { error: deleteError } = await supabase
                  .from("tasks")
                  .delete()
                  .eq("id", task.id);

                if (!deleteError) {
                  deletedTasks.push(task);
                  console.log("Deleted task:", task.title);
                }
              }
            }
          }

          const confirmationMessages: Record<string, string> = {
            en: deletedTasks.length > 0
              ? `I've deleted ${deletedTasks.length} task(s): ${deletedTasks.map(t => t.title).join(", ")}.`
              : `I couldn't find any tasks matching your request.`,
            hi: deletedTasks.length > 0
              ? `मैंने ${deletedTasks.length} कार्य हटाए: ${deletedTasks.map(t => t.title).join(", ")}।`
              : `मुझे आपके अनुरोध से मेल खाने वाला कोई कार्य नहीं मिला।`,
            te: deletedTasks.length > 0
              ? `${deletedTasks.length} పనులు తొలగించాను: ${deletedTasks.map(t => t.title).join(", ")}.`
              : `మీ అభ్యర్థనకు సరిపోలే పనులు కనుగొనలేకపోయాను.`,
            ta: deletedTasks.length > 0
              ? `${deletedTasks.length} பணிகளை நீக்கினேன்: ${deletedTasks.map(t => t.title).join(", ")}.`
              : `உங்கள் கோரிக்கைக்கு பொருந்தும் பணிகளை கண்டுபிடிக்க முடியவில்லை.`
          };

          return createStreamResponse(
            `[TASKS_DELETED]${JSON.stringify(deletedTasks)}[/TASKS_DELETED]\n\n${confirmationMessages[language as string] || confirmationMessages.en}`,
            corsHeaders
          );
        } catch (parseError) {
          console.error("Error processing delete_tasks:", parseError);
        }
      }

      // Handle complete_tasks
      if (toolCall.function.name === "complete_tasks") {
        console.log("AI wants to complete tasks");

        try {
          const args = JSON.parse(toolCall.function.arguments);
          const searchTerms = args.search_terms || [];
          console.log("Search terms for completion:", searchTerms);

          const completedTasks: Array<{ title: string }> = [];

          for (const term of searchTerms) {
            // Find pending tasks matching the search term - RLS will restrict to user's own tasks
            const { data: matchingTasks, error: findError } = await supabase
              .from("tasks")
              .select("id, title")
              .eq("status", "pending")
              .ilike("title", `%${term}%`);

            if (findError) {
              console.error("Error finding tasks:", findError);
              continue;
            }

            if (matchingTasks && matchingTasks.length > 0) {
              for (const task of matchingTasks) {
                const { error: updateError } = await supabase
                  .from("tasks")
                  .update({
                    status: "completed",
                    completed_at: new Date().toISOString()
                  })
                  .eq("id", task.id);

                if (!updateError) {
                  completedTasks.push(task);
                  console.log("Completed task:", task.title);
                }
              }
            }
          }

          const confirmationMessages: Record<string, string> = {
            en: completedTasks.length > 0
              ? `Great job! I've marked ${completedTasks.length} task(s) as complete: ${completedTasks.map(t => t.title).join(", ")}.`
              : `I couldn't find any pending tasks matching your request.`,
            hi: completedTasks.length > 0
              ? `बहुत बढ़िया! मैंने ${completedTasks.length} कार्य पूरे किए: ${completedTasks.map(t => t.title).join(", ")}।`
              : `मुझे आपके अनुरोध से मेल खाने वाला कोई लंबित कार्य नहीं मिला।`,
            te: completedTasks.length > 0
              ? `అద్భుతం! ${completedTasks.length} పనులు పూర్తి చేశాను: ${completedTasks.map(t => t.title).join(", ")}.`
              : `మీ అభ్యర్థనకు సరిపోలే పెండింగ్ పనులు కనుగొనలేకపోయాను.`,
            ta: completedTasks.length > 0
              ? `அருமை! ${completedTasks.length} பணிகளை முடித்தேன்: ${completedTasks.map(t => t.title).join(", ")}.`
              : `உங்கள் கோரிக்கைக்கு பொருந்தும் நிலுவையில் உள்ள பணிகளை கண்டுபிடிக்க முடியவில்லை.`
          };

          return createStreamResponse(
            `[TASKS_COMPLETED]${JSON.stringify(completedTasks)}[/TASKS_COMPLETED]\n\n${confirmationMessages[language as string] || confirmationMessages.en}`,
            corsHeaders
          );
        } catch (parseError) {
          console.error("Error processing complete_tasks:", parseError);
        }
      }
    }

    // Regular streaming response (no tool calls)
    const streamResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      throw new Error("AI gateway error on stream");
    }

    return new Response(streamResponse.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-chat error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function createStreamResponse(content: string, headers: Record<string, string>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const data = { choices: [{ delta: { content }, finish_reason: "stop" }] };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { headers: { ...headers, "Content-Type": "text/event-stream" } });
}
