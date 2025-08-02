import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Brain, MessageCircle, Globe, Award, Languages, Target, ArrowRight, Sparkles } from 'lucide-react';

const Home = () => {
  return <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-20 sm:pt-32 md:pt-48 pb-12 sm:pb-16 md:pb-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 animate-fade-in-up">
            Master English with{' '}
            <span className="text-primary">AI-Powered Learning</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-delayed px-2">
            Your personalized English tutor powered by artificial intelligence. Learn 
            at your own pace with interactive lessons, real-time feedback, and 
            cultural context.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in-delayed stagger-2 px-4">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full hover-scale transition-all duration-300">
                Start Learning
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full hover-scale transition-all duration-300">
                Dashboard
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full hover-scale transition-all duration-300">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-primary animate-fade-in-up">
              Everything You Need To Master English
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-4xl mx-auto animate-fade-in-delayed px-2">
              Comprehensive features designed to make English learning effective, enjoyable, and accessible for young minds.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-card border-border text-card-foreground hover-lift animate-fade-in-up stagger-1">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 hover-scale transition-all duration-300">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">AI-Powered Lessons</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Interactive and adaptive English learning
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-card-foreground hover-lift animate-fade-in-up stagger-2">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 hover-scale transition-all duration-300">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Conversational Practice</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Speak with your tutor in real-time
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-card-foreground hover-lift animate-fade-in-up stagger-3">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 hover-scale transition-all duration-300">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Structured Learning Paths</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Follow guided curiculumn aligned to goals
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-card-foreground hover-lift animate-fade-in-up stagger-4">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 hover-scale transition-all duration-300">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Verifiable Credentials</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Earn certifications recognized with sponsors
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-card-foreground hover-lift animate-fade-in-up stagger-5">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 hover-scale transition-all duration-300">
                  <Languages className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Bilingual (Urdu & English)</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Learn easily with bilingual (English & Urdu) support
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-card-foreground hover-lift animate-fade-in-up stagger-6">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 hover-scale transition-all duration-300">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Progress & Analytics</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Visualize improvement with data
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-primary animate-fade-in-up">
              Loved By Learners Worldwide
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto animate-fade-in-delayed px-2">
              Join thousands of satisfied students who have transformed their English skills
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-card border-border text-card-foreground hover-lift animate-slide-in-left stagger-1">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 italic">
                  "AI Tutor has completely transformed how I learn English. The 
                  personalized approach makes all the difference."
                </p>
                <div>
                  <p className="font-semibold text-foreground">Sarah Ahmed</p>
                  <p className="text-sm text-muted-foreground">Student</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-card-foreground hover-lift animate-fade-in-up stagger-2">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 italic">
                  "The cultural context and real-world scenarios 
                  have helped me understand English in 
                  practical situations."
                </p>
                <div>
                  <p className="font-semibold text-foreground">Mohammad Khan</p>
                  <p className="text-sm text-muted-foreground">Professional</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-card-foreground hover-lift animate-slide-in-right stagger-3">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 italic">
                  "I love how the app adapts to my learning 
                  style. It's like having a personal tutor available 
                  24/7."
                </p>
                <div>
                  <p className="font-semibold text-foreground">Fatima Ali</p>
                  <p className="text-sm text-muted-foreground">Business Owner</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-primary via-primary to-blue-600 rounded-3xl p-6 sm:p-8 md:p-12 hover-scale transition-all duration-500 animate-scale-in">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-black">
              Start Your English Learning Journey Today
            </h2>
            <p className="text-lg sm:text-xl text-black mb-6 sm:mb-8 md:mb-10 max-w-3xl mx-auto px-2">
              Join thousands of learners who have achieved fluency with AI Tutor
            </p>
            <Link to="/auth">
              <Button size="lg" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold text-base sm:text-lg px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-6 rounded-xl hover-scale transition-all duration-300">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>;
};

export default Home;
