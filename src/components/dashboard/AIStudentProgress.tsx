import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Award, Target, BookOpen, CheckCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const mockProgressData = {
  overallProgress: 78,
  skills: [
    { name: 'JavaScript Fundamentals', progress: 85, level: 'Advanced' },
    { name: 'React Hooks', progress: 72, level: 'Intermediate' },
    { name: 'Data Structures', progress: 60, level: 'Beginner' },
    { name: 'CSS Flexbox', progress: 95, level: 'Expert' },
  ],
  recentAchievements: [
    { id: 1, title: 'Completed "JavaScript Basics" module', date: '2 days ago', icon: CheckCircle },
    { id: 2, title: 'Achieved 5-day learning streak', date: 'Yesterday', icon: Star },
    { id: 3, title: 'Scored 90% on "React Props" quiz', date: '3 hours ago', icon: Award },
  ],
  strengths: ['JavaScript', 'CSS'],
  areasForImprovement: ['Data Structures', 'Algorithms'],
};

export const AIStudentProgress: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Overall Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Your progress</span>
            <span className="text-2xl font-bold text-primary">{mockProgressData.overallProgress}%</span>
          </div>
          <Progress value={mockProgressData.overallProgress} className="h-3" />
          <p className="text-sm text-muted-foreground">
            You're making great progress! Keep up the hard work.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6" />
            Skill Mastery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockProgressData.skills.map(skill => (
            <div key={skill.name}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">{skill.name}</span>
                <Badge variant="outline">{skill.level}</Badge>
              </div>
              <div className="flex items-center gap-4">
                <Progress value={skill.progress} className="h-2 flex-1" />
                <span className="text-sm font-semibold w-12 text-right">{skill.progress}%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Strengths & Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Strengths</h4>
              <div className="flex flex-wrap gap-2">
                {mockProgressData.strengths.map(strength => (
                  <Badge key={strength} variant="default" className="bg-green-100 text-green-800">{strength}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Areas for Improvement</h4>
              <div className="flex flex-wrap gap-2">
                {mockProgressData.areasForImprovement.map(area => (
                  <Badge key={area} variant="destructive" className="bg-red-100 text-red-800">{area}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-6 w-6" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {mockProgressData.recentAchievements.map(achievement => (
                <li key={achievement.id} className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <achievement.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{achievement.title}</p>
                    <p className="text-sm text-muted-foreground">{achievement.date}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full mt-4">View All Achievements</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 