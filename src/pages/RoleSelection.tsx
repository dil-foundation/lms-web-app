
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users } from 'lucide-react';

const RoleSelection = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome to DIL</h1>
            <p className="text-muted-foreground">Choose your role to get started</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">I'm a Student</CardTitle>
                <CardDescription>
                  Access learning materials and track your progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/auth/student">
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    Continue as Student
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">I'm a Teacher</CardTitle>
                <CardDescription>
                  Manage students and create learning experiences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/auth/teacher">
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    Continue as Teacher
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
