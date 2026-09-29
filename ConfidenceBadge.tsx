import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/lib/mockData";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  score: number;
  className?: string;
}

const styles: Record<ConfidenceLevel, { bg: string; text: string; icon: JSX.Element }> = {
  high: {
    bg: "bg-[#2c6e8c]/10 border-[#2c6e8c]/30",
    text: "text-[#2c6e8c]",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  medium: {
    bg: "bg-[#b5502c]/10 border-[#b5502c]/30",
    text: "text-[#b5502c]",
    icon: <CircleAlert className="h-3 w-3" />,
  },
  low: {
    bg: "bg-[#8a8378]/10 border-[#8a8378]/30",
    text: "text-[#6b665c]",
    icon: <TrendingDown className="h-3 w-3" />,
  },
};

export function ConfidenceBadge({ level, score, className }: ConfidenceBadgeProps) {
  const s = styles[level];
  const label = level.charAt(0).toUpperCase() + level.slice(1);

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium border", s.bg, s.text, className)}
    >
      {s.icon}
      {label} · {score}%
    </Badge>
  );
}
