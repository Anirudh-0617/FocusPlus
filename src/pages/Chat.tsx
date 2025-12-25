import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain,
  Send,
  Loader2,
  ChevronDown,
  Lightbulb,
  FileText,
  CheckCircle,
  Sparkles,
  AlertCircle,
  Search,
  Trash2,
  ThumbsDown,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string | null;
  sources?: { file: string; chunk: string; quote: string }[] | null;
  thinking_steps?: string[] | null;
  created_at: string;
  isFallback?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function Chat() {
  const { user, session } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearConversation = () => {
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Save user message
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        user_id: user!.id,
        role: "user",
        content: userMessage.content,
      });

      // Get AI response with streaming
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })).concat([
            { role: "user", content: userMessage.content },
          ]),
          conversationId,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      setIsFallbackMode(false);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let reasoning = "";
      let sources: Message["sources"] = [];
      let thinkingSteps: string[] = [];

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        reasoning: null,
        sources: null,
        thinking_steps: null,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: assistantContent }
                      : m
                  )
                );
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      }

      // Parse explainable AI metadata from response
      const metaMatch = assistantContent.match(/\[REASONING\](.*?)\[\/REASONING\]/s);
      const sourcesMatch = assistantContent.match(/\[SOURCES\](.*?)\[\/SOURCES\]/s);
      const stepsMatch = assistantContent.match(/\[THINKING\](.*?)\[\/THINKING\]/s);

      if (metaMatch) {
        reasoning = metaMatch[1].trim();
        assistantContent = assistantContent.replace(/\[REASONING\].*?\[\/REASONING\]/s, "").trim();
      }

      if (sourcesMatch) {
        try {
          sources = JSON.parse(sourcesMatch[1].trim());
        } catch {}
        assistantContent = assistantContent.replace(/\[SOURCES\].*?\[\/SOURCES\]/s, "").trim();
      }

      if (stepsMatch) {
        thinkingSteps = stepsMatch[1].split("\n").filter(Boolean).map(s => s.trim());
        assistantContent = assistantContent.replace(/\[THINKING\].*?\[\/THINKING\]/s, "").trim();
      }

      // Update final message with metadata
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? {
                ...m,
                content: assistantContent,
                reasoning: reasoning || null,
                sources: sources?.length ? sources : null,
                thinking_steps: thinkingSteps.length ? thinkingSteps : null,
              }
            : m
        )
      );

      // Save assistant message
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        user_id: user!.id,
        role: "assistant",
        content: assistantContent,
        reasoning: reasoning || null,
        sources: sources?.length ? sources : null,
        thinking_steps: thinkingSteps.length ? thinkingSteps : null,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setIsFallbackMode(true);
      
      // Fallback response
      const fallbackResponse: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `I understand you're asking about "${userMessage.content}". In fallback mode, I can provide general guidance, but for detailed explainable responses, please ensure the AI API is running.`,
        reasoning: "conceptual",
        isFallback: true,
        created_at: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, fallbackResponse]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedPrompts = [
    t("chat.prompt1"),
    t("chat.prompt2"),
    t("chat.prompt3"),
    t("chat.prompt4"),
  ];

  return (
    <AppLayout>
      <div className="flex h-screen flex-col p-8 pt-4">
        {/* Header with Fallback indicator */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl focus-gradient">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t("chat.title")}</h1>
                {isFallbackMode && (
                  <div className="flex items-center gap-1 text-xs text-warning">
                    <AlertCircle className="h-3 w-3" />
                    {t("chat.fallbackMode")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">{t("chat.welcomeTitle")}</h2>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {t("chat.welcomeDesc")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 max-w-lg">
                  {suggestedPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto py-3 px-4"
                      onClick={() => setInput(prompt)}
                    >
                      <Lightbulb className="h-4 w-4 mr-2 shrink-0 text-primary" />
                      <span className="line-clamp-2">{prompt}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {/* Reasoning indicator for assistant */}
                      {message.role === "assistant" && message.reasoning && (
                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                          <Search className="h-3 w-3" />
                          {t("chat.reasoning")}: {message.reasoning}
                        </div>
                      )}
                      
                      <p className="whitespace-pre-wrap">{message.content}</p>

                      {/* Explainable AI Components */}
                      {message.role === "assistant" && (message.sources || message.thinking_steps) && !message.isFallback && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          {message.thinking_steps && message.thinking_steps.length > 0 && (
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-full justify-between h-auto py-2">
                                  <span className="flex items-center gap-2 text-xs">
                                    <CheckCircle className="h-3 w-3 text-success" />
                                    {t("chat.thinkingProcess")} ({message.thinking_steps.length})
                                  </span>
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 space-y-1 pl-4 border-l-2 border-success/30">
                                  {message.thinking_steps.map((step, i) => (
                                    <p key={i} className="text-xs text-muted-foreground">
                                      {i + 1}. {step}
                                    </p>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                          {message.sources && message.sources.length > 0 && (
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-full justify-between h-auto py-2">
                                  <span className="flex items-center gap-2 text-xs">
                                    <FileText className="h-3 w-3 text-info" />
                                    {t("chat.sources")} ({message.sources.length})
                                  </span>
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 space-y-2">
                                  {message.sources.map((source, i) => (
                                    <div key={i} className="text-xs bg-info/10 rounded p-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-[10px]">
                                          {source.file}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                          chunk: {source.chunk}
                                        </span>
                                      </div>
                                      <p className="italic text-muted-foreground">"{source.quote}"</p>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("chat.placeholder")}
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !input.trim()} className="focus-gradient">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            
            {/* Footer actions */}
            <div className="flex items-center gap-4 mt-3 text-xs">
              <button 
                onClick={clearConversation}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                {t("chat.clearConversation")}
              </button>
              <button className="text-destructive hover:text-destructive/80 flex items-center gap-1 transition-colors">
                <ThumbsDown className="h-3 w-3" />
                {t("chat.disagree")}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
