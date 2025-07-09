import { useState } from 'react';
import { SecureLinkManagement } from './SecureLinkManagement';
import { PastReportsView } from './PastReportsView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Building,
  Calendar,
  Clock,
  ClipboardList,
  Star,
  Home,
  TrendingUp,
  Link,
  Eye,
  Check,
} from 'lucide-react';

type ObserverRole = 'principal' | 'ece' | 'school-officer' | 'project-manager' | '';
type ViewMode = 'reporting' | 'secureLinks' | 'pastReports';

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
          <Badge variant="outline" className="border-green-300 bg-white">
            <Check className="w-4 h-4 mr-2 text-green-600" />
            Role-specific questionnaire will appear below
          </Badge>
        </div>
      )}
    </CardContent>
  </Card>
);

const ObservationDetails = () => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader className="flex flex-row items-center gap-4">
      <ClipboardList className="w-6 h-6 text-green-600" />
      <div>
        <CardTitle className="text-xl">Observation Details</CardTitle>
        <CardDescription>Basic information about the observation session</CardDescription>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="observer-name">Observer Name *</Label>
          <Input id="observer-name" placeholder="Enter your full name..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="observation-date">Observation Date *</Label>
          <Input id="observation-date" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="school-name">School Name *</Label>
          <Input id="school-name" placeholder="Enter school name..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-name">Teacher Name *</Label>
          <Input id="teacher-name" placeholder="Enter teacher name..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="start-time">Start Time *</Label>
          <Input id="start-time" type="time" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-time">End Time *</Label>
          <Input id="end-time" type="time" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="general-notes">General Notes</Label>
        <Textarea id="general-notes" placeholder="Add any general observations or notes..." />
      </div>
    </CardContent>
  </Card>
);

const AssessmentQuestion = ({ label, description, children }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    {children}
  </div>
);

const YesNoQuestion = ({ label, description }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <RadioGroup className="flex items-center gap-6 pt-2">
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

const PrincipalAssessment = () => (
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
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AssessmentQuestion
          label="Teacher gives clear instructions"
          description="Rate how clearly the teacher communicates lesson objectives and tasks"
        >
          <Select>
            <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Excellent</SelectItem>
              <SelectItem value="4">Good</SelectItem>
              <SelectItem value="3">Average</SelectItem>
              <SelectItem value="2">Fair</SelectItem>
              <SelectItem value="1">Poor</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>

        <AssessmentQuestion
          label="Students are engaged during lesson"
          description="Assess student participation and attention levels"
        >
          <Select>
            <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Excellent</SelectItem>
              <SelectItem value="4">Good</SelectItem>
              <SelectItem value="3">Average</SelectItem>
              <SelectItem value="2">Fair</SelectItem>
              <SelectItem value="1">Poor</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
      </div>

      <AssessmentQuestion
        label="Classroom displays are age-appropriate"
        description="Evaluate the relevance and quality of classroom materials"
      >
        <Select>
          <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Excellent</SelectItem>
            <SelectItem value="4">Good</SelectItem>
            <SelectItem value="3">Average</SelectItem>
            <SelectItem value="2">Fair</SelectItem>
            <SelectItem value="1">Poor</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <YesNoQuestion
          label="Use of learning materials"
          description="Were appropriate learning materials utilized during the lesson?"
        />
        <YesNoQuestion
          label="Was the lesson plan followed?"
          description="Did the teacher adhere to the planned curriculum structure?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="immediate-concerns">Any immediate concerns?</Label>
        <Textarea id="immediate-concerns" placeholder="Describe any immediate concerns or issues observed..." />
      </div>
    </CardContent>
  </Card>
);

const EceObserverAssessment = () => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader>
      <div className="flex items-center gap-4">
        <Star className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">ECE Observer Assessment</CardTitle>
          <CardDescription>Evaluate teaching effectiveness and classroom environment</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* This component can be identical to PrincipalAssessment or customized */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AssessmentQuestion
          label="Teacher gives clear instructions"
          description="Rate how clearly the teacher communicates lesson objectives and tasks"
        >
          <Select>
            <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Excellent</SelectItem>
              <SelectItem value="4">Good</SelectItem>
              <SelectItem value="3">Average</SelectItem>
              <SelectItem value="2">Fair</SelectItem>
              <SelectItem value="1">Poor</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>

        <AssessmentQuestion
          label="Students are engaged during lesson"
          description="Assess student participation and attention levels"
        >
          <Select>
            <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Excellent</SelectItem>
              <SelectItem value="4">Good</SelectItem>
              <SelectItem value="3">Average</SelectItem>
              <SelectItem value="2">Fair</SelectItem>
              <SelectItem value="1">Poor</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
      </div>

      <AssessmentQuestion
        label="Classroom displays are age-appropriate"
        description="Evaluate the relevance and quality of classroom materials"
      >
        <Select>
          <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Excellent</SelectItem>
            <SelectItem value="4">Good</SelectItem>
            <SelectItem value="3">Average</SelectItem>
            <SelectItem value="2">Fair</SelectItem>
            <SelectItem value="1">Poor</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <YesNoQuestion
          label="Use of learning materials"
          description="Were appropriate learning materials utilized during the lesson?"
        />
        <YesNoQuestion
          label="Was the lesson plan followed?"
          description="Did the teacher adhere to the planned curriculum structure?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ece-concerns">Any immediate concerns?</Label>
        <Textarea id="ece-concerns" placeholder="Describe any immediate concerns or issues observed..." />
      </div>
    </CardContent>
  </Card>
);

const SchoolOfficerAssessment = () => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader>
      <div className="flex items-center gap-4">
        <Home className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">School Officer Assessment</CardTitle>
          <CardDescription>Evaluate project implementation and school operations</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="project-name">Project Name *</Label>
          <Input id="project-name" placeholder="Enter project name..." />
        </div>
        <AssessmentQuestion label="Quarter *" description="Select the current quarter">
          <Select>
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
          <Select>
            <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Excellent</SelectItem>
              <SelectItem value="4">Good</SelectItem>
              <SelectItem value="3">Average</SelectItem>
              <SelectItem value="2">Fair</SelectItem>
              <SelectItem value="1">Poor</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
        <AssessmentQuestion
          label="School cleanliness"
          description="Maintenance and hygiene standards of the facility"
        >
          <Select>
            <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Excellent</SelectItem>
              <SelectItem value="4">Good</SelectItem>
              <SelectItem value="3">Average</SelectItem>
              <SelectItem value="2">Fair</SelectItem>
              <SelectItem value="1">Poor</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <YesNoQuestion
          label="Availability of materials"
          description="Are necessary teaching and learning materials available?"
        />
        <YesNoQuestion
          label="Teacher attendance"
          description="Is teacher attendance satisfactory?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary-comments">Summary comments</Label>
        <Textarea id="summary-comments" placeholder="Add summary comments about the observation..." />
      </div>
    </CardContent>
  </Card>
);

const ProjectManagerAssessment = () => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader>
      <div className="flex items-center gap-4">
        <TrendingUp className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">Project Manager Assessment</CardTitle>
          <CardDescription>Evaluate overall program quality and stakeholder cooperation</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <AssessmentQuestion label="Observation Cycle *" description="Select the current observation cycle">
        <Select>
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
          <Select>
            <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Excellent</SelectItem>
              <SelectItem value="4">Good</SelectItem>
              <SelectItem value="3">Average</SelectItem>
              <SelectItem value="2">Fair</SelectItem>
              <SelectItem value="1">Poor</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
        <AssessmentQuestion
          label="Teacher morale"
          description="Teacher satisfaction and motivation levels"
        >
          <Select>
            <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Excellent</SelectItem>
              <SelectItem value="4">Good</SelectItem>
              <SelectItem value="3">Average</SelectItem>
              <SelectItem value="2">Fair</SelectItem>
              <SelectItem value="1">Poor</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
        <AssessmentQuestion
          label="School admin cooperation"
          description="Level of administrative support and collaboration"
        >
          <Select>
            <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Excellent</SelectItem>
              <SelectItem value="4">Good</SelectItem>
              <SelectItem value="3">Average</SelectItem>
              <SelectItem value="2">Fair</SelectItem>
              <SelectItem value="1">Poor</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
      </div>

      <div className="space-y-2">
        <Label htmlFor="final-remarks">Final remarks and recommendations</Label>
        <Textarea id="final-remarks" placeholder="Provide final remarks, recommendations, and strategic insights..." />
      </div>
    </CardContent>
  </Card>
);


export const ObservationReports = () => {
  const [observerRole, setObserverRole] = useState<ObserverRole>('');
  const [viewMode, setViewMode] = useState<ViewMode>('reporting');

  const renderAssessmentForm = () => {
    switch (observerRole) {
      case 'principal':
        return <PrincipalAssessment />;
      case 'ece':
        return <EceObserverAssessment />;
      case 'school-officer':
        return <SchoolOfficerAssessment />;
      case 'project-manager':
        return <ProjectManagerAssessment />;
      default:
        return null;
    }
  };

  if (viewMode === 'secureLinks') {
    return <SecureLinkManagement onBack={() => setViewMode('reporting')} />;
  }

  if (viewMode === 'pastReports') {
    return <PastReportsView onBack={() => setViewMode('reporting')} />;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Field Audit & Compliance Assessment</h1>
          <p className="text-muted-foreground mt-1">
            Capture systematic observations to drive data-informed curriculum improvements and performance tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setViewMode('secureLinks')}>
            <Link className="w-4 h-4 mr-2" />
            Manage Secure Links
          </Button>
          <Button variant="outline" onClick={() => setViewMode('pastReports')}>
            <Eye className="w-4 h-4 mr-2" />
            View Past Reports
          </Button>
        </div>
      </div>
      {/* Observer Information Form */}
      <ObserverInformation observerRole={observerRole} onRoleChange={setObserverRole} />
      {/* Observation Details Form */}
      {observerRole && <ObservationDetails />}
      {/* Dynamic Assessment Form */}
      {observerRole && renderAssessmentForm()}
      {/* Submit Button */}
      {observerRole && (
        <div className="flex justify-end pt-4">
          <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
            <Check className="w-5 h-5 mr-2" />
            Submit Observation Report
          </Button>
        </div>
      )}
    </div>
  );
}; 