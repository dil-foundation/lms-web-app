import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SecureLinkManagement } from './SecureLinkManagement';
import { PastReportsView } from './PastReportsView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  User,
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

const ObserverInformation = ({ observerRole, onRoleChange, t }) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader className="flex flex-row items-center gap-4">
      <User className="w-6 h-6 text-green-600" />
      <div>
        <CardTitle className="text-xl">{t('observation_reports.observer_information.title')}</CardTitle>
        <CardDescription>
          {t('observation_reports.observer_information.description')}
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent>
      <div className="max-w-md mx-auto">
        <Label htmlFor="observer-role" className="text-center block mb-2 font-semibold">
          {t('observation_reports.observer_information.observer_role')} *
        </Label>
        <Select value={observerRole} onValueChange={onRoleChange}>
          <SelectTrigger id="observer-role" className="h-12 text-base">
            <SelectValue placeholder={t('observation_reports.observer_information.select_role_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="principal">{t('observation_reports.roles.principal')}</SelectItem>
            <SelectItem value="ece">{t('observation_reports.roles.ece_observer')}</SelectItem>
            <SelectItem value="school-officer">{t('observation_reports.roles.school_officer')}</SelectItem>
            <SelectItem value="project-manager">{t('observation_reports.roles.project_manager')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {observerRole && (
        <div className="text-center mt-6">
          <Badge variant="outline" className="border-green-300 bg-white">
            <Check className="w-4 h-4 mr-2 text-green-600" />
            {t('observation_reports.observer_information.questionnaire_note')}
          </Badge>
        </div>
      )}
    </CardContent>
  </Card>
);

const ObservationDetails = ({ t }) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader className="flex flex-row items-center gap-4">
      <ClipboardList className="w-6 h-6 text-green-600" />
      <div>
        <CardTitle className="text-xl">{t('observation_reports.observation_details.title')}</CardTitle>
        <CardDescription>{t('observation_reports.observation_details.description')}</CardDescription>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="observer-name">{t('observation_reports.observation_details.observer_name')} *</Label>
          <Input id="observer-name" placeholder={t('observation_reports.observation_details.observer_name_placeholder')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="observation-date">{t('observation_reports.observation_details.observation_date')} *</Label>
          <Input id="observation-date" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="school-name">{t('observation_reports.observation_details.school_name')} *</Label>
          <Input id="school-name" placeholder={t('observation_reports.observation_details.school_name_placeholder')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-name">{t('observation_reports.observation_details.teacher_name')} *</Label>
          <Input id="teacher-name" placeholder={t('observation_reports.observation_details.teacher_name_placeholder')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="start-time">{t('observation_reports.observation_details.start_time')} *</Label>
          <Input id="start-time" type="time" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-time">{t('observation_reports.observation_details.end_time')} *</Label>
          <Input id="end-time" type="time" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="general-notes">{t('observation_reports.observation_details.general_notes')}</Label>
        <Textarea id="general-notes" placeholder={t('observation_reports.observation_details.general_notes_placeholder')} />
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

const YesNoQuestion = ({ label, description, t }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <RadioGroup className="flex items-center gap-6 pt-2">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="yes" id={`${label}-yes`} />
        <Label htmlFor={`${label}-yes`}>{t('common.yes')}</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="no" id={`${label}-no`} />
        <Label htmlFor={`${label}-no`}>{t('common.no')}</Label>
      </div>
    </RadioGroup>
  </div>
);

const PrincipalAssessment = ({ t }) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader>
      <div className="flex items-center gap-4">
        <Star className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">{t('observation_reports.principal_assessment.title')}</CardTitle>
          <CardDescription>{t('observation_reports.principal_assessment.description')}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AssessmentQuestion
          label={t('observation_reports.principal_assessment.q1_label')}
          description={t('observation_reports.principal_assessment.q1_description')}
        >
          <Select>
            <SelectTrigger><SelectValue placeholder={t('observation_reports.principal_assessment.rating_placeholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">{t('observation_reports.ratings.excellent')}</SelectItem>
              <SelectItem value="4">{t('observation_reports.ratings.good')}</SelectItem>
              <SelectItem value="3">{t('observation_reports.ratings.average')}</SelectItem>
              <SelectItem value="2">{t('observation_reports.ratings.fair')}</SelectItem>
              <SelectItem value="1">{t('observation_reports.ratings.poor')}</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>

        <AssessmentQuestion
          label={t('observation_reports.principal_assessment.q2_label')}
          description={t('observation_reports.principal_assessment.q2_description')}
        >
          <Select>
            <SelectTrigger><SelectValue placeholder={t('observation_reports.principal_assessment.rating_placeholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">{t('observation_reports.ratings.excellent')}</SelectItem>
              <SelectItem value="4">{t('observation_reports.ratings.good')}</SelectItem>
              <SelectItem value="3">{t('observation_reports.ratings.average')}</SelectItem>
              <SelectItem value="2">{t('observation_reports.ratings.fair')}</SelectItem>
              <SelectItem value="1">{t('observation_reports.ratings.poor')}</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
      </div>

      <AssessmentQuestion
        label={t('observation_reports.principal_assessment.q3_label')}
        description={t('observation_reports.principal_assessment.q3_description')}
      >
        <Select>
          <SelectTrigger><SelectValue placeholder={t('observation_reports.principal_assessment.rating_placeholder')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">{t('observation_reports.ratings.excellent')}</SelectItem>
            <SelectItem value="4">{t('observation_reports.ratings.good')}</SelectItem>
            <SelectItem value="3">{t('observation_reports.ratings.average')}</SelectItem>
            <SelectItem value="2">{t('observation_reports.ratings.fair')}</SelectItem>
            <SelectItem value="1">{t('observation_reports.ratings.poor')}</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <YesNoQuestion
          label={t('observation_reports.principal_assessment.q4_label')}
          description={t('observation_reports.principal_assessment.q4_description')}
          t={t}
        />
        <YesNoQuestion
          label={t('observation_reports.principal_assessment.q5_label')}
          description={t('observation_reports.principal_assessment.q5_description')}
          t={t}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="immediate-concerns">{t('observation_reports.principal_assessment.concerns_label')}</Label>
        <Textarea id="immediate-concerns" placeholder={t('observation_reports.principal_assessment.concerns_placeholder')} />
      </div>
    </CardContent>
  </Card>
);

const EceObserverAssessment = ({ t }) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader>
      <div className="flex items-center gap-4">
        <Star className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">{t('observation_reports.ece_assessment.title')}</CardTitle>
          <CardDescription>{t('observation_reports.ece_assessment.description')}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* This component can be identical to PrincipalAssessment or customized */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AssessmentQuestion
          label={t('observation_reports.ece_assessment.q1_label')}
          description={t('observation_reports.ece_assessment.q1_description')}
        >
          <Select>
            <SelectTrigger><SelectValue placeholder={t('observation_reports.principal_assessment.rating_placeholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">{t('observation_reports.ratings.excellent')}</SelectItem>
              <SelectItem value="4">{t('observation_reports.ratings.good')}</SelectItem>
              <SelectItem value="3">{t('observation_reports.ratings.average')}</SelectItem>
              <SelectItem value="2">{t('observation_reports.ratings.fair')}</SelectItem>
              <SelectItem value="1">{t('observation_reports.ratings.poor')}</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>

        <AssessmentQuestion
          label={t('observation_reports.ece_assessment.q2_label')}
          description={t('observation_reports.ece_assessment.q2_description')}
        >
          <Select>
            <SelectTrigger><SelectValue placeholder={t('observation_reports.principal_assessment.rating_placeholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">{t('observation_reports.ratings.excellent')}</SelectItem>
              <SelectItem value="4">{t('observation_reports.ratings.good')}</SelectItem>
              <SelectItem value="3">{t('observation_reports.ratings.average')}</SelectItem>
              <SelectItem value="2">{t('observation_reports.ratings.fair')}</SelectItem>
              <SelectItem value="1">{t('observation_reports.ratings.poor')}</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
      </div>

      <AssessmentQuestion
        label={t('observation_reports.ece_assessment.q3_label')}
        description={t('observation_reports.ece_assessment.q3_description')}
      >
        <Select>
          <SelectTrigger><SelectValue placeholder={t('observation_reports.principal_assessment.rating_placeholder')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">{t('observation_reports.ratings.excellent')}</SelectItem>
            <SelectItem value="4">{t('observation_reports.ratings.good')}</SelectItem>
            <SelectItem value="3">{t('observation_reports.ratings.average')}</SelectItem>
            <SelectItem value="2">{t('observation_reports.ratings.fair')}</SelectItem>
            <SelectItem value="1">{t('observation_reports.ratings.poor')}</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <YesNoQuestion
          label={t('observation_reports.ece_assessment.q4_label')}
          description={t('observation_reports.ece_assessment.q4_description')}
          t={t}
        />
        <YesNoQuestion
          label={t('observation_reports.ece_assessment.q5_label')}
          description={t('observation_reports.ece_assessment.q5_description')}
          t={t}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ece-concerns">{t('observation_reports.ece_assessment.concerns_label')}</Label>
        <Textarea id="ece-concerns" placeholder={t('observation_reports.ece_assessment.concerns_placeholder')} />
      </div>
    </CardContent>
  </Card>
);

const SchoolOfficerAssessment = ({ t }) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader>
      <div className="flex items-center gap-4">
        <Home className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">{t('observation_reports.school_officer_assessment.title')}</CardTitle>
          <CardDescription>{t('observation_reports.school_officer_assessment.description')}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="project-name">{t('observation_reports.school_officer_assessment.project_name_label')}</Label>
          <Input id="project-name" placeholder={t('observation_reports.school_officer_assessment.project_name_placeholder')} />
        </div>
        <AssessmentQuestion label={t('observation_reports.school_officer_assessment.quarter_label')} description={t('observation_reports.school_officer_assessment.quarter_description')}>
          <Select>
            <SelectTrigger><SelectValue placeholder={t('observation_reports.school_officer_assessment.quarter_placeholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="q1">{t('observation_reports.school_officer_assessment.quarter_q1')}</SelectItem>
              <SelectItem value="q2">{t('observation_reports.school_officer_assessment.quarter_q2')}</SelectItem>
              <SelectItem value="q3">{t('observation_reports.school_officer_assessment.quarter_q3')}</SelectItem>
              <SelectItem value="q4">{t('observation_reports.school_officer_assessment.quarter_q4')}</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
        <AssessmentQuestion
          label={t('observation_reports.school_officer_assessment.teaching_effectiveness_label')}
          description={t('observation_reports.school_officer_assessment.teaching_effectiveness_description')}
        >
          <Select>
            <SelectTrigger><SelectValue placeholder={t('observation_reports.school_officer_assessment.teaching_effectiveness_placeholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">{t('observation_reports.ratings.excellent')}</SelectItem>
              <SelectItem value="4">{t('observation_reports.ratings.good')}</SelectItem>
              <SelectItem value="3">{t('observation_reports.ratings.average')}</SelectItem>
              <SelectItem value="2">{t('observation_reports.ratings.fair')}</SelectItem>
              <SelectItem value="1">{t('observation_reports.ratings.poor')}</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
        <AssessmentQuestion
          label={t('observation_reports.school_officer_assessment.school_cleanliness_label')}
          description={t('observation_reports.school_officer_assessment.school_cleanliness_description')}
        >
          <Select>
            <SelectTrigger><SelectValue placeholder={t('observation_reports.school_officer_assessment.school_cleanliness_placeholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">{t('observation_reports.ratings.excellent')}</SelectItem>
              <SelectItem value="4">{t('observation_reports.ratings.good')}</SelectItem>
              <SelectItem value="3">{t('observation_reports.ratings.average')}</SelectItem>
              <SelectItem value="2">{t('observation_reports.ratings.fair')}</SelectItem>
              <SelectItem value="1">{t('observation_reports.ratings.poor')}</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <YesNoQuestion
          label={t('observation_reports.school_officer_assessment.availability_of_materials_label')}
          description={t('observation_reports.school_officer_assessment.availability_of_materials_description')}
          t={t}
        />
        <YesNoQuestion
          label={t('observation_reports.school_officer_assessment.teacher_attendance_label')}
          description={t('observation_reports.school_officer_assessment.teacher_attendance_description')}
          t={t}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary-comments">{t('observation_reports.school_officer_assessment.summary_comments_label')}</Label>
        <Textarea id="summary-comments" placeholder={t('observation_reports.school_officer_assessment.summary_comments_placeholder')} />
      </div>
    </CardContent>
  </Card>
);

const ProjectManagerAssessment = ({ t }) => (
  <Card className="bg-green-50/20 border-green-200 dark:bg-green-900/10 dark:border-green-800/50">
    <CardHeader>
      <div className="flex items-center gap-4">
        <TrendingUp className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">{t('observation_reports.project_manager_assessment.title')}</CardTitle>
          <CardDescription>{t('observation_reports.project_manager_assessment.description')}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <AssessmentQuestion label={t('observation_reports.project_manager_assessment.observation_cycle_label')} description={t('observation_reports.project_manager_assessment.observation_cycle_description')}>
        <Select>
          <SelectTrigger><SelectValue placeholder={t('observation_reports.project_manager_assessment.observation_cycle_placeholder')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cycle1">{t('observation_reports.project_manager_assessment.observation_cycle_cycle1')}</SelectItem>
            <SelectItem value="cycle2">{t('observation_reports.project_manager_assessment.observation_cycle_cycle2')}</SelectItem>
            <SelectItem value="cycle3">{t('observation_reports.project_manager_assessment.observation_cycle_cycle3')}</SelectItem>
          </SelectContent>
        </Select>
      </AssessmentQuestion>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AssessmentQuestion
          label={t('observation_reports.project_manager_assessment.overall_program_quality_label')}
          description={t('observation_reports.project_manager_assessment.overall_program_quality_description')}
        >
          <Select>
            <SelectTrigger><SelectValue placeholder={t('observation_reports.project_manager_assessment.overall_program_quality_placeholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">{t('observation_reports.ratings.excellent')}</SelectItem>
              <SelectItem value="4">{t('observation_reports.ratings.good')}</SelectItem>
              <SelectItem value="3">{t('observation_reports.ratings.average')}</SelectItem>
              <SelectItem value="2">{t('observation_reports.ratings.fair')}</SelectItem>
              <SelectItem value="1">{t('observation_reports.ratings.poor')}</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
        <AssessmentQuestion
          label={t('observation_reports.project_manager_assessment.teacher_morale_label')}
          description={t('observation_reports.project_manager_assessment.teacher_morale_description')}
        >
          <Select>
            <SelectTrigger><SelectValue placeholder={t('observation_reports.project_manager_assessment.teacher_morale_placeholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">{t('observation_reports.ratings.excellent')}</SelectItem>
              <SelectItem value="4">{t('observation_reports.ratings.good')}</SelectItem>
              <SelectItem value="3">{t('observation_reports.ratings.average')}</SelectItem>
              <SelectItem value="2">{t('observation_reports.ratings.fair')}</SelectItem>
              <SelectItem value="1">{t('observation_reports.ratings.poor')}</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
        <AssessmentQuestion
          label={t('observation_reports.project_manager_assessment.school_admin_cooperation_label')}
          description={t('observation_reports.project_manager_assessment.school_admin_cooperation_description')}
        >
          <Select>
            <SelectTrigger><SelectValue placeholder={t('observation_reports.project_manager_assessment.school_admin_cooperation_placeholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">{t('observation_reports.ratings.excellent')}</SelectItem>
              <SelectItem value="4">{t('observation_reports.ratings.good')}</SelectItem>
              <SelectItem value="3">{t('observation_reports.ratings.average')}</SelectItem>
              <SelectItem value="2">{t('observation_reports.ratings.fair')}</SelectItem>
              <SelectItem value="1">{t('observation_reports.ratings.poor')}</SelectItem>
            </SelectContent>
          </Select>
        </AssessmentQuestion>
      </div>

      <div className="space-y-2">
        <Label htmlFor="final-remarks">{t('observation_reports.project_manager_assessment.final_remarks_label')}</Label>
        <Textarea id="final-remarks" placeholder={t('observation_reports.project_manager_assessment.final_remarks_placeholder')} />
      </div>
    </CardContent>
  </Card>
);


export const ObservationReports = () => {
  const { t } = useTranslation();
  const [observerRole, setObserverRole] = useState<ObserverRole>('');
  const [viewMode, setViewMode] = useState<ViewMode>('reporting');

  const renderAssessmentForm = () => {
    switch (observerRole) {
      case 'principal':
        return <PrincipalAssessment t={t} />;
      case 'ece':
        return <EceObserverAssessment t={t} />;
      case 'school-officer':
        return <SchoolOfficerAssessment t={t} />;
      case 'project-manager':
        return <ProjectManagerAssessment t={t} />;
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
          <h1 className="text-3xl font-bold tracking-tight">{t('observation_reports.header.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('observation_reports.header.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setViewMode('secureLinks')}>
            <Link className="w-4 h-4 mr-2" />
            {t('observation_reports.header.manage_secure_links_button')}
          </Button>
          <Button variant="outline" onClick={() => setViewMode('pastReports')}>
            <Eye className="w-4 h-4 mr-2" />
            {t('observation_reports.header.view_past_reports_button')}
          </Button>
        </div>
      </div>
      {/* Observer Information Form */}
      <ObserverInformation observerRole={observerRole} onRoleChange={setObserverRole} t={t} />
      {/* Observation Details Form */}
      {observerRole && <ObservationDetails t={t} />}
      {/* Dynamic Assessment Form */}
      {observerRole && renderAssessmentForm()}
      {/* Submit Button */}
      {observerRole && (
        <div className="flex justify-end pt-4">
          <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
            <Check className="w-5 h-5 mr-2" />
            {t('observation_reports.submit_button')}
          </Button>
        </div>
      )}
    </div>
  );
}; 