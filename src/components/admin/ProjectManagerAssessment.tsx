import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScaleRating, YesNoDropdown } from './ObservationReportHelpers.tsx';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp } from 'lucide-react';

export const ProjectManagerAssessment = ({ formData, updateFormData, formErrors }) => (
  <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
    <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
            Project Manager Assessment
          </CardTitle>
          <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
            Implementation fidelity and strategic program evaluation
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-8 space-y-8">
      {/* Implementation Cycle */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Implementation Context</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Observation Cycle *</Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">Select the current observation cycle</p>
            <Select 
              name="observation-cycle"
              value={formData.observationCycle}
              onValueChange={(value) => updateFormData('observationCycle', value)}
            >
              <SelectTrigger className={`h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 ${formErrors.observationCycle ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}>
                <SelectValue placeholder="Select observation cycle" />
              </SelectTrigger>
              <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                <SelectItem value="cycle1" className="text-base py-3 hover:bg-primary/5 rounded-xl">Cycle 1</SelectItem>
                <SelectItem value="cycle2" className="text-base py-3 hover:bg-primary/5 rounded-xl">Cycle 2</SelectItem>
                <SelectItem value="cycle3" className="text-base py-3 hover:bg-primary/5 rounded-xl">Cycle 3</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.observationCycle && <p className="text-sm text-red-500 font-medium">{formErrors.observationCycle}</p>}
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

      <Separator className="bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent h-px" />

      {/* SOW & Model Alignment */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Program Alignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">SOW Alignment</Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">Alignment with Statement of Work requirements</p>
            <Select name="sow-alignment">
              <SelectTrigger className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10">
                <SelectValue placeholder="Select alignment level" />
              </SelectTrigger>
              <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                <SelectItem value="yes" className="text-base py-3 hover:bg-primary/5 rounded-xl">Yes - Fully Aligned</SelectItem>
                <SelectItem value="partial" className="text-base py-3 hover:bg-primary/5 rounded-xl">Partial - Some Alignment</SelectItem>
                <SelectItem value="no" className="text-base py-3 hover:bg-primary/5 rounded-xl">No - Not Aligned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Technology Use as per Model</Label>
            <p className="text-sm text-gray-600 dark:text-gray-300">Technology integration matches program design (e.g., TEAL implementation)</p>
            <Select name="technology-model">
              <SelectTrigger className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10">
                <SelectValue placeholder="Select usage level" />
              </SelectTrigger>
              <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                <SelectItem value="as-designed" className="text-base py-3 hover:bg-primary/5 rounded-xl">As Designed - Perfect Implementation</SelectItem>
                <SelectItem value="mostly-correct" className="text-base py-3 hover:bg-primary/5 rounded-xl">Mostly Correct - Minor Deviations</SelectItem>
                <SelectItem value="partially-correct" className="text-base py-3 hover:bg-primary/5 rounded-xl">Partially Correct - Some Issues</SelectItem>
                <SelectItem value="incorrect" className="text-base py-3 hover:bg-primary/5 rounded-xl">Incorrect - Significant Problems</SelectItem>
                <SelectItem value="not-used" className="text-base py-3 hover:bg-primary/5 rounded-xl">Not Used - No Technology Integration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator className="bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent h-px" />

      {/* Stakeholder Assessment */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Stakeholder Engagement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ScaleRating
            label="Overall program quality"
            description="Comprehensive assessment of program implementation"
            name="program-quality"
          />
        </div>
      </div>
    </CardContent>
  </Card>
); 