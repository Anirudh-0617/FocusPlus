import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Star, Send } from "lucide-react";

interface TaskReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  taskSubject: string | null;
  onSubmit: (rating: number, comments: string) => void;
  onSkip: () => void;
}

const getDifficultyLabel = (rating: number): string => {
  if (rating <= 2) return "Very Easy";
  if (rating <= 4) return "Easy";
  if (rating <= 6) return "Medium";
  if (rating <= 8) return "Hard";
  return "Very Hard";
};

const getDifficultyColor = (rating: number): string => {
  if (rating <= 2) return "bg-success/20 text-success border-success/30";
  if (rating <= 4) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (rating <= 6) return "bg-warning/20 text-warning border-warning/30";
  if (rating <= 8) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  return "bg-destructive/20 text-destructive border-destructive/30";
};

export function TaskReviewDialog({
  open,
  onOpenChange,
  taskTitle,
  taskSubject,
  onSubmit,
  onSkip,
}: TaskReviewDialogProps) {
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");

  const handleSubmit = () => {
    onSubmit(rating, comments);
    setRating(5);
    setComments("");
  };

  const handleSkip = () => {
    onSkip();
    setRating(5);
    setComments("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Task info */}
          <div>
            <p className="text-sm text-muted-foreground">Course/Session:</p>
            <p className="font-semibold text-lg">{taskTitle}</p>
            {taskSubject && (
              <p className="text-sm text-muted-foreground">{taskSubject}</p>
            )}
          </div>

          {/* Star rating display */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Difficulty Rating (1-10)</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      star <= rating
                        ? "fill-warning text-warning"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Slider */}
            <div className="flex items-center gap-4">
              <Slider
                value={[rating]}
                onValueChange={(value) => setRating(value[0])}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-1 min-w-[50px]">
                <span className="text-xl font-bold text-primary">{rating}</span>
                <span className="text-muted-foreground">/10</span>
              </div>
            </div>

            {/* Difficulty badge */}
            <Badge className={getDifficultyColor(rating)}>
              {getDifficultyLabel(rating)}
            </Badge>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Additional Comments (Optional)</p>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share your thoughts about the difficulty, what helped you, or any tips for others..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleSubmit} className="focus-gradient gap-2">
            <Send className="h-4 w-4" />
            Submit Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
