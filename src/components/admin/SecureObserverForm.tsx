import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useSecureLinks } from '@/contexts/SecureLinksContext';
import ObservationReportsService from '@/services/observationReportsService';
import { 
  AlertCircle, 
  CheckCircle, 
  Send, 
  Shield, 
  Lock, 
  User,
  ClipboardList,
  Star,
  Users,
  TrendingUp,
  Settings,
  BookOpen,
  Loader2,
  Check
} from 'lucide-react';

interface SecureObserverFormProps {
  token: string;
}

type ObserverRole = 'principal' | 'ece' | 'school-officer' | 'project-manager' | '';

// Form data interfaces
interface FormData {
  // Observer information
  observerRole: ObserverRole;
  observerName: string;
  observationDate: string;
  schoolName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  projectName: string;
  teacherJoiningDate: string;
  teacherQualification: string;
  lessonCode: string;
  lessonPlanAvailable: string;
  projectAssociation: string;
  generalNotes: string;
  
  // TEAL observations (optional)
  tealVideoContent?: string;
  tealGuidingQuestion?: string;
  tealThinkPairShare?: string;
  tealCollaborative?: string;
  tealDeviceEngagement?: number;
  
  // Role-specific fields (dynamic based on observer role)
  [key: string]: any;
}

interface FormErrors {
  [key: string]: string;
}

// Helper Components for consistency
const ScaleRating = ({ 
  label, 
  description, 
  name, 
  value, 
  onChange, 
  error, 
  required = false 
}: {
  label: string;
  description: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <Select value={value} onValueChange={onChange || (() => {})} name={name}>
      <SelectTrigger className={error ? "border-red-500" : ""}>
        <SelectValue placeholder="Select rating (1-5)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="5">5 - Excellent</SelectItem>
        <SelectItem value="4">4 - Good</SelectItem>
        <SelectItem value="3">3 - Satisfactory</SelectItem>
        <SelectItem value="2">2 - Needs Improvement</SelectItem>
        <SelectItem value="1">1 - Poor</SelectItem>
      </SelectContent>
    </Select>
    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
);

const YesNoDropdown = ({ 
  label, 
  description, 
  name, 
  allowComment = false,
  value,
  onChange,
  error,
  required = false,
  commentValue,
  onCommentChange
}: {
  label: string;
  description: string;
  name: string;
  allowComment?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  commentValue?: string;
  onCommentChange?: (value: string) => void;
}) => (
  <div className="space-y-2">
    <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <Select value={value} onValueChange={onChange || (() => {})} name={name}>
      <SelectTrigger className={error ? "border-red-500" : ""}>
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="yes">Yes</SelectItem>
        <SelectItem value="no">No</SelectItem>
      </SelectContent>
    </Select>
    {allowComment && onCommentChange && (
      <Textarea 
        placeholder="Optional comment..." 
        className="mt-2" 
        value={commentValue}
        onChange={(e) => onCommentChange(e.target.value)}
      />
    )}
    {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
);

const TagInput = ({ 
  label, 
  description, 
  placeholder, 
  value, 
  onChange, 
  error, 
  required = false 
}: {
  label: string;
  description: string;
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <Input 
      placeholder={placeholder} 
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={error ? "border-red-500" : ""}
    />
    <p className="text-xs text-muted-foreground">Separate multiple items with commas</p>
    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
);

const ObservationDetails = ({ 
  formData, 
  updateFormData, 
  formErrors 
}: { 
  formData: FormData; 
  updateFormData: (field: string, value: any) => void; 
  formErrors: FormErrors; 
}) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader className="flex flex-row items-center gap-4">
      <ClipboardList className="w-6 h-6 text-green-600" />
      <div>
        <CardTitle className="text-xl">Observation Details</CardTitle>
        <CardDescription>Basic information about the observation session</CardDescription>
      </div>
    </CardHeader>
    <CardContent className="space-y-8">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="observer-name">Observer Name *</Label>
          <Input 
            id="observer-name" 
            placeholder="Enter your full name..." 
            value={formData.observerName}
            onChange={(e) => updateFormData('observerName', e.target.value)}
            className={formErrors.observerName ? "border-red-500" : ""}
          />
          {formErrors.observerName && <p className="text-sm text-red-500">{formErrors.observerName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="observation-date">Observation Date *</Label>
          <Input 
            id="observation-date" 
            type="date" 
            value={formData.observationDate}
            onChange={(e) => updateFormData('observationDate', e.target.value)}
            className={`${formErrors.observationDate ? "border-red-500" : ""} [&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:dark:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
          />
          {formErrors.observationDate && <p className="text-sm text-red-500">{formErrors.observationDate}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="school-name">School Name *</Label>
          <Input 
            id="school-name" 
            placeholder="Enter school name..." 
            value={formData.schoolName}
            onChange={(e) => updateFormData('schoolName', e.target.value)}
            className={formErrors.schoolName ? "border-red-500" : ""}
          />
          {formErrors.schoolName && <p className="text-sm text-red-500">{formErrors.schoolName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-name">Teacher Name *</Label>
          <Input 
            id="teacher-name" 
            placeholder="Enter teacher name..." 
            value={formData.teacherName}
            onChange={(e) => updateFormData('teacherName', e.target.value)}
            className={formErrors.teacherName ? "border-red-500" : ""}
          />
          {formErrors.teacherName && <p className="text-sm text-red-500">{formErrors.teacherName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="start-time">Start Time *</Label>
          <Input 
            id="start-time" 
            type="time" 
            value={formData.startTime}
            onChange={(e) => updateFormData('startTime', e.target.value)}
            className={`${formErrors.startTime ? "border-red-500" : ""} [&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:dark:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
          />
          {formErrors.startTime && <p className="text-sm text-red-500">{formErrors.startTime}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-time">End Time *</Label>
          <Input 
            id="end-time" 
            type="time" 
            value={formData.endTime}
            onChange={(e) => updateFormData('endTime', e.target.value)}
            className={`${formErrors.endTime ? "border-red-500" : ""} [&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:dark:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
          />
          {formErrors.endTime && <p className="text-sm text-red-500">{formErrors.endTime}</p>}
        </div>
      </div>

      <Separator />

      {/* Enhanced Universal Fields */}
  <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Project & Teacher Information</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TagInput 
            label="Project Name & Category *"
            description="Enter project name and category for program aggregation"
            placeholder="e.g., TEAL Phase 2, Early Childhood Development"
            value={formData.projectName}
            onChange={(value) => updateFormData('projectName', value)}
            error={formErrors.projectName}
            required
          />
          <div className="space-y-2">
            <Label htmlFor="teacher-joining-date">Date of Teacher's Joining DIL</Label>
            <p className="text-sm text-muted-foreground">For tenure context and expectation setting</p>
            <Input 
              id="teacher-joining-date" 
              type="date" 
              value={formData.teacherJoiningDate}
              onChange={(e) => updateFormData('teacherJoiningDate', e.target.value)}
              className="[&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:dark:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher-qualification">Teacher Qualification</Label>
            <p className="text-sm text-muted-foreground">Educational background and certifications</p>
            <Select value={formData.teacherQualification} onValueChange={(value) => updateFormData('teacherQualification', value)}>
              <SelectTrigger><SelectValue placeholder="Select qualification" /></SelectTrigger>
          <SelectContent>
                <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                <SelectItem value="master">Master's Degree</SelectItem>
                <SelectItem value="diploma">Teaching Diploma</SelectItem>
                <SelectItem value="certificate">Teaching Certificate</SelectItem>
                <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-code">Lesson Code *</Label>
            <p className="text-sm text-muted-foreground">For lesson traceability and tracking</p>
            <Input 
              id="lesson-code" 
              placeholder="e.g., ENG-G3-L15" 
              value={formData.lessonCode}
              onChange={(e) => updateFormData('lessonCode', e.target.value)}
              className={formErrors.lessonCode ? "border-red-500" : ""}
            />
            {formErrors.lessonCode && <p className="text-sm text-red-500">{formErrors.lessonCode}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <YesNoDropdown
            label="Scripted Lesson Plan Available?"
            description="Was a detailed lesson plan available for review?"
            name="lesson-plan-available"
            value={formData.lessonPlanAvailable}
            onChange={(value) => updateFormData('lessonPlanAvailable', value)}
          />
          <TagInput 
            label="Project Association"
            description="Associated programs and initiatives"
            placeholder="e.g., ECE, TEAL, Early Grade Reading"
            value={formData.projectAssociation}
            onChange={(value) => updateFormData('projectAssociation', value)}
          />
        </div>
    </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="general-notes">General Notes</Label>
        <p className="text-sm text-muted-foreground">Any additional observations or context</p>
        <Textarea 
          id="general-notes" 
          placeholder="Add any general observations or notes..." 
          value={formData.generalNotes}
          onChange={(e) => updateFormData('generalNotes', e.target.value)}
        />
      </div>
    </CardContent>
  </Card>
);

const PrincipalAssessment = ({ 
  formData, 
  updateFormData, 
  formErrors 
}: { 
  formData: FormData; 
  updateFormData: (field: string, value: any) => void; 
  formErrors: FormErrors; 
}) => (
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
            value={formData.learningMaterials}
            onChange={(value) => updateFormData('learningMaterials', value)}
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
            <Textarea 
              id="professionalism" 
              placeholder="Describe observations about teacher's professionalism, punctuality, interaction with students, etc." 
              value={formData.professionalism}
              onChange={(e) => updateFormData('professionalism', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coaching-recommendations">Recommendations for Coaching or Training</Label>
            <p className="text-sm text-muted-foreground">Specific areas where additional support or training would be beneficial</p>
            <Textarea 
              id="coaching-recommendations" 
              placeholder="Suggest specific coaching areas, training programs, or skill development needs..." 
              value={formData.coachingRecommendations}
              onChange={(e) => updateFormData('coachingRecommendations', e.target.value)}
            />
          </div>
        </div>
    </div>

      <Separator />

    <div className="space-y-2">
        <Label htmlFor="immediate-concerns">Any immediate concerns?</Label>
        <p className="text-sm text-muted-foreground">Critical issues requiring immediate attention</p>
      <Textarea 
          id="immediate-concerns" 
        placeholder="Describe any immediate concerns or issues observed..."
          value={formData.immediateConcerns}
          onChange={(e) => updateFormData('immediateConcerns', e.target.value)}
      />
    </div>
    </CardContent>
  </Card>
);

const EceObserverAssessment = ({ 
  formData, 
  updateFormData, 
  formErrors 
}: { 
  formData: FormData; 
  updateFormData: (field: string, value: any) => void; 
  formErrors: FormErrors; 
}) => (
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
            commentValue={formData.childInitiatedComment}
            onCommentChange={(value) => updateFormData('childInitiatedComment', value)}
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
            value={formData.emotionalEngagement}
            onChange={(value) => updateFormData('emotionalEngagement', value)}
          />
          <div className="space-y-2">
            <Label>Use of Play-Based Learning Materials</Label>
            <p className="text-sm text-muted-foreground">Integration of play elements in learning activities</p>
            <Select 
              name="play-based-materials"
              value={formData.playBasedMaterials}
              onValueChange={(value) => updateFormData('playBasedMaterials', value)}
            >
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
            value={formData.circleTime}
            onChange={(value) => updateFormData('circleTime', value)}
          />
          <ScaleRating
            label="Teacher gives clear instructions"
            description="Age-appropriate communication and guidance"
            name="clear-instructions-ece"
            value={formData.clearInstructionsEce}
            onChange={(value) => updateFormData('clearInstructionsEce', value)}
          />
        </div>
    </div>

      <Separator />

    <div className="space-y-2">
      <Label htmlFor="ece-concerns">Any immediate concerns?</Label>
        <p className="text-sm text-muted-foreground">ECE-specific concerns or developmental observations</p>
      <Textarea 
        id="ece-concerns" 
          placeholder="Describe any concerns about child development, safety, or age-appropriate practices..." 
          value={formData.eceConcerns}
          onChange={(e) => updateFormData('eceConcerns', e.target.value)}
      />
    </div>
    </CardContent>
  </Card>
);

const SchoolOfficerAssessment = ({ 
  formData, 
  updateFormData, 
  formErrors 
}: { 
  formData: FormData; 
  updateFormData: (field: string, value: any) => void; 
  formErrors: FormErrors; 
}) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader>
      <div className="flex items-center gap-4">
        <Shield className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">School Officer Assessment</CardTitle>
          <CardDescription>Administrative compliance and logistical evaluations</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-8">
      {/* Administrative Compliance */}
  <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Administrative Compliance</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
            <Label htmlFor="project-name-officer">Project Name *</Label>
        <Input 
              id="project-name-officer" 
          placeholder="Enter project name..."
              value={formData.projectNameOfficer}
              onChange={(e) => updateFormData('projectNameOfficer', e.target.value)}
              className={formErrors.projectNameOfficer ? "border-red-500" : ""}
        />
            {formErrors.projectNameOfficer && <p className="text-sm text-red-500">{formErrors.projectNameOfficer}</p>}
      </div>
          <div className="space-y-2">
            <Label>Quarter *</Label>
            <p className="text-sm text-muted-foreground">Select the current quarter</p>
            <Select 
              value={formData.quarter} 
              onValueChange={(value) => updateFormData('quarter', value)}
            >
              <SelectTrigger className={formErrors.quarter ? "border-red-500" : ""}>
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
          <SelectContent>
            <SelectItem value="q1">Q1</SelectItem>
            <SelectItem value="q2">Q2</SelectItem>
            <SelectItem value="q3">Q3</SelectItem>
            <SelectItem value="q4">Q4</SelectItem>
          </SelectContent>
        </Select>
            {formErrors.quarter && <p className="text-sm text-red-500">{formErrors.quarter}</p>}
          </div>
        </div>
      </div>

      <Separator />

      {/* Teaching Quality */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Teaching Quality</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScaleRating
        label="Teaching effectiveness"
        description="Overall quality of instruction delivery"
            name="teachingEffectiveness"
            value={formData.teachingEffectiveness}
            onChange={(value) => updateFormData('teachingEffectiveness', value)}
            error={formErrors.teachingEffectiveness}
            required
          />
          <ScaleRating
        label="School cleanliness"
        description="Maintenance and hygiene standards of the facility"
            name="schoolCleanliness"
            value={formData.schoolCleanliness}
            onChange={(value) => updateFormData('schoolCleanliness', value)}
            error={formErrors.schoolCleanliness}
          />
        </div>
    </div>

      <Separator />

    <div className="space-y-2">
      <Label htmlFor="summary-comments">Summary comments</Label>
        <p className="text-sm text-muted-foreground">Overall assessment and recommendations</p>
      <Textarea 
        id="summary-comments" 
        placeholder="Add summary comments about the observation..."
          value={formData.summaryComments}
          onChange={(e) => updateFormData('summaryComments', e.target.value)}
      />
    </div>
    </CardContent>
  </Card>
);

const ProjectManagerAssessment = ({ 
  formData, 
  updateFormData, 
  formErrors 
}: { 
  formData: FormData; 
  updateFormData: (field: string, value: any) => void; 
  formErrors: FormErrors; 
}) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader>
      <div className="flex items-center gap-4">
        <TrendingUp className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">Project Manager Assessment</CardTitle>
          <CardDescription>Implementation fidelity and strategic program evaluation</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-8">
      {/* Implementation Cycle */}
  <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Implementation Context</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Observation Cycle *</Label>
            <p className="text-sm text-muted-foreground">Select the current observation cycle</p>
            <Select 
              name="observation-cycle"
              value={formData.observationCycle}
              onValueChange={(value) => updateFormData('observationCycle', value)}
            >
              <SelectTrigger className={formErrors.observationCycle ? "border-red-500" : ""}>
                <SelectValue placeholder="Select observation cycle" />
              </SelectTrigger>
        <SelectContent>
          <SelectItem value="cycle1">Cycle 1</SelectItem>
          <SelectItem value="cycle2">Cycle 2</SelectItem>
          <SelectItem value="cycle3">Cycle 3</SelectItem>
        </SelectContent>
      </Select>
            {formErrors.observationCycle && <p className="text-sm text-red-500">{formErrors.observationCycle}</p>}
          </div>
          <ScaleRating
            label="Overall Fidelity Score"
            description="Implementation fidelity to program model and standards"
            name="fidelityScore"
            value={formData.fidelityScore}
            onChange={(value) => updateFormData('fidelityScore', value)}
            error={formErrors.fidelityScore}
            required
          />
        </div>
      </div>

      <Separator />

      {/* Stakeholder Assessment */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Stakeholder Engagement</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScaleRating
        label="Overall program quality"
        description="Comprehensive assessment of program implementation"
            name="program-quality"
            value={formData.programQuality}
            onChange={(value) => updateFormData('programQuality', value)}
          />
          <ScaleRating
        label="Teacher morale"
        description="Teacher satisfaction and motivation levels"
            name="teacher-morale"
            value={formData.teacherMorale}
            onChange={(value) => updateFormData('teacherMorale', value)}
          />
          <ScaleRating
        label="School admin cooperation"
        description="Level of administrative support and collaboration"
            name="admin-cooperation"
            value={formData.adminCooperation}
            onChange={(value) => updateFormData('adminCooperation', value)}
          />
        </div>
    </div>

      <Separator />

    <div className="space-y-2">
      <Label htmlFor="final-remarks">Final remarks and recommendations</Label>
        <p className="text-sm text-muted-foreground">Strategic insights and program-level recommendations</p>
      <Textarea 
        id="final-remarks" 
        placeholder="Provide final remarks, recommendations, and strategic insights..."
          value={formData.finalRemarks}
          onChange={(e) => updateFormData('finalRemarks', e.target.value)}
      />
    </div>
    </CardContent>
  </Card>
);

const TealObservations = ({ 
  isVisible, 
  formData, 
  updateFormData 
}: { 
  isVisible: boolean; 
  formData: FormData; 
  updateFormData: (field: string, value: any) => void; 
}) => {
  if (!isVisible) return null;

  return (
    <Card className="bg-blue-50/20 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/50">
      <CardHeader>
        <div className="flex items-center gap-4">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <div>
            <CardTitle className="text-xl">TEAL Observations</CardTitle>
            <CardDescription>Technology Enhanced Active Learning specific assessments</CardDescription>
  </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <YesNoDropdown
            label="Video Content Used?"
            description="Was instructional video content utilized during the lesson?"
            name="teal-video"
            value={formData.tealVideoContent}
            onChange={(value) => updateFormData('tealVideoContent', value)}
          />
          <YesNoDropdown
            label="Guiding Question Written on Board?"
            description="Was the main guiding question clearly displayed?"
            name="teal-guiding-question"
            value={formData.tealGuidingQuestion}
            onChange={(value) => updateFormData('tealGuidingQuestion', value)}
          />
          <YesNoDropdown
            label="Think-Pair-Share Conducted?"
            description="Were students engaged in think-pair-share activities?"
            name="teal-think-pair-share"
            value={formData.tealThinkPairShare}
            onChange={(value) => updateFormData('tealThinkPairShare', value)}
            allowComment={true}
            commentValue={formData.tealThinkPairShareComment}
            onCommentChange={(value) => updateFormData('tealThinkPairShareComment', value)}
          />
          <YesNoDropdown
            label="Collaborative Learning Activity Conducted?"
            description="Did students work together in structured collaborative activities?"
            name="teal-collaborative"
            value={formData.tealCollaborative}
            onChange={(value) => updateFormData('tealCollaborative', value)}
          />
        </div>
        <div className="max-w-md">
          <ScaleRating
            label="Student Engagement with Devices"
            description="How effectively did students engage with technology/devices?"
            name="teal-device-engagement"
            value={formData.tealDeviceEngagement?.toString()}
            onChange={(value) => updateFormData('tealDeviceEngagement', parseFloat(value))}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// Form validation functions
const validateForm = (formData: FormData, observerRole: ObserverRole): FormErrors => {
  const errors: FormErrors = {};
  
  // Universal required fields
  if (!formData.observerName?.trim()) errors.observerName = 'Observer name is required';
  if (!formData.observationDate) errors.observationDate = 'Observation date is required';
  if (!formData.schoolName?.trim()) errors.schoolName = 'School name is required';
  if (!formData.teacherName?.trim()) errors.teacherName = 'Teacher name is required';
  if (!formData.startTime) errors.startTime = 'Start time is required';
  if (!formData.endTime) errors.endTime = 'End time is required';
  if (!formData.lessonCode?.trim()) errors.lessonCode = 'Lesson code is required';
  if (!formData.projectName?.trim()) errors.projectName = 'Project name is required';
  
  // Role-specific validation
  switch (observerRole) {
    case 'principal':
      if (!formData.clearInstructions) errors.clearInstructions = 'This rating is required';
      if (!formData.studentEngagement) errors.studentEngagement = 'This rating is required';
      if (!formData.classroomDisplays) errors.classroomDisplays = 'This rating is required';
      break;
    case 'ece':
      if (!formData.childInitiated) errors.childInitiated = 'This response is required';
      if (!formData.environmentRating) errors.environmentRating = 'This rating is required';
      break;
    case 'school-officer':
      if (!formData.projectNameOfficer?.trim()) errors.projectNameOfficer = 'Project name is required';
      if (!formData.quarter) errors.quarter = 'Quarter selection is required';
      if (!formData.teachingEffectiveness) errors.teachingEffectiveness = 'This rating is required';
      break;
    case 'project-manager':
      if (!formData.observationCycle) errors.observationCycle = 'Observation cycle is required';
      if (!formData.fidelityScore) errors.fidelityScore = 'This rating is required';
      break;
  }
  
  return errors;
};

export const SecureObserverForm = ({ token }: SecureObserverFormProps) => {
  const [observerRole, setObserverRole] = useState<ObserverRole>('');
  const [showTealObservations, setShowTealObservations] = useState(false);
  const [linkData, setLinkData] = useState<any>(null); // Store link data for admin reference
  const [formData, setFormData] = useState<FormData>({
    observerRole: '',
    observerName: '',
    observationDate: '',
    schoolName: '',
    teacherName: '',
    startTime: '',
    endTime: '',
    projectName: '',
    teacherJoiningDate: '',
    teacherQualification: '',
    lessonCode: '',
    lessonPlanAvailable: '',
    projectAssociation: '',
    generalNotes: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const { toast } = useToast();
  const { validateToken, markAsUsed } = useSecureLinks();

  useEffect(() => {
    // Don't re-validate token if form has been successfully submitted
    if (isSubmitted) {
      return;
    }

    // Validate token using database
    const validateSecureToken = async () => {
      try {
        setIsValidating(true);
        
        if (!token || token.length < 8) {
          setIsValidToken(false);
          return;
        }

        // Use the database service to validate the token
        const validatedLinkData = await validateToken(token);
        
        if (!validatedLinkData) {
          setIsValidToken(false);
          return;
        }

        // Check if link is expired
        const now = new Date();
        if (now > validatedLinkData.expiry) {
          setIsValidToken(false);
          return;
        }

        // Check if link is still active (allow "used" status during form submission)
        if (validatedLinkData.status !== 'active' && validatedLinkData.status !== 'used') {
          setIsValidToken(false);
          return;
        }

        // Store link data for later use
        setLinkData(validatedLinkData);

        // Set the observer role from the validated token
        const validatedRole = validatedLinkData.observerRole as ObserverRole;
        setObserverRole(validatedRole);
        setFormData(prev => ({ ...prev, observerRole: validatedRole }));
        setIsValidToken(true);
      } catch (error: any) {
        console.error('Token validation error:', error);
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateSecureToken();
  }, [token, validateToken, isSubmitted]);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmitReport = async () => {
    setSubmitError(null);
    
    // Update form data with observer role and TEAL observations
    const completeFormData = { ...formData, observerRole, showTealObservations };
    
    // Validate form
    const errors = validateForm(completeFormData, observerRole);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      // Scroll to first error field
      const firstErrorField = document.querySelector('.border-red-500');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // Mark the link as used in the database
      await markAsUsed(token, completeFormData.observerName || 'Anonymous Observer');
      
      // Ensure we have valid link data and created by user ID
      if (!linkData || !linkData.createdBy) {
        throw new Error('Invalid secure link data. Please contact the administrator for a new link.');
      }
      
      // Validate that the createdBy is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(linkData.createdBy)) {
        throw new Error('Invalid user ID format in secure link. Please contact the administrator.');
      }
      
      // Create the report data structure for database storage
      const reportForDatabase = {
        observer_name: completeFormData.observerName || 'N/A',
        observer_role: completeFormData.observerRole || 'N/A',
        school_name: completeFormData.schoolName || 'N/A',
        teacher_name: completeFormData.teacherName || 'N/A',
        observation_date: completeFormData.observationDate || new Date().toISOString().split('T')[0],
        start_time: completeFormData.startTime || 'N/A',
        end_time: completeFormData.endTime || 'N/A',
        lesson_code: completeFormData.lessonCode || 'N/A',
        project_name: completeFormData['projectName'] || completeFormData['projectNameOfficer'] || 'N/A',
        overall_score: Math.round(
          (
            (completeFormData['clearInstructions'] ? parseInt(completeFormData['clearInstructions']) * 20 : 60) * 0.25 +
            (completeFormData['studentEngagement'] ? parseInt(completeFormData['studentEngagement']) * 20 : 70) * 0.30 +
            (completeFormData['classroomDisplays'] ? parseInt(completeFormData['classroomDisplays']) * 20 : 65) * 0.20 +
            70 * 0.15 +
            (completeFormData['fidelityScore'] ? parseInt(completeFormData['fidelityScore']) * 20 : 80) * 0.10
          )
        ),
        status: 'completed' as const,
        form_data: { ...completeFormData, showTealObservations: completeFormData.showTealObservations },
        submitted_by: linkData.createdBy, // Use the admin ID who created the secure link
        show_teal_observations: completeFormData.showTealObservations || false,
      };
      
      // Submit the form data directly to the service
      await ObservationReportsService.createReport(reportForDatabase);
      
      setIsSubmitted(true);
      toast({
        title: "Report Submitted Successfully",
        description: "Your observation report has been submitted and will be reviewed by the administration.",
      });
      
      // Reset form
      setFormData({
        observerRole: '',
        observerName: '',
        observationDate: '',
        schoolName: '',
        teacherName: '',
        startTime: '',
        endTime: '',
        projectName: '',
        teacherJoiningDate: '',
        teacherQualification: '',
        lessonCode: '',
        lessonPlanAvailable: '',
        projectAssociation: '',
        generalNotes: '',
      });
      setFormErrors({});
    } catch (error: any) {
      console.error('Failed to submit report:', error);
      setSubmitError(error.message || 'Failed to submit report. Please try again.');
      toast({
        title: "Submission Error",
        description: error.message || "There was an error submitting your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAssessmentForm = () => {
    switch (observerRole) {
      case 'principal':
        return <PrincipalAssessment formData={formData} updateFormData={updateFormData} formErrors={formErrors} />;
      case 'ece':
        return <EceObserverAssessment formData={formData} updateFormData={updateFormData} formErrors={formErrors} />;
      case 'school-officer':
        return <SchoolOfficerAssessment formData={formData} updateFormData={updateFormData} formErrors={formErrors} />;
      case 'project-manager':
        return <ProjectManagerAssessment formData={formData} updateFormData={updateFormData} formErrors={formErrors} />;
      default:
        return null;
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mb-4 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20 inline-block">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Validating Secure Link</h2>
            <p className="text-muted-foreground">
              Please wait while we verify your secure link...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mb-4 p-3 rounded-full bg-red-100 dark:bg-red-900/20 inline-block">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-red-600">Invalid or Expired Link</h2>
            <p className="text-muted-foreground">
              This secure link is invalid or has expired. Please contact the administrator for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mb-4 p-3 rounded-full bg-green-100 dark:bg-green-900/20 inline-block">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-green-600">Report Submitted Successfully!</h2>
            <p className="text-muted-foreground">
              Thank you for your observation report. It has been submitted and will be reviewed by the administration.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700">
              <Lock className="w-3 h-3 mr-1" />
              Secure Form
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {observerRole.charAt(0).toUpperCase() + observerRole.slice(1).replace('-', ' ')} Observation Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Please complete all required fields to submit your observation report.
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        {/* Observation Details */}
        {observerRole && <ObservationDetails formData={formData} updateFormData={updateFormData} formErrors={formErrors} />}

        {/* TEAL Observations Toggle */}
        {observerRole && (
          <Card className="bg-blue-50/20 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <div>
                    <Label htmlFor="teal-toggle" className="text-base font-medium">
                      Include TEAL Observations
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Add Technology Enhanced Active Learning specific assessments
                    </p>
              </div>
              </div>
                <Switch
                  id="teal-toggle"
                  checked={showTealObservations}
                  onCheckedChange={setShowTealObservations}
              />
            </div>
          </CardContent>
        </Card>
        )}

        {/* TEAL Observations Section */}
        <TealObservations 
          isVisible={showTealObservations} 
          formData={formData} 
          updateFormData={updateFormData} 
        />

        {/* Dynamic Assessment Form based on Observer Role */}
        {observerRole && renderAssessmentForm()}

        {/* Submit Section */}
        {observerRole && (
          <div className="space-y-4 pt-4">
            {/* Error Alert */}
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

        {/* Submit Button */}
        <div className="flex justify-center pb-8">
          <Button 
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]"
                onClick={handleSubmitReport}
                disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting Report...
              </>
            ) : (
              <>
                    <Check className="w-5 h-5 mr-2" />
                    Submit Observation Report
              </>
            )}
          </Button>
        </div>
          </div>
        )}
      </div>
    </div>
  );
}; 