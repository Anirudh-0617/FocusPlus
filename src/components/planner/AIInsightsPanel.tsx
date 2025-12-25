import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lightbulb, TrendingUp, AlertTriangle, Info, Loader2, RefreshCw, Brain } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Insight {
  type: "suggestion" | "warning" | "stat" | "tip";
  title: string;
  description: string;
  reasoning: string;
  priority?: "high" | "medium" | "low";
}

interface RecommendedSession {
  subject: string;
  suggested_time: string;
  duration_minutes: number;
  reason: string;
}

interface Source {
  type: string;
  count?: number;
  description: string;
}

interface OptimizationData {
  optimization: {
    insights: Insight[];
    recommended_sessions: RecommendedSession[];
    peak_hours?: string[];
    workload_balance?: {
      status: string;
      message: string;
    };
    overall_recommendation: string;
  };
  sources: Source[];
  generated_at: string;
}

interface AIInsightsPanelProps {
  onViewAnalysis?: () => void;
}

export function AIInsightsPanel({ onViewAnalysis }: AIInsightsPanelProps) {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OptimizationData | null>(null);
  const [showReasoning, setShowReasoning] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (!user || !session?.access_token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/timetable-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch insights");
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load AI insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && session?.access_token) {
      fetchInsights();
    }
  }, [user, session?.access_token]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "suggestion":
        return <Lightbulb className="h-4 w-4 text-success" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "stat":
        return <TrendingUp className="h-4 w-4 text-primary" />;
      case "tip":
        return <Info className="h-4 w-4 text-info" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={fetchInsights}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !data ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Analyzing your schedule...</span>
          </div>
        ) : data?.optimization?.insights ? (
          <>
            {data.optimization.insights.slice(0, 3).map((insight, index) => (
              <div
                key={index}
                className="rounded-lg bg-muted/50 p-3 transition-all hover:bg-muted/70 cursor-pointer"
                onClick={() => setShowReasoning(showReasoning === `${index}` ? null : `${index}`)}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">{getInsightIcon(insight.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${getPriorityColor(insight.priority)}`}>
                        {insight.title}
                      </span>
                      {insight.priority && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {insight.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {insight.description}
                    </p>
                    {showReasoning === `${index}` && (
                      <div className="mt-2 p-2 rounded bg-background/50 border border-border/50">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Why: </span>
                          {insight.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {data.optimization.overall_recommendation && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium text-primary">Recommendation: </span>
                    <span className="text-foreground">{data.optimization.overall_recommendation}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Source Attribution */}
            {data.sources && data.sources.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Sources used:</p>
                <div className="flex flex-wrap gap-1">
                  {data.sources.map((source, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {source.type} {source.count ? `(${source.count})` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Click refresh to generate AI insights
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-primary hover:text-primary"
          onClick={onViewAnalysis}
        >
          View Full Analysis
        </Button>
      </CardContent>
    </Card>
  );
}
