import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Brain, MessageCircle, Globe, Award, Languages, Target, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary),0.03),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary),0.02),transparent_50%)]"></div>
      
      <Header />
      
             {/* Hero Section - Premium Redesign */}
       <section className="relative pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-20 md:pb-24 px-4 sm:px-6 lg:px-8">
         <div className="container mx-auto text-center max-w-7xl">
           <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 sm:mb-8 leading-tight animate-fade-in-up">
             Master English with{' '}
             <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
               AI-Powered Learning
             </span>
           </h1>
           
           <p className="text-xl sm:text-2xl text-muted-foreground mb-10 sm:mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-delayed px-4 font-light">
             Your personalized English tutor powered by artificial intelligence. Learn 
             at your own pace with interactive lessons, real-time feedback, and 
             cultural context.
           </p>
           
           <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center animate-fade-in-delayed stagger-2 px-4">
             <Link to="/auth" className="w-full sm:w-auto group">
               <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-8 sm:px-10 py-4 sm:py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                 Start Learning
                 <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
               </Button>
             </Link>
             <Button variant="outline" size="lg" className="w-full sm:w-auto border-2 text-white hover:bg-[#1582B4]/90 hover:border-[#1582B4]/50 font-semibold text-lg px-8 sm:px-10 py-4 sm:py-5 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-md" style={{ backgroundColor: '#1582B4', borderColor: '#1582B4' }}>
               Watch Demo
             </Button>
           </div>
         </div>
       </section>

      {/* Features Section - Premium Redesign */}
      <section className="py-20 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 sm:mb-20 md:mb-24">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 text-foreground animate-fade-in-up">
              Everything You Need To{' '}
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Master English
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto animate-fade-in-delayed px-4 font-light leading-relaxed">
              Comprehensive features designed to make English learning effective, enjoyable, and accessible for young minds.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-10 max-w-7xl mx-auto">
            <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-fade-in-up stagger-1 rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-6 p-4 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                  <Brain className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">AI-Powered Lessons</CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Interactive and adaptive English learning with personalized content
                </p>
              </CardContent>
            </Card>

            <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-fade-in-up stagger-2 rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-6 p-4 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                  <MessageCircle className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">Conversational Practice</CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Speak with your tutor in real-time with natural language processing
                </p>
              </CardContent>
            </Card>

            <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-fade-in-up stagger-3 rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-6 p-4 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                  <Globe className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">Structured Learning Paths</CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Follow guided curriculum aligned to your specific goals and level
                </p>
              </CardContent>
            </Card>

            <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-fade-in-up stagger-4 rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-6 p-4 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                  <Award className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">Verifiable Credentials</CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Earn certifications recognized by leading educational institutions
                </p>
              </CardContent>
            </Card>

            <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-fade-in-up stagger-5 rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-6 p-4 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                  <Languages className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">Bilingual Support</CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Learn easily with bilingual (English & Urdu) support and cultural context
                </p>
              </CardContent>
            </Card>

            <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-fade-in-up stagger-6 rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-6 p-4 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">Progress & Analytics</CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Visualize your improvement with detailed analytics and insights
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Premium Redesign */}
      <section className="py-20 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 sm:mb-20 md:mb-24">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 text-foreground animate-fade-in-up">
              Loved By{' '}
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Learners Worldwide
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto animate-fade-in-delayed px-4 font-light leading-relaxed">
              Join thousands of satisfied students who have transformed their English skills with our AI-powered platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-10 max-w-7xl mx-auto">
            <Card className="group bg-card/90 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-slide-in-left stagger-1 rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="pb-6">
                <div className="flex items-center mb-4">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-4 w-4 text-primary" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-8 flex-1 flex flex-col">
                <p className="text-muted-foreground mb-8 text-lg leading-relaxed italic flex-1">
                  "AI Tutor has completely transformed how I learn English. The 
                  personalized approach makes all the difference in my learning journey."
                </p>
                <div className="flex items-center space-x-4 mt-auto">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-lg">SA</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-lg">Sarah Ahmed</p>
                    <p className="text-muted-foreground">Student</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-card/90 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-fade-in-up stagger-2 rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="pb-6">
                <div className="flex items-center mb-4">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-4 w-4 text-primary" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-8 flex-1 flex flex-col">
                <p className="text-muted-foreground mb-8 text-lg leading-relaxed italic flex-1">
                  "The cultural context and real-world scenarios have helped me understand English in practical situations."
                </p>
                <div className="flex items-center space-x-4 mt-auto">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-lg">MK</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-lg">Mohammad Khan</p>
                    <p className="text-muted-foreground">Professional</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-card/90 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-slide-in-right stagger-3 rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="pb-6">
                <div className="flex items-center mb-4">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-4 w-4 text-primary" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-8 flex-1 flex flex-col">
                <p className="text-muted-foreground mb-8 text-lg leading-relaxed italic flex-1">
                  "I love how the app adapts to my learning style. It's like having a personal tutor available 24/7."
                </p>
                <div className="flex items-center space-x-4 mt-auto">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-lg">FA</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-lg">Fatima Ali</p>
                    <p className="text-muted-foreground">Business Owner</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-primary via-primary to-[#1582B4] rounded-3xl p-6 sm:p-8 md:p-12 hover-scale transition-all duration-500 animate-scale-in">
            <div className="text-center space-y-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to Transform Your English Skills?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join thousands of learners who have already improved their English with our AI-powered platform.
              </p>
              <Button size="lg" className="bg-[#1582B4] hover:bg-[#1582B4]/90 text-white font-semibold text-base sm:text-lg px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-6 rounded-xl hover-scale transition-all duration-300">
                Get Started Today
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
