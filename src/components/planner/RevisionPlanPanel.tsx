import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Brain, Loader2, Plus, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TopicWeakness {
  topic: string;
  weakness_score: number;
  missed_sessions: number;
  low_xp_tasks: number;
  total_study_minutes?: number;
  avg_difficulty?: number;
  recommended_sessions: number;
  weakness_reason: string;
  recommendation: string;
  priority: "high" | "medium" | "low";
}

interface RevisionPlanPanelProps {
  onAddToTimetable?: (topic: string, sessions: number) => void;
}

export function RevisionPlanPanel({ onAddToTimetable }: RevisionPlanPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<{
    topics: TopicWeakness[];
    reasoning_summary: string[];
    overall_advice?: string;
  } | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const generatePlan = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revision-plan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate plan");

      const data = await response.json();
      setPlan(data);
      toast({
        title: "Revision Plan Generated",
        description: data.topics.length > 0 
          ? `Found ${data.topics.length} topics needing revision.`
          : "No weak topics found - great work!",
      });
    } catch (error) {
      console.error("Error generating revision plan:", error);
      toast({
        title: "Error",
        description: "Failed to generate revision plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (topic: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return { label: "HIGH", className: "bg-destructive/20 text-destructive border-destructive/30" };
      case "medium":
        return { label: "MEDIUM", className: "bg-primary/20 text-primary border-primary/30" };
      default:
        return { label: "LOW", className: "bg-muted text-muted-foreground" };
    }
  };

  const getWeaknessColor = (score: number) => {
    if (score >= 0.7) return "text-destructive";
    if (score >= 0.4) return "text-primary";
    return "text-muted-foreground";
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-primary" />
          Smart Revision
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!plan ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              AI analyzes your study patterns to find topics that need revision.
            </p>
            <Button
              onClick={generatePlan}
              disabled={loading}
              className="gap-2"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {loading ? "Analyzing..." : "Generate Revision Plan"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {plan.overall_advice && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">{plan.overall_advice}</p>
              </div>
            )}

            {plan.topics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Great job! No weak topics found based on your study data.
              </p>
            ) : (
              plan.topics.map((topic) => {
                const badge = getPriorityBadge(topic.priority);
                const isExpanded = expandedTopics.has(topic.topic);

                return (
                  <Collapsible
                    key={topic.topic}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(topic.topic)}
                  >
                    <div className="rounded-lg border bg-card overflow-hidden">
                      <CollapsibleTrigger className="w-full p-3 text-left hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle
                              className={`h-4 w-4 ${getWeaknessColor(topic.weakness_score)}`}
                            />
                            <span className="font-medium text-sm">{topic.topic}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={badge.className}>
                              {badge.label}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2">
                          <span className={getWeaknessColor(topic.weakness_score)}>
                            {Math.round(topic.weakness_score * 100)}% weakness
                          </span>
                          <span>•</span>
                          <span>{topic.missed_sessions} missed</span>
                          <span>•</span>
                          <span>{topic.low_xp_tasks} incomplete</span>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-3 border-t pt-3">
                          {/* AI Reason */}
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Why revision needed:</p>
                            <p className="text-sm">{topic.weakness_reason}</p>
                          </div>

                          {/* AI Recommendation */}
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Recommendation:</p>
                            <p className="text-sm text-primary">{topic.recommendation}</p>
                          </div>

                          {/* Stats */}
                          {(topic.total_study_minutes !== undefined || topic.avg_difficulty !== undefined) && (
                            <div className="flex flex-wrap gap-2 text-xs">
                              {topic.total_study_minutes !== undefined && (
                                <Badge variant="secondary">
                                  {topic.total_study_minutes} min studied
                                </Badge>
                              )}
                              {topic.avg_difficulty !== undefined && topic.avg_difficulty > 0 && (
                                <Badge variant="secondary">
                                  Avg difficulty: {topic.avg_difficulty}/10
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-muted-foreground">
                              Suggested: {topic.recommended_sessions} sessions
                            </span>
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs gap-1"
                              onClick={() =>
                                onAddToTimetable?.(topic.topic, topic.recommended_sessions)
                              }
                            >
                              <Plus className="h-3 w-3" />
                              Add to Timetable
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={generatePlan}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
