# AI Report Generation - Frontend Integration

**Sprint**: 04 of 06
**Index**: AI_REPORT_GEN_INDEX
**Depends On**: AI_REPORT_GEN_SPRINT_03_ACTION
**Next**: AI_REPORT_GEN_SPRINT_05_CACHING

---

## Objective

Add "Generate with AI" button to doctor Reports page with suggestion panel and form population.

## Implementation Tasks

### Task 4.1: Create AI Suggestion Panel Component

**File**: `src/components/doctor/AISuggestionPanel.tsx`

```tsx
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
```

### Task 4.2: Update Reports Page with AI Integration

**File**: `src/pages/doctor/Reports.tsx` - Extend existing

Add these state variables and handlers:

```tsx
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AISuggestionPanel } from "@/components/doctor/AISuggestionPanel";
import { Sparkles, Loader2 } from "lucide-react";

// Add to component state
const [aiState, setAiState] = useState<{
  isLoading: boolean;
  suggestion: AISuggestion | null;
  error: string | null;
}>({
  isLoading: false,
  suggestion: null,
  error: null,
});

const generateAISuggestion = useAction(api.actions.aiReportSuggestion.generateSuggestion);

// Add handler
const handleGenerateAI = async (appointmentId: Id<"appointments">) => {
  setAiState({ isLoading: true, suggestion: null, error: null });
  
  try {
    const result = await generateAISuggestion({ appointmentId });
    setAiState({
      isLoading: false,
      suggestion: result,
      error: null,
    });
  } catch (err) {
    setAiState({
      isLoading: false,
      suggestion: null,
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
};

const handleAcceptSuggestion = () => {
  if (!aiState.suggestion) return;
  
  // Populate form with AI values
  setFormData({
    fitForWork: aiState.suggestion.fitForWork,
    summary: aiState.suggestion.summary,
    restrictions: aiState.suggestion.restrictions.map(r => r.description),
    followUpRequired: aiState.suggestion.followUpRequired,
    followUpNotes: aiState.suggestion.followUpNotes || "",
  });
  
  setAiAccepted(true);
  setAiModified(false);
};

const handleModifySuggestion = () => {
  handleAcceptSuggestion();
  setAiAccepted(false);
  setAiModified(true);
};

const handleRejectSuggestion = () => {
  setAiState({ isLoading: false, suggestion: null, error: null });
};
```

### Task 4.3: Add AI Button to Report Dialog

In the dialog content, add the AI button and panel:

```tsx
{/* Add after dialog title, before form */}
<div className="space-y-4">
  <Button
    type="button"
    variant="outline"
    onClick={() => handleGenerateAI(selectedAppointment._id)}
    disabled={aiState.isLoading}
    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
  >
    {aiState.isLoading ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Generating...
      </>
    ) : (
      <>
        <Sparkles className="h-4 w-4 mr-2" />
        Generate with AI
      </>
    )}
  </Button>
  
  {aiState.error && (
    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
      {aiState.error}
    </div>
  )}
  
  {aiState.suggestion && (
    <AISuggestionPanel
      suggestion={aiState.suggestion}
      onAccept={handleAcceptSuggestion}
      onModify={handleModifySuggestion}
      onReject={handleRejectSuggestion}
      isLoading={aiState.isLoading}
    />
  )}
</div>
```

### Task 4.4: Update Form Submission

Update the submit handler to use `createWithAI`:

```tsx
const createReportWithAI = useMutation(api.reports.createWithAI);

const handleSubmit = async () => {
  try {
    const reportId = await createReportWithAI({
      appointmentId: selectedAppointment._id,
      fitForWork: formData.fitForWork,
      summary: formData.summary,
      restrictions: formData.restrictions.length > 0 ? formData.restrictions : undefined,
      followUpRequired: formData.followUpRequired,
      followUpNotes: formData.followUpNotes || undefined,
      aiAssisted: aiState.suggestion !== null,
      aiAccepted: aiAccepted,
      aiModified: aiModified,
    });
    
    // Send to employer
    await sendToEmployer({ reportId });
    
    // Reset state
    setDialogOpen(false);
    setAiState({ isLoading: false, suggestion: null, error: null });
    
  } catch (err) {
    console.error("Failed to create report:", err);
  }
};
```

## UI Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Report - John Smith                              [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [✨ Generate with AI]                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ AI Suggestion                              Confidence: 85% │   │
│  │ ─────────────────────────────────────────────────────────│   │
│  │ Fitness: Fit with restrictions                           │   │
│  │ Summary: Patient assessed for occupational health...     │   │
│  │ Restrictions: [ER-01] Regular breaks, [MH-02] No >10kg   │   │
│  │                                                          │   │
│  │ [✓ Accept]  [✏ Edit & Use]  [✗ Ignore]                  │   │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Fitness Assessment *    [▼ Fit with restrictions        ]      │
│                                                                  │
│  Summary *                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Patient assessed for occupational health screening...    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [✓] Follow-up Required                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Review in 4 weeks                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│              [Cancel]        [Submit & Send to Employer]         │
└─────────────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] `AISuggestionPanel.tsx` component created
- [ ] "Generate with AI" button visible in report dialog
- [ ] Loading state shows spinner and "Generating..."
- [ ] AI suggestion panel appears after successful generation
- [ ] Accept, Edit, and Ignore buttons work correctly
- [ ] Form is populated with AI suggestion data
- [ ] AI metadata (aiAssisted, aiAccepted, aiModified) saved with report
- [ ] Error handling shows user-friendly messages

---

→ Next: AI_REPORT_GEN_SPRINT_05_CACHING
