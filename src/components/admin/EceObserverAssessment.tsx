import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YesNoDropdown, ScaleRating } from './ObservationReportHelpers.tsx';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users } from 'lucide-react';

export const EceObserverAssessment = ({ formData, updateFormData, formErrors }) => (
  <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
    <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
            ECE Observer Assessment
          </CardTitle>
          <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
            Early childhood education specific evaluations
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-8 space-y-8">
      {/* ECE-Specific Learning Environment */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Learning Environment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Classroom Environment Rating *</Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">Overall assessment of the learning environment</p>
            <Select 
              name="environment-rating"
              value={formData.environmentRating}
              onValueChange={(value) => updateFormData('environmentRating', value)}
            >
              <SelectTrigger className={`h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 ${formErrors.environmentRating ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}>
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                <SelectItem value="excellent" className="text-base py-3 hover:bg-primary/5 rounded-xl">Excellent - Clean, organized, stimulating</SelectItem>
                <SelectItem value="good" className="text-base py-3 hover:bg-primary/5 rounded-xl">Good - Well-maintained, age-appropriate</SelectItem>
                <SelectItem value="satisfactory" className="text-base py-3 hover:bg-primary/5 rounded-xl">Satisfactory - Basic requirements met</SelectItem>
                <SelectItem value="needs-improvement" className="text-base py-3 hover:bg-primary/5 rounded-xl">Needs Improvement - Some concerns</SelectItem>
                <SelectItem value="poor" className="text-base py-3 hover:bg-primary/5 rounded-xl">Poor - Significant issues</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.environmentRating && <p className="text-sm text-red-500 font-medium">{formErrors.environmentRating}</p>}
          </div>
        </div>
      </div>

      <Separator className="bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent h-px" />

      {/* Student Engagement & Materials */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Student Engagement & Materials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ScaleRating
            label="Student Emotional Engagement"
            description="Level of emotional involvement and enthusiasm shown by students"
            name="emotional-engagement"
          />
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Use of Play-Based Learning Materials</Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">Integration of play elements in learning activities</p>
            <Select name="play-based-materials">
              <SelectTrigger className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10">
                <SelectValue placeholder="Select usage level" />
              </SelectTrigger>
              <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                <SelectItem value="extensive" className="text-base py-3 hover:bg-primary/5 rounded-xl">Extensive - Multiple play-based activities</SelectItem>
                <SelectItem value="adequate" className="text-base py-3 hover:bg-primary/5 rounded-xl">Adequate - Some play elements integrated</SelectItem>
                <SelectItem value="minimal" className="text-base py-3 hover:bg-primary/5 rounded-xl">Minimal - Limited play-based learning</SelectItem>
                <SelectItem value="none" className="text-base py-3 hover:bg-primary/5 rounded-xl">None - No play-based activities observed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator className="bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent h-px" />

      {/* Routine & Structure */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Classroom Routines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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