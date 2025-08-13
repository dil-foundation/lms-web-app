import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScaleRating, YesNoDropdown } from './ObservationReportHelpers.tsx';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';

export const PrincipalAssessment = ({ formData, updateFormData, formErrors }) => (
  <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
    <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
          <Star className="w-6 h-6 text-primary" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
            Principal Assessment
          </CardTitle>
          <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
            Evaluate teaching effectiveness and classroom environment
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-8 space-y-8">
      {/* Core Teaching Assessment */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Teaching Effectiveness</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          />
        </div>
      </div>

      <Separator className="bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent h-px" />

      {/* Material Usage */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Resource Utilization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <YesNoDropdown
            label="Use of learning materials"
            description="Were appropriate learning materials utilized during the lesson?"
            name="learning-materials"
          />
        </div>
      </div>

      <Separator className="bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent h-px" />

      {/* Professional Development */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Professional Conduct & Development</h3>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="professionalism" className="text-base font-semibold text-gray-900 dark:text-gray-100">Professionalism & Teacher Conduct</Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">Optional narrative on teacher's professional behavior and classroom management</p>
            <Textarea 
              id="professionalism" 
              placeholder="Describe observations about teacher's professionalism, punctuality, interaction with students, etc." 
              className="min-h-[120px] text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="coaching-recommendations" className="text-base font-semibold text-gray-900 dark:text-gray-100">Recommendations for Coaching or Training</Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">Specific areas where additional support or training would be beneficial</p>
            <Textarea 
              id="coaching-recommendations" 
              placeholder="Suggest specific coaching areas, training programs, or skill development needs..." 
              className="min-h-[120px] text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
            />
          </div>
        </div>
      </div>

      <Separator className="bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent h-px" />

      <div className="space-y-3">
        <Label htmlFor="immediate-concerns" className="text-base font-semibold text-gray-900 dark:text-gray-100">Any immediate concerns?</Label>
        <p className="text-sm text-gray-600 dark:text-gray-300">Critical issues requiring immediate attention</p>
        <Textarea 
          id="immediate-concerns" 
          placeholder="Describe any immediate concerns or issues observed..." 
          className="min-h-[120px] text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
        />
      </div>
    </CardContent>
  </Card>
); 