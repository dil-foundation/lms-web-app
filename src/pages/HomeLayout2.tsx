import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Brain, MessageCircle, Globe, Award, Languages, Target, ArrowRight, Sparkles, Play } from 'lucide-react';

const HomeLayout2 = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      {/* Grid-based Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-12 gap-8 items-center min-h-[70vh]">
            {/* Left Content - 7 columns */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-6 animate-slide-in-left">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
                  Master English with{' '}
                  <span className="text-primary">
                    AI-Powered Learning
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                  Your personalized English tutor powered by artificial intelligence. Learn 
                  at your own pace with interactive lessons, real-time feedback, and 
                  cultural context.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/auth">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-8 py-4 rounded-2xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-primary/25">
                      Start Learning
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="border-2 border-primary text-primary hover:bg-primary/10 text-lg px-8 py-4 rounded-2xl hover:scale-105 transition-all duration-300 group">
                    <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    Watch Demo
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Right Visual Grid - 5 columns */}
            <div className="lg:col-span-5">
              <div className="grid grid-cols-2 gap-4 animate-fade-in-right">
                <div className="space-y-4">
                  <Card className="bg-card border-border hover:scale-105 transition-all duration-500">
                    <CardContent className="p-6 text-center">
                      <Brain className="h-12 w-12 text-primary mx-auto mb-3" />
                      <h3 className="font-bold text-lg text-primary">AI-Powered</h3>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border hover:scale-105 transition-all duration-500">
                    <CardContent className="p-6 text-center">
                      <Globe className="h-12 w-12 text-primary mx-auto mb-3" />
                      <h3 className="font-bold text-lg text-primary">Structured</h3>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-4 pt-8">
                  <Card className="bg-card border-border hover:scale-105 transition-all duration-500">
                    <CardContent className="p-6 text-center">
                      <MessageCircle className="h-12 w-12 text-primary mx-auto mb-3" />
                      <h3 className="font-bold text-lg text-primary">Interactive</h3>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border hover:scale-105 transition-all duration-500">
                    <CardContent className="p-6 text-center">
                      <Award className="h-12 w-12 text-primary mx-auto mb-3" />
                      <h3 className="font-bold text-lg text-primary">Certified</h3>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Features Grid */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-primary">
              Everything You Need To Master English
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive features designed to make English learning effective, enjoyable, and accessible for young minds.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <Card className="bg-card border-border hover:scale-105 transition-all duration-500 animate-fade-in-up stagger-1">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 hover:bg-primary/20 transition-colors duration-300">
                  <Brain className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl text-primary">AI-Powered Lessons</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Interactive and adaptive English learning
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:scale-105 transition-all duration-500 animate-fade-in-up stagger-2">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 hover:bg-primary/20 transition-colors duration-300">
                  <MessageCircle className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl text-primary">Conversational Practice</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Speak with your tutor in real-time
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:scale-105 transition-all duration-500 animate-fade-in-up stagger-3">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 hover:bg-primary/20 transition-colors duration-300">
                  <Globe className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl text-primary">Structured Learning Paths</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Follow guided curriculum aligned to goals
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:scale-105 transition-all duration-500 animate-fade-in-up stagger-4">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 hover:bg-primary/20 transition-colors duration-300">
                  <Award className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl text-primary">Verifiable Credentials</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Earn certifications recognized with sponsors
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:scale-105 transition-all duration-500 animate-fade-in-up stagger-5">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 hover:bg-primary/20 transition-colors duration-300">
                  <Languages className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl text-primary">Bilingual (Urdu & English)</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Learn easily with bilingual (English & Urdu) support
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:scale-105 transition-all duration-500 animate-fade-in-up stagger-6">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 hover:bg-primary/20 transition-colors duration-300">
                  <Target className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl text-primary">Progress & Analytics</CardTitle>
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

      {/* Clean Testimonials */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-primary">
              Loved By Learners Worldwide
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join thousands of satisfied students who have transformed their English skills
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-card border-border hover:scale-105 transition-all duration-500 animate-slide-in-up delay-100">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-5 w-5 text-primary fill-current" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">
                  "AI Tutor has completely transformed how I learn English. The 
                  personalized approach makes all the difference."
                </p>
                <div>
                  <p className="font-bold text-foreground text-lg">Sarah Ahmed</p>
                  <p className="text-muted-foreground">Student</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:scale-105 transition-all duration-500 animate-slide-in-up delay-200">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-5 w-5 text-primary fill-current" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">
                  "The cultural context and real-world scenarios 
                  have helped me understand English in 
                  practical situations."
                </p>
                <div>
                  <p className="font-bold text-foreground text-lg">Mohammad Khan</p>
                  <p className="text-muted-foreground">Professional</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:scale-105 transition-all duration-500 animate-slide-in-up delay-300">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-5 w-5 text-primary fill-current" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">
                  "I love how the app adapts to my learning 
                  style. It's like having a personal tutor available 
                  24/7."
                </p>
                <div>
                  <p className="font-bold text-foreground text-lg">Fatima Ali</p>
                  <p className="text-muted-foreground">Business Owner</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Clean CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="relative overflow-hidden bg-primary rounded-3xl p-12 md:p-20 text-center animate-scale-in">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-6xl font-bold mb-8 text-primary-foreground">
                Start Your English Learning Journey Today
              </h2>
              <p className="text-xl md:text-2xl text-primary-foreground/90 mb-12 max-w-4xl mx-auto">
                Join thousands of learners who have achieved fluency with AI Tutor
              </p>
              <Link to="/auth">
                <Button size="lg" className="bg-background text-primary hover:bg-background/90 font-bold text-xl px-12 py-6 rounded-2xl hover:scale-110 transition-all duration-300 shadow-2xl">
                  Get Started Free
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeLayout2;