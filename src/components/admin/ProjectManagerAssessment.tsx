import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScaleRating, YesNoDropdown } from './ObservationReportHelpers.tsx';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp } from 'lucide-react';

export const ProjectManagerAssessment = ({ formData, updateFormData, formErrors }) => (
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