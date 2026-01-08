import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Pencil, X } from "lucide-react";

interface Restriction {
  code: string;
  category: string;
  description: string;
  duration?: string;
}

interface AISuggestion {
  fitForWork: string;
  summary: string;
  restrictions: Restriction[];
  followUpRequired: boolean;
  followUpNotes?: string;
  confidence: number;
}

interface Props {
  suggestion: AISuggestion;
  onAccept: () => void;
  onModify: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

export function AISuggestionPanel({ suggestion, onAccept, onModify, onReject, isLoading }: Props) {
  const confidencePercent = Math.round(suggestion.confidence * 100);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Suggestion
          </CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {confidencePercent}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-blue-800">
          <p><strong>Fitness:</strong> {suggestion.fitForWork.replace(/_/g, " ")}</p>
          <p className="mt-1"><strong>Summary:</strong> {suggestion.summary}</p>

          {suggestion.restrictions.length > 0 && (
            <div className="mt-2">
              <strong>Restrictions:</strong>
              <ul className="list-disc ml-4 mt-1">
                {suggestion.restrictions.map((r, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs">[{r.code}]</span> {r.description}
                    {r.duration && <span className="text-blue-600"> ({r.duration})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestion.followUpRequired && suggestion.followUpNotes && (
            <p className="mt-2">
              <strong>Follow-up:</strong> {suggestion.followUpNotes}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-3 w-3 mr-1" /> Accept
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onModify}
            disabled={isLoading}
          >
            <Pencil className="h-3 w-3 mr-1" /> Edit & Use
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onReject}
            disabled={isLoading}
          >
            <X className="h-3 w-3 mr-1" /> Ignore
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Export the type for use in parent components
export type { AISuggestion, Restriction };
