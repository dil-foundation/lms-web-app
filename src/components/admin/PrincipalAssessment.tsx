import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScaleRating, YesNoDropdown } from './ObservationReportHelpers.tsx';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';

export const PrincipalAssessment = ({ formData, updateFormData, formErrors }) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader>
      <div className="flex items-center gap-4">
        <Star className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">Principal Assessment</CardTitle>
          <CardDescription>Evaluate teaching effectiveness and classroom environment</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-8">
      {/* Core Teaching Assessment */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Teaching Effectiveness</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScaleRating
            label="Teacher gives clear instructions"
            description="Rate how clearly the teacher communicates lesson objectives and tasks"
            name="clearInstructions"
            value={formData.clearInstructions}
            onChange={(value) => updateFormData('clearInstructions', value)}
            error={formErrors.clearInstructions}
            required
          />
          <ScaleRating
            label="Students are engaged during lesson"
            description="Assess student participation and attention levels"
            name="studentEngagement"
            value={formData.studentEngagement}
            onChange={(value) => updateFormData('studentEngagement', value)}
            error={formErrors.studentEngagement}
            required
          />
          <ScaleRating
            label="Classroom displays are age-appropriate"
            description="Evaluate the relevance and quality of classroom materials"
            name="classroomDisplays"
            value={formData.classroomDisplays}
            onChange={(value) => updateFormData('classroomDisplays', value)}
            error={formErrors.classroomDisplays}
            required
          />
          <ScaleRating
            label="Lesson Plan Adherence Rating"
            description="How well did the teacher follow the planned curriculum structure?"
            name="lessonAdherence"
            value={formData.lessonAdherence}
            onChange={(value) => updateFormData('lessonAdherence', value)}
            error={formErrors.lessonAdherence}
          />
        </div>
      </div>

      <Separator />

      {/* Material Usage */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Resource Utilization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <YesNoDropdown
            label="Use of learning materials"
            description="Were appropriate learning materials utilized during the lesson?"
            name="learning-materials"
          />
        </div>
      </div>

      <Separator />

      {/* Professional Development */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Professional Conduct & Development</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="professionalism">Professionalism & Teacher Conduct</Label>
            <p className="text-sm text-muted-foreground">Optional narrative on teacher's professional behavior and classroom management</p>
            <Textarea id="professionalism" placeholder="Describe observations about teacher's professionalism, punctuality, interaction with students, etc." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coaching-recommendations">Recommendations for Coaching or Training</Label>
            <p className="text-sm text-muted-foreground">Specific areas where additional support or training would be beneficial</p>
            <Textarea id="coaching-recommendations" placeholder="Suggest specific coaching areas, training programs, or skill development needs..." />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="immediate-concerns">Any immediate concerns?</Label>
        <p className="text-sm text-muted-foreground">Critical issues requiring immediate attention</p>
        <Textarea id="immediate-concerns" placeholder="Describe any immediate concerns or issues observed..." />
      </div>
    </CardContent>
  </Card>
); 