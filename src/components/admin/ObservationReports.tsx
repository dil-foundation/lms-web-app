import { useState } from 'react';
import { SecureLinkManagement } from './SecureLinkManagement';
import { PastReportsView } from './PastReportsView';
import { PerformanceReport } from './PerformanceReport';
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
} from 'lucide-react';

type ObserverRole = 'principal' | 'ece' | 'school-officer' | 'project-manager' | '';
type ViewMode = 'reporting' | 'secureLinks' | 'pastReports' | 'performanceReport';

// Helper Components for consistency
const ScaleRating = ({ label, description, name }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <Select name={name}>
      <SelectTrigger><SelectValue placeholder="Select rating (1-5)" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="5">5 - Excellent</SelectItem>
        <SelectItem value="4">4 - Good</SelectItem>
        <SelectItem value="3">3 - Satisfactory</SelectItem>
        <SelectItem value="2">2 - Needs Improvement</SelectItem>
        <SelectItem value="1">1 - Poor</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

const YesNoDropdown = ({ label, description, name, allowComment = false }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <Select name={name}>
      <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="yes">Yes</SelectItem>
        <SelectItem value="no">No</SelectItem>
      </SelectContent>
    </Select>
    {allowComment && (
      <Textarea placeholder="Optional comment..." className="mt-2" />
    )}
  </div>
);

const TagInput = ({ label, description, placeholder }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <Input placeholder={placeholder} />
    <p className="text-xs text-muted-foreground">Separate multiple items with commas</p>
  </div>
);

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

const ObservationDetails = () => (
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

      <Separator />

      {/* Enhanced Universal Fields */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Project & Teacher Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TagInput 
            label="Project Name & Category *"
            description="Enter project name and category for program aggregation"
            placeholder="e.g., TEAL Phase 2, Early Childhood Development"
          />
          <div className="space-y-2">
            <Label htmlFor="teacher-joining-date">Date of Teacher's Joining DIL</Label>
            <p className="text-sm text-muted-foreground">For tenure context and expectation setting</p>
            <Input id="teacher-joining-date" type="date" />
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
            <Input id="lesson-code" placeholder="e.g., ENG-G3-L15" />
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
    <CardContent className="space-y-8">
      {/* Core Teaching Assessment */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Teaching Effectiveness</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScaleRating
            label="Teacher gives clear instructions"
            description="Rate how clearly the teacher communicates lesson objectives and tasks"
            name="clear-instructions"
          />
          <ScaleRating
            label="Students are engaged during lesson"
            description="Assess student participation and attention levels"
            name="student-engagement"
          />
          <ScaleRating
            label="Classroom displays are age-appropriate"
            description="Evaluate the relevance and quality of classroom materials"
            name="classroom-displays"
          />
          <ScaleRating
            label="Lesson Plan Adherence Rating"
            description="How well did the teacher follow the planned curriculum structure?"
            name="lesson-adherence"
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

const EceObserverAssessment = () => (
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
            name="child-initiated"
            allowComment={true}
          />
          <div className="space-y-2">
            <Label>Classroom Environment Rating</Label>
            <p className="text-sm text-muted-foreground">Overall assessment of the learning environment</p>
            <Select name="environment-rating">
              <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent - Clean, organized, stimulating</SelectItem>
                <SelectItem value="good">Good - Well-maintained, age-appropriate</SelectItem>
                <SelectItem value="satisfactory">Satisfactory - Basic requirements met</SelectItem>
                <SelectItem value="needs-improvement">Needs Improvement - Some concerns</SelectItem>
                <SelectItem value="poor">Poor - Significant issues</SelectItem>
              </SelectContent>
            </Select>
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

const SchoolOfficerAssessment = () => (
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
            <Input id="project-name-officer" placeholder="Enter project name..." />
          </div>
          <div className="space-y-2">
            <Label>Quarter *</Label>
            <p className="text-sm text-muted-foreground">Select the current quarter</p>
            <Select>
              <SelectTrigger><SelectValue placeholder="Select quarter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="q1">Q1</SelectItem>
                <SelectItem value="q2">Q2</SelectItem>
                <SelectItem value="q3">Q3</SelectItem>
                <SelectItem value="q4">Q4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Attendance & Schedule Compliance */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Attendance & Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="attendance-review" className="rounded" />
              <Label htmlFor="attendance-review">Teacher Attendance Record Review</Label>
            </div>
            <p className="text-sm text-muted-foreground">Check if attendance records were reviewed and are satisfactory</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="timetable-compliance" className="rounded" />
              <Label htmlFor="timetable-compliance">Timetable Compliance</Label>
            </div>
            <p className="text-sm text-muted-foreground">Lesson matched scheduled subject and time slot</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Documentation & Facility */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Documentation & Facility</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Documentation Complete</Label>
            <p className="text-sm text-muted-foreground">Check all available documentation</p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="lesson-plan-doc" className="rounded" />
                <Label htmlFor="lesson-plan-doc">Lesson Plan Available</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="register-doc" className="rounded" />
                <Label htmlFor="register-doc">Attendance Register Updated</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="assessment-doc" className="rounded" />
                <Label htmlFor="assessment-doc">Assessment Records Current</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="facility-concerns">Facility/Infrastructure Concerns Noted</Label>
            <p className="text-sm text-muted-foreground">Any issues with physical infrastructure or learning environment</p>
            <Textarea id="facility-concerns" placeholder="Note any concerns about classroom facilities, safety, equipment, or infrastructure..." />
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
            name="teaching-effectiveness"
          />
          <ScaleRating
            label="School cleanliness"
            description="Maintenance and hygiene standards of the facility"
            name="school-cleanliness"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="summary-comments">Summary comments</Label>
        <p className="text-sm text-muted-foreground">Overall assessment and recommendations</p>
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
            <Select name="observation-cycle">
              <SelectTrigger><SelectValue placeholder="Select observation cycle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cycle1">Cycle 1</SelectItem>
                <SelectItem value="cycle2">Cycle 2</SelectItem>
                <SelectItem value="cycle3">Cycle 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScaleRating
            label="Overall Fidelity Score"
            description="Implementation fidelity to program model and standards"
            name="fidelity-score"
          />
        </div>
      </div>

      <Separator />

      {/* SOW & Model Alignment */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Program Alignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>SOW Alignment</Label>
            <p className="text-sm text-muted-foreground">Alignment with Statement of Work requirements</p>
            <Select name="sow-alignment">
              <SelectTrigger><SelectValue placeholder="Select alignment level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes - Fully Aligned</SelectItem>
                <SelectItem value="partial">Partial - Some Alignment</SelectItem>
                <SelectItem value="no">No - Not Aligned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Technology Use as per Model</Label>
            <p className="text-sm text-muted-foreground">Technology integration matches program design (e.g., TEAL implementation)</p>
            <Select name="technology-model">
              <SelectTrigger><SelectValue placeholder="Select usage level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="as-designed">As Designed - Perfect Implementation</SelectItem>
                <SelectItem value="mostly-correct">Mostly Correct - Minor Deviations</SelectItem>
                <SelectItem value="partially-correct">Partially Correct - Some Issues</SelectItem>
                <SelectItem value="incorrect">Incorrect - Significant Problems</SelectItem>
                <SelectItem value="not-used">Not Used - No Technology Integration</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          />
          <ScaleRating
            label="Teacher morale"
            description="Teacher satisfaction and motivation levels"
            name="teacher-morale"
          />
          <ScaleRating
            label="School admin cooperation"
            description="Level of administrative support and collaboration"
            name="admin-cooperation"
          />
        </div>
      </div>

      <Separator />

      {/* Implementation Challenges */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Implementation Support</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="implementation-barriers">Implementation Barriers</Label>
            <p className="text-sm text-muted-foreground">Challenges hindering effective program implementation</p>
            <Textarea id="implementation-barriers" placeholder="Describe systemic barriers, resource constraints, capacity issues, or other implementation challenges..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <YesNoDropdown
              label="Coaching Follow-Up Required?"
              description="Does the teacher/school need additional coaching support?"
              name="coaching-required"
            />
            <div className="space-y-2">
              <Label htmlFor="coaching-assignee">Coaching Assignee</Label>
              <p className="text-sm text-muted-foreground">Who should provide the follow-up coaching?</p>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project-team">Project Team Member</SelectItem>
                  <SelectItem value="master-trainer">Master Trainer</SelectItem>
                  <SelectItem value="mentor-teacher">Mentor Teacher</SelectItem>
                  <SelectItem value="district-officer">District Education Officer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="final-remarks">Final remarks and recommendations</Label>
        <p className="text-sm text-muted-foreground">Strategic insights and program-level recommendations</p>
        <Textarea id="final-remarks" placeholder="Provide final remarks, recommendations, and strategic insights..." />
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

export const ObservationReports = () => {
  const [observerRole, setObserverRole] = useState<ObserverRole>('');
  const [viewMode, setViewMode] = useState<ViewMode>('reporting');
  const [showTealObservations, setShowTealObservations] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const handleSubmitReport = () => {
    // In real implementation, collect all form data here
    const formData = {
      observerRole,
      showTealObservations,
      // Add other form data collection logic
    };
    
    setSubmittedData(formData);
    setViewMode('performanceReport');
  };

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

  if (viewMode === 'performanceReport') {
    return <PerformanceReport 
      observationData={submittedData} 
      onBack={() => setViewMode('reporting')} 
    />;
  }

  return (
    <div className="space-y-8 mx-auto p-4">
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

      {/* Universal Fields - Observation Details */}
      {observerRole && <ObservationDetails />}

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
      {observerRole && renderAssessmentForm()}

      {/* Submit Button */}
      {observerRole && (
        <div className="flex justify-end pt-4">
          <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmitReport}>
            <Check className="w-5 h-5 mr-2" />
            Submit Observation Report
          </Button>
        </div>
      )}
    </div>
  );
}; 