import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScaleRating } from './ObservationReportHelpers.tsx';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield } from 'lucide-react';

export const SchoolOfficerAssessment = ({ formData, updateFormData, formErrors }) => (
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
        <Textarea id="summary-comments" placeholder="Add summary comments about the observation..." />
      </div>
    </CardContent>
  </Card>
); 