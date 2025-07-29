import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YesNoDropdown, ScaleRating } from './ObservationReportHelpers.tsx';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users } from 'lucide-react';

export const EceObserverAssessment = ({ formData, updateFormData, formErrors }) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader>
      <div className="flex items-center gap-4">
        <Users className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">ECE Observer Assessment</CardTitle>
          <CardDescription>Early childhood education specific evaluations</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-8">
      {/* ECE-Specific Learning Environment */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Learning Environment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <YesNoDropdown
            label="Child-Initiated Activity Observed?"
            description="Were children given opportunities to lead or initiate learning activities?"
            name="childInitiated"
            value={formData.childInitiated}
            onChange={(value) => updateFormData('childInitiated', value)}
            error={formErrors.childInitiated}
            required
            allowComment={true}
          />
          <div className="space-y-2">
            <Label>Classroom Environment Rating *</Label>
            <p className="text-sm text-muted-foreground">Overall assessment of the learning environment</p>
            <Select 
              name="environment-rating"
              value={formData.environmentRating}
              onValueChange={(value) => updateFormData('environmentRating', value)}
            >
              <SelectTrigger className={formErrors.environmentRating ? "border-red-500" : ""}>
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent - Clean, organized, stimulating</SelectItem>
                <SelectItem value="good">Good - Well-maintained, age-appropriate</SelectItem>
                <SelectItem value="satisfactory">Satisfactory - Basic requirements met</SelectItem>
                <SelectItem value="needs-improvement">Needs Improvement - Some concerns</SelectItem>
                <SelectItem value="poor">Poor - Significant issues</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.environmentRating && <p className="text-sm text-red-500">{formErrors.environmentRating}</p>}
          </div>
        </div>
      </div>

      <Separator />

      {/* Student Engagement & Materials */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Student Engagement & Materials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScaleRating
            label="Student Emotional Engagement"
            description="Level of emotional involvement and enthusiasm shown by students"
            name="emotional-engagement"
          />
          <div className="space-y-2">
            <Label>Use of Play-Based Learning Materials</Label>
            <p className="text-sm text-muted-foreground">Integration of play elements in learning activities</p>
            <Select name="play-based-materials">
              <SelectTrigger><SelectValue placeholder="Select usage level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="extensive">Extensive - Multiple play-based activities</SelectItem>
                <SelectItem value="adequate">Adequate - Some play elements integrated</SelectItem>
                <SelectItem value="minimal">Minimal - Limited play-based learning</SelectItem>
                <SelectItem value="none">None - No play-based activities observed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Routine & Structure */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Classroom Routines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <YesNoDropdown
            label="Circle Time Routine Followed?"
            description="Was structured circle time conducted appropriately?"
            name="circle-time"
          />
          <ScaleRating
            label="Teacher gives clear instructions"
            description="Age-appropriate communication and guidance"
            name="clear-instructions-ece"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="ece-concerns">Any immediate concerns?</Label>
        <p className="text-sm text-muted-foreground">ECE-specific concerns or developmental observations</p>
        <Textarea id="ece-concerns" placeholder="Describe any concerns about child development, safety, or age-appropriate practices..." />
      </div>
    </CardContent>
  </Card>
); 