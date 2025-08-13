import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScaleRating } from './ObservationReportHelpers.tsx';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield } from 'lucide-react';

export const SchoolOfficerAssessment = ({ formData, updateFormData, formErrors }) => (
  <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
    <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
            School Officer Assessment
          </CardTitle>
          <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
            Administrative compliance and logistical evaluations
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-8 space-y-8">
      {/* Administrative Compliance */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Administrative Compliance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <Label htmlFor="project-name-officer" className="text-base font-semibold text-gray-900 dark:text-gray-100">Project Name *</Label>
            <Input 
              id="project-name-officer" 
              placeholder="Enter project name..." 
              value={formData.projectNameOfficer}
              onChange={(e) => updateFormData('projectNameOfficer', e.target.value)}
              className={`h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${formErrors.projectNameOfficer ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}
            />
            {formErrors.projectNameOfficer && <p className="text-sm text-red-500 font-medium">{formErrors.projectNameOfficer}</p>}
          </div>
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Quarter *</Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">Select the current quarter</p>
            <Select 
              value={formData.quarter} 
              onValueChange={(value) => updateFormData('quarter', value)}
            >
              <SelectTrigger className={`h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 ${formErrors.quarter ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}>
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
              <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                <SelectItem value="q1" className="text-base py-3 hover:bg-primary/5 rounded-xl">Q1</SelectItem>
                <SelectItem value="q2" className="text-base py-3 hover:bg-primary/5 rounded-xl">Q2</SelectItem>
                <SelectItem value="q3" className="text-base py-3 hover:bg-primary/5 rounded-xl">Q3</SelectItem>
                <SelectItem value="q4" className="text-base py-3 hover:bg-primary/5 rounded-xl">Q4</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.quarter && <p className="text-sm text-red-500 font-medium">{formErrors.quarter}</p>}
          </div>
        </div>
      </div>

      <Separator className="bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent h-px" />

      {/* Attendance & Schedule Compliance */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Attendance & Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input type="checkbox" id="attendance-review" className="w-5 h-5 rounded border-2 border-gray-300 focus:ring-2 focus:ring-primary/20" />
              <Label htmlFor="attendance-review" className="text-base font-semibold text-gray-900 dark:text-gray-100">Teacher Attendance Record Review</Label>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 ml-8">Check if attendance records were reviewed and are satisfactory</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input type="checkbox" id="timetable-compliance" className="w-5 h-5 rounded border-2 border-gray-300 focus:ring-2 focus:ring-primary/20" />
              <Label htmlFor="timetable-compliance" className="text-base font-semibold text-gray-900 dark:text-gray-100">Timetable Compliance</Label>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 ml-8">Lesson matched scheduled subject and time slot</p>
          </div>
        </div>
      </div>

      <Separator className="bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent h-px" />

      {/* Documentation & Facility */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Documentation & Facility</h3>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Documentation Complete</Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">Check all available documentation</p>
            <div className="space-y-3 ml-4">
              <div className="flex items-center space-x-3">
                <input type="checkbox" id="lesson-plan-doc" className="w-5 h-5 rounded border-2 border-gray-300 focus:ring-2 focus:ring-primary/20" />
                <Label htmlFor="lesson-plan-doc" className="text-base font-medium text-gray-900 dark:text-gray-100">Lesson Plan Available</Label>
              </div>
              <div className="flex items-center space-x-3">
                <input type="checkbox" id="register-doc" className="w-5 h-5 rounded border-2 border-gray-300 focus:ring-2 focus:ring-primary/20" />
                <Label htmlFor="register-doc" className="text-base font-medium text-gray-900 dark:text-gray-100">Attendance Register Updated</Label>
              </div>
            </div>
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