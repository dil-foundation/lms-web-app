import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, ArrowRight } from 'lucide-react';

const RoleSelection = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary),0.03),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary),0.02),transparent_50%)]"></div>
      
      <Header />
      <div className="pt-16 min-h-screen flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
              Welcome to DIL
            </h1>
            <p className="text-xl text-muted-foreground font-light">Choose your role to get started</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <GraduationCap className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">I'm a Student</CardTitle>
                <CardDescription className="text-lg leading-relaxed">
                  Access learning materials and track your progress
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <Link to="/auth/student">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                    Continue as Student
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">I'm a Teacher</CardTitle>
                <CardDescription className="text-lg leading-relaxed">
                  Manage students and create learning experiences
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <Link to="/auth/teacher">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                    Continue as Teacher
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
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
