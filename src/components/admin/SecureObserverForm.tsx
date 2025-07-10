import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle, Send, Shield, Lock } from 'lucide-react';

interface SecureObserverFormProps {
  token: string;
}

type ObserverRole = 'Principal' | 'ECE Observer' | 'School Officer' | 'Project Manager';

interface FormData {
  observerName: string;
  observationDate: string;
  schoolName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  generalNotes: string;
  assessmentData: Record<string, any>;
}

const AssessmentQuestion = ({ label, description, children }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    {children}
  </div>
);

const YesNoQuestion = ({ label, description, value, onChange }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <RadioGroup value={value} onValueChange={onChange} className="flex items-center gap-6 pt-2">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="yes" id={`${label}-yes`} />
        <Label htmlFor={`${label}-yes`}>Yes</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="no" id={`${label}-no`} />
        <Label htmlFor={`${label}-no`}>No</Label>
      </div>
    </RadioGroup>
  </div>
);

const PrincipalAssessmentForm = ({ data, onChange }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <AssessmentQuestion
        label="Teacher gives clear instructions"
        description="Rate how clearly the teacher communicates lesson objectives and tasks"
      >
        <Select value={data.clearInstructions} onValueChange={(value) => onChange('clearInstructions', value)}>
          <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="1">1</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>

      <AssessmentQuestion
        label="Students are engaged during lesson"
        description="Assess student participation and attention levels"
      >
        <Select value={data.studentEngagement} onValueChange={(value) => onChange('studentEngagement', value)}>
          <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="1">1</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
    </div>

    <AssessmentQuestion
      label="Classroom displays are age-appropriate"
      description="Evaluate the relevance and quality of classroom materials"
    >
      <Select value={data.classroomDisplays} onValueChange={(value) => onChange('classroomDisplays', value)}>
        <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="5">5</SelectItem>
          <SelectItem value="4">4</SelectItem>
          <SelectItem value="3">3</SelectItem>
          <SelectItem value="2">2</SelectItem>
          <SelectItem value="1">1</SelectItem>
        </SelectContent>
      </Select>
    </AssessmentQuestion>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
      <YesNoQuestion
        label="Use of learning materials"
        description="Were appropriate learning materials utilized during the lesson?"
        value={data.learningMaterials}
        onChange={(value) => onChange('learningMaterials', value)}
      />
      <YesNoQuestion
        label="Was the lesson plan followed?"
        description="Did the teacher adhere to the planned curriculum structure?"
        value={data.lessonPlanFollowed}
        onChange={(value) => onChange('lessonPlanFollowed', value)}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="principal-concerns">Any immediate concerns?</Label>
      <Textarea 
        id="principal-concerns" 
        placeholder="Describe any immediate concerns or issues observed..."
        value={data.concerns}
        onChange={(e) => onChange('concerns', e.target.value)}
      />
    </div>
  </div>
);

const ECEObserverAssessmentForm = ({ data, onChange }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <AssessmentQuestion
        label="Teacher gives clear instructions"
        description="Rate how clearly the teacher communicates lesson objectives and tasks"
      >
        <Select value={data.clearInstructions} onValueChange={(value) => onChange('clearInstructions', value)}>
          <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="1">1</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>

      <AssessmentQuestion
        label="Students are engaged during lesson"
        description="Assess student participation and attention levels"
      >
        <Select value={data.studentEngagement} onValueChange={(value) => onChange('studentEngagement', value)}>
          <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="1">1</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
    </div>

    <AssessmentQuestion
      label="Classroom displays are age-appropriate"
      description="Evaluate the relevance and quality of classroom materials"
    >
      <Select value={data.classroomDisplays} onValueChange={(value) => onChange('classroomDisplays', value)}>
        <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="5">5</SelectItem>
          <SelectItem value="4">4</SelectItem>
          <SelectItem value="3">3</SelectItem>
          <SelectItem value="2">2</SelectItem>
          <SelectItem value="1">1</SelectItem>
        </SelectContent>
      </Select>
    </AssessmentQuestion>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
      <YesNoQuestion
        label="Use of learning materials"
        description="Were appropriate learning materials utilized during the lesson?"
        value={data.learningMaterials}
        onChange={(value) => onChange('learningMaterials', value)}
      />
      <YesNoQuestion
        label="Was the lesson plan followed?"
        description="Did the teacher adhere to the planned curriculum structure?"
        value={data.lessonPlanFollowed}
        onChange={(value) => onChange('lessonPlanFollowed', value)}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="ece-concerns">Any immediate concerns?</Label>
      <Textarea 
        id="ece-concerns" 
        placeholder="Describe any immediate concerns or issues observed..."
        value={data.concerns}
        onChange={(e) => onChange('concerns', e.target.value)}
      />
    </div>
  </div>
);

const SchoolOfficerAssessmentForm = ({ data, onChange }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="project-name">Project Name *</Label>
        <Input 
          id="project-name" 
          placeholder="Enter project name..."
          value={data.projectName}
          onChange={(e) => onChange('projectName', e.target.value)}
        />
      </div>
      <AssessmentQuestion label="Quarter *" description="Select the current quarter">
        <Select value={data.quarter} onValueChange={(value) => onChange('quarter', value)}>
          <SelectTrigger><SelectValue placeholder="Select quarter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="q1">Q1</SelectItem>
            <SelectItem value="q2">Q2</SelectItem>
            <SelectItem value="q3">Q3</SelectItem>
            <SelectItem value="q4">Q4</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
      <AssessmentQuestion
        label="Teaching effectiveness"
        description="Overall quality of instruction delivery"
      >
        <Select value={data.teachingEffectiveness} onValueChange={(value) => onChange('teachingEffectiveness', value)}>
          <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="1">1</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
      <AssessmentQuestion
        label="School cleanliness"
        description="Maintenance and hygiene standards of the facility"
      >
        <Select value={data.schoolCleanliness} onValueChange={(value) => onChange('schoolCleanliness', value)}>
          <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="1">1</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
      <YesNoQuestion
        label="Availability of materials"
        description="Are necessary teaching and learning materials available?"
        value={data.materialsAvailable}
        onChange={(value) => onChange('materialsAvailable', value)}
      />
      <YesNoQuestion
        label="Teacher attendance"
        description="Is teacher attendance satisfactory?"
        value={data.teacherAttendance}
        onChange={(value) => onChange('teacherAttendance', value)}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="summary-comments">Summary comments</Label>
      <Textarea 
        id="summary-comments" 
        placeholder="Add summary comments about the observation..."
        value={data.summaryComments}
        onChange={(e) => onChange('summaryComments', e.target.value)}
      />
    </div>
  </div>
);

const ProjectManagerAssessmentForm = ({ data, onChange }) => (
  <div className="space-y-6">
    <AssessmentQuestion label="Observation Cycle *" description="Select the current observation cycle">
      <Select value={data.observationCycle} onValueChange={(value) => onChange('observationCycle', value)}>
        <SelectTrigger><SelectValue placeholder="Select observation cycle" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="cycle1">Cycle 1</SelectItem>
          <SelectItem value="cycle2">Cycle 2</SelectItem>
          <SelectItem value="cycle3">Cycle 3</SelectItem>
        </SelectContent>
      </Select>
    </AssessmentQuestion>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <AssessmentQuestion
        label="Overall program quality"
        description="Comprehensive assessment of program implementation"
      >
        <Select value={data.programQuality} onValueChange={(value) => onChange('programQuality', value)}>
          <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="1">1</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
      <AssessmentQuestion
        label="Teacher morale"
        description="Teacher satisfaction and motivation levels"
      >
        <Select value={data.teacherMorale} onValueChange={(value) => onChange('teacherMorale', value)}>
          <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="1">1</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
      <AssessmentQuestion
        label="School admin cooperation"
        description="Level of administrative support and collaboration"
      >
        <Select value={data.adminCooperation} onValueChange={(value) => onChange('adminCooperation', value)}>
          <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="1">1</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
    </div>

    <div className="space-y-2">
      <Label htmlFor="final-remarks">Final remarks and recommendations</Label>
      <Textarea 
        id="final-remarks" 
        placeholder="Provide final remarks, recommendations, and strategic insights..."
        value={data.finalRemarks}
        onChange={(e) => onChange('finalRemarks', e.target.value)}
      />
    </div>
  </div>
);

export const SecureObserverForm = ({ token }: SecureObserverFormProps) => {
  const [observerRole, setObserverRole] = useState<ObserverRole | null>(null);
  const [formData, setFormData] = useState<FormData>({
    observerName: '',
    observationDate: '',
    schoolName: '',
    teacherName: '',
    startTime: '',
    endTime: '',
    generalNotes: '',
    assessmentData: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Validate token and get role information
    const validateToken = async () => {
      try {
        setIsValidating(true);
        
        // Mock validation - in real implementation, this would make an API call
        // For now, we'll simulate a more realistic validation by checking token format
        if (token && token.length >= 8) {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock different roles based on token patterns (for demo purposes)
          // In real implementation, this would query the database
          const tokenHash = token.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          
          const roleIndex = Math.abs(tokenHash) % 4;
          const roles: ObserverRole[] = ['Principal', 'ECE Observer', 'School Officer', 'Project Manager'];
          
          setObserverRole(roles[roleIndex]);
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
        }
      } catch (error) {
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleFormDataChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAssessmentChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      assessmentData: {
        ...prev.assessmentData,
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const requiredFields = ['observerName', 'observationDate', 'schoolName', 'teacherName', 'startTime', 'endTime'];
    
    for (const field of requiredFields) {
      if (!formData[field]) {
        toast({
          title: "Validation Error",
          description: `Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`,
          variant: "destructive",
        });
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      // Mock submission - in real implementation, this would make an API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful submission
      setIsSubmitted(true);
      toast({
        title: "Report Submitted Successfully",
        description: "Your observation report has been submitted and will be reviewed by the administration.",
      });
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "There was an error submitting your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAssessmentForm = () => {
    switch (observerRole) {
      case 'Principal':
        return <PrincipalAssessmentForm data={formData.assessmentData} onChange={handleAssessmentChange} />;
      case 'ECE Observer':
        return <ECEObserverAssessmentForm data={formData.assessmentData} onChange={handleAssessmentChange} />;
      case 'School Officer':
        return <SchoolOfficerAssessmentForm data={formData.assessmentData} onChange={handleAssessmentChange} />;
      case 'Project Manager':
        return <ProjectManagerAssessmentForm data={formData.assessmentData} onChange={handleAssessmentChange} />;
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
            {observerRole} Observation Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Please complete all required fields to submit your observation report.
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Observer Information */}
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Observer Information</CardTitle>
            <CardDescription>
              Basic information about the observation session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="observer-name">Observer Name *</Label>
                <Input 
                  id="observer-name" 
                  placeholder="Enter your full name..."
                  value={formData.observerName}
                  onChange={(e) => handleFormDataChange('observerName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observation-date">Observation Date *</Label>
                <Input 
                  id="observation-date" 
                  type="date"
                  value={formData.observationDate}
                  onChange={(e) => handleFormDataChange('observationDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-name">School Name *</Label>
                <Input 
                  id="school-name" 
                  placeholder="Enter school name..."
                  value={formData.schoolName}
                  onChange={(e) => handleFormDataChange('schoolName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher-name">Teacher Name *</Label>
                <Input 
                  id="teacher-name" 
                  placeholder="Enter teacher name..."
                  value={formData.teacherName}
                  onChange={(e) => handleFormDataChange('teacherName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time *</Label>
                <Input 
                  id="start-time" 
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleFormDataChange('startTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time *</Label>
                <Input 
                  id="end-time" 
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleFormDataChange('endTime', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="general-notes">General Notes</Label>
              <Textarea 
                id="general-notes" 
                placeholder="Add any general observations or notes..."
                value={formData.generalNotes}
                onChange={(e) => handleFormDataChange('generalNotes', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Assessment Form */}
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">{observerRole} Assessment</CardTitle>
            <CardDescription>
              Complete the assessment questions below
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderAssessmentForm()}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center pb-8">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}; 