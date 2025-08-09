import React, { useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContentLoader } from '@/components/ContentLoader';
import { toast } from 'sonner';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { useObservationReports } from '@/contexts/ObservationReportsContext';
import {
  User,
  ClipboardList,
  Star,
  Home,
  TrendingUp,
  Link,
  Eye,
  Check,
  Settings,
  BookOpen,
  Users,
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { TagInput, YesNoDropdown, ScaleRating } from './ObservationReportHelpers';

const SecureLinkManagement = lazy(() => import('./SecureLinkManagement').then(m => ({ default: m.SecureLinkManagement })));
const PastReportsView = lazy(() => import('./PastReportsView').then(m => ({ default: m.PastReportsView })));
const PerformanceReport = lazy(() => import('./PerformanceReport').then(m => ({ default: m.PerformanceReport })));
const PrincipalAssessment = lazy(() => import('./PrincipalAssessment').then(m => ({ default: m.PrincipalAssessment })));
const EceObserverAssessment = lazy(() => import('./EceObserverAssessment').then(m => ({ default: m.EceObserverAssessment })));
const SchoolOfficerAssessment = lazy(() => import('./SchoolOfficerAssessment').then(m => ({ default: m.SchoolOfficerAssessment })));
const ProjectManagerAssessment = lazy(() => import('./ProjectManagerAssessment').then(m => ({ default: m.ProjectManagerAssessment })));

type ObserverRole = 'principal' | 'ece' | 'school-officer' | 'project-manager' | '';
type ViewMode = 'reporting' | 'secureLinks' | 'pastReports' | 'performanceReport';

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

interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  message: string;
}

// Helper Components for consistency
const ObserverInformation = ({ observerRole, onRoleChange }) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader className="flex flex-row items-center gap-4">
      <User className="w-6 h-6 text-green-600" />
      <div>
        <CardTitle className="text-xl">Observer Information</CardTitle>
        <CardDescription>
          Select your role and provide basic information about the observation
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent>
      <div className="max-w-md mx-auto">
        <Label htmlFor="observer-role" className="text-center block mb-2 font-semibold">
          Observer Role *
        </Label>
        <Select value={observerRole} onValueChange={onRoleChange}>
          <SelectTrigger id="observer-role" className="h-12 text-base">
            <SelectValue placeholder="Select your observer role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="principal">Principal</SelectItem>
            <SelectItem value="ece">ECE Observer</SelectItem>
            <SelectItem value="school-officer">School Officer</SelectItem>
            <SelectItem value="project-manager">Project Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {observerRole && (
        <div className="text-center mt-6">
          <Badge variant="outline" className="border-green-300 bg-white text-green-800 dark:bg-green-950 dark:text-green-100 dark:border-green-700">
            <Check className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
            Role-specific questionnaire will appear below
          </Badge>
        </div>
      )}
    </CardContent>
  </Card>
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
              className="[&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:dark:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher-qualification">Teacher Qualification</Label>
            <p className="text-sm text-muted-foreground">Educational background and certifications</p>
            <Select>
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
          />
          <TagInput 
            label="Project Association"
            description="Associated programs and initiatives"
            placeholder="e.g., ECE, TEAL, Early Grade Reading"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="general-notes">General Notes</Label>
        <p className="text-sm text-muted-foreground">Any additional observations or context</p>
        <Textarea id="general-notes" placeholder="Add any general observations or notes..." />
      </div>
    </CardContent>
  </Card>
);

const TealObservations = ({ isVisible }: { isVisible: boolean }) => {
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
          />
          <YesNoDropdown
            label="Guiding Question Written on Board?"
            description="Was the main guiding question clearly displayed?"
            name="teal-guiding-question"
          />
          <YesNoDropdown
            label="Think-Pair-Share Conducted?"
            description="Were students engaged in think-pair-share activities?"
            name="teal-think-pair-share"
            allowComment={true}
          />
          <YesNoDropdown
            label="Collaborative Learning Activity Conducted?"
            description="Did students work together in structured collaborative activities?"
            name="teal-collaborative"
          />
        </div>
        <div className="max-w-md">
          <ScaleRating
            label="Student Engagement with Devices"
            description="How effectively did students engage with technology/devices?"
            name="teal-device-engagement"
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

// API functions - Updated to use database
const submitObservationReport = async (
  formData: FormData, 
  addReport: (report: any) => Promise<void>
): Promise<any> => {
  // Create the report data structure for database storage
  const reportForStorage = {
    id: '', // Will be generated by database
    observerName: formData.observerName || 'N/A',
    observerRole: formData.observerRole || 'N/A',
    schoolName: formData.schoolName || 'N/A',
    teacherName: formData.teacherName || 'N/A',
    observationDate: formData.observationDate || new Date().toISOString().split('T')[0],
    startTime: formData.startTime || 'N/A',
    endTime: formData.endTime || 'N/A',
    lessonCode: formData.lessonCode || 'N/A',
    projectName: formData.projectName || formData.projectNameOfficer || 'N/A',
    createdAt: new Date().toISOString(),
    overallScore: Math.round(
      (
        (formData.clearInstructions ? parseInt(formData.clearInstructions) * 20 : 60) * 0.25 +
        (formData.studentEngagement ? parseInt(formData.studentEngagement) * 20 : 70) * 0.30 +
        (formData.classroomDisplays ? parseInt(formData.classroomDisplays) * 20 : 65) * 0.20 +
        70 * 0.15 +
        (formData.fidelityScore ? parseInt(formData.fidelityScore) * 20 : 80) * 0.10
      )
    ),
    status: 'completed' as const,
    formData: { ...formData, showTealObservations: formData.showTealObservations }, // Store complete form data for detailed report view
  };
  
  try {
    // Save to database via context
    await addReport(reportForStorage);
    
    // Return success response with expected structure for PerformanceReport
    return {
      success: true,
      id: reportForStorage.id,
      message: 'Report submitted successfully',
      data: {
        // Basic observation info
        reportId: reportForStorage.id,
        submissionDate: new Date().toISOString(),
        
        // Observer information
        observer: {
          name: formData.observerName || 'Unknown Observer',
          role: formData.observerRole || 'Unknown Role',
          id: `observer-${Date.now()}`
        },
        
        // Observation details
        school: {
          name: formData.schoolName || 'Unknown School',
          location: 'Location not specified'
        },
        
        teacher: {
          name: formData.teacherName || 'Unknown Teacher',
          qualification: formData.teacherQualification || 'Not specified',
          joiningDate: formData.teacherJoiningDate || 'Not specified'
        },
        
        lesson: {
          code: formData.lessonCode || 'Not specified',
          date: formData.observationDate || 'Not specified',
          startTime: formData.startTime || 'Not specified',
          endTime: formData.endTime || 'Not specified',
          subject: 'General Instruction'
        },
        
        project: {
          name: formData.projectName || formData.projectNameOfficer || 'Not specified',
          association: formData.projectAssociation || 'Not specified',
          quarter: formData.quarter || 'Not specified'
        },
        
        // Performance categories (calculated data for display)
        categories: {
          instruction: {
            score: formData.clearInstructions ? parseInt(formData.clearInstructions) * 20 : 60,
            weight: 25,
            trend: 'up',
            items: [
              { name: 'Clear Instructions', score: formData.clearInstructions ? parseInt(formData.clearInstructions) * 20 : 60 },
              { name: 'Lesson Adherence', score: formData.lessonAdherence ? parseInt(formData.lessonAdherence) * 20 : 60 }
            ]
          },
          engagement: {
            score: formData.studentEngagement ? parseInt(formData.studentEngagement) * 20 : 70,
            weight: 30,
            trend: 'up',
            items: [
              { name: 'Student Engagement', score: formData.studentEngagement ? parseInt(formData.studentEngagement) * 20 : 70 },
              { name: 'Emotional Engagement', score: 75 }
            ]
          },
          environment: {
            score: formData.classroomDisplays ? parseInt(formData.classroomDisplays) * 20 : 65,
            weight: 20,
            trend: 'stable',
            items: [
              { name: 'Classroom Displays', score: formData.classroomDisplays ? parseInt(formData.classroomDisplays) * 20 : 65 },
              { name: 'Learning Environment', score: formData.environmentRating ? 80 : 65 }
            ]
          },
          resources: {
            score: 70,
            weight: 15,
            trend: 'up',
            items: [
              { name: 'Material Usage', score: 70 },
              { name: 'Technology Integration', score: 75 }
            ]
          },
          fidelity: {
            score: formData.fidelityScore ? parseInt(formData.fidelityScore) * 20 : 80,
            weight: 10,
            trend: 'up',
            items: [
              { name: 'Program Fidelity', score: formData.fidelityScore ? parseInt(formData.fidelityScore) * 20 : 80 },
              { name: 'Implementation Quality', score: 85 }
            ]
          }
        },
        
        // Overall metrics
        overall: {
          score: reportForStorage.overallScore,
          grade: reportForStorage.overallScore >= 80 ? 'A' : reportForStorage.overallScore >= 70 ? 'B+' : reportForStorage.overallScore >= 60 ? 'B' : 'C',
          status: reportForStorage.overallScore >= 70 ? 'meets_expectations' : 'needs_improvement'
        },
        
        // Include showTealObservations for UI control
        showTealObservations: formData.showTealObservations,
        
        // Raw form data for reference
        formData: formData
      }
    };
  } catch (error: any) {
    console.error('Error submitting observation report:', error);
    throw new Error(error.message || 'Failed to submit observation report to database');
  }
};

export const ObservationReports = () => {
  const { user } = useAuth();
  const { addReport } = useObservationReports();
  const [observerRole, setObserverRole] = useState<ObserverRole>('');
  const [viewMode, setViewMode] = useState<ViewMode>('reporting');
  const [showTealObservations, setShowTealObservations] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
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

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmitReport = async () => {
    setSubmitError(null);
    
    // Update form data with observer role
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
      const result = await submitObservationReport(completeFormData, addReport);
      
      toast.success('Observation report submitted successfully!');
      setSubmittedData(result);
      setViewMode('performanceReport');
      
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
      toast.error('Failed to submit report. Please try again.');
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

  if (viewMode === 'secureLinks') {
    return <SecureLinkManagement onBack={() => setViewMode('reporting')} />;
  }

  if (viewMode === 'pastReports') {
    return <PastReportsView 
      onBack={() => setViewMode('reporting')} 
      onViewReport={(reportId) => {
        // Set the report data and switch to performance report view
        setSubmittedData({ reportId });
        setViewMode('performanceReport');
      }}
    />;
  }

  if (viewMode === 'performanceReport') {
    return <PerformanceReport 
      observationData={submittedData} 
      onBack={() => setViewMode('reporting')} 
    />;
  }

  return (
    <div className="space-y-8 mx-auto p-4">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 max-w-2xl">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  Field Audit & Compliance Assessment
                </h1>
                <p className="text-lg text-muted-foreground font-light pr-8">
                  Capture systematic observations to drive data-informed curriculum improvements and performance tracking
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0 ml-8">
              <Button 
                variant="outline" 
                onClick={() => setViewMode('secureLinks')}
                className="h-10 px-6 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
              >
                <Link className="w-4 h-4 mr-2" />
                Manage Secure Links
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setViewMode('pastReports')}
                className="h-10 px-6 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Past Reports
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-blue-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Observers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">
              +5% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-indigo-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">
              -15% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-emerald-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TEAL Assessments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">892</div>
            <p className="text-xs text-muted-foreground">
              +18% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Observer Information Form */}
      <ObserverInformation observerRole={observerRole} onRoleChange={setObserverRole} />

      {/* Universal Fields - Observation Details */}
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
      <TealObservations isVisible={showTealObservations} />

      {/* Dynamic Assessment Form based on Observer Role */}
      {observerRole && (
        <Suspense fallback={<ContentLoader />}>
          {renderAssessmentForm()}
        </Suspense>
      )}

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
          <div className="flex justify-end">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5" 
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
  );
}; 