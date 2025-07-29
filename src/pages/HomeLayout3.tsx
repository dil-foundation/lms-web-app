import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Brain, MessageCircle, Globe, Award, Languages, Target, ArrowRight, Sparkles, BookOpen, Users, Zap } from 'lucide-react';

const HomeLayout3 = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <Header />
      
      {/* Story-driven Hero - Chapter 1 */}
      <section className="relative pt-20 pb-32 px-4 bg-gradient-to-br from-background via-primary/5 to-background">
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(0,0,0,0.02) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center space-y-8 max-w-5xl mx-auto">
            <div className="animate-float">
              <span className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                📖 Chapter 1: Your Journey Begins
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-8">
                Once upon a time, there was a{' '}
                <span className="relative">
                  <span className="text-primary">
                    learner
                  </span>
                  <span className="absolute -bottom-2 left-0 right-0 h-1 bg-primary rounded-full animate-pulse"></span>
                </span>
                {' '}just like you...
              </h1>
            </div>
            <div className="animate-fade-in-up delay-500">
              <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-12">
                Who dreamed of mastering English with the help of AI-powered learning. 
                This is the story of how personalized tutoring, real-time feedback, 
                and cultural context transformed their language journey forever.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-10 py-6 rounded-full hover:scale-110 transition-all duration-500 shadow-2xl hover:shadow-primary/25 group">
                    Begin Your Story
                    <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="border-2 border-primary text-primary hover:bg-primary/10 text-lg px-10 py-6 rounded-full hover:scale-110 transition-all duration-500 group">
                  <BookOpen className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
                  Preview the Adventure
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating story elements */}
        <div className="absolute top-32 left-10 animate-bounce delay-1000">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="absolute top-48 right-10 animate-bounce delay-1500">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Brain className="h-10 w-10 text-primary" />
          </div>
        </div>
        <div className="absolute bottom-32 left-1/4 animate-float delay-2000">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
        </div>
      </section>

      {/* Chapter 2: The Tools of Transformation */}
      <section className="py-32 px-4 relative">
        <div className="container mx-auto">
          <div className="text-center mb-20 animate-fade-in-up">
            <span className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              ⚡ Chapter 2: The Magical Tools
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-8 text-primary">
              Every hero needs the right tools for their quest
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Our protagonist discovered six powerful abilities that would transform their English learning adventure forever.
            </p>
          </div>
          
          {/* Story timeline */}
          <div className="relative max-w-6xl mx-auto">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-primary opacity-30"></div>
            
            {/* Timeline items */}
            <div className="space-y-24">
              {/* First tool */}
              <div className="flex items-center justify-between animate-slide-in-left">
                <div className="w-5/12">
                  <Card className="bg-card border-border hover:scale-105 transition-all duration-500">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-4 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors duration-300">
                        <Brain className="h-12 w-12 text-primary" />
                      </div>
                      <CardTitle className="text-2xl text-primary">AI-Powered Lessons</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-muted-foreground text-lg">
                        The first tool: Interactive and adaptive English learning that responds to every learner's unique pace.
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <div className="w-2/12 flex justify-center">
                  <div className="w-8 h-8 bg-primary rounded-full animate-pulse"></div>
                </div>
                <div className="w-5/12"></div>
              </div>

              {/* Second tool */}
              <div className="flex items-center justify-between animate-slide-in-right">
                <div className="w-5/12"></div>
                <div className="w-2/12 flex justify-center">
                  <div className="w-8 h-8 bg-primary rounded-full animate-pulse delay-300"></div>
                </div>
                <div className="w-5/12">
                  <Card className="bg-card border-border hover:scale-105 transition-all duration-500">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-4 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors duration-300">
                        <MessageCircle className="h-12 w-12 text-primary" />
                      </div>
                      <CardTitle className="text-2xl text-primary">Conversational Practice</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-muted-foreground text-lg">
                        The second power: Real-time conversations that build confidence and fluency naturally.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Third tool */}
              <div className="flex items-center justify-between animate-slide-in-left">
                <div className="w-5/12">
                  <Card className="bg-card border-border hover:scale-105 transition-all duration-500">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-4 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors duration-300">
                        <Globe className="h-12 w-12 text-primary" />
                      </div>
                      <CardTitle className="text-2xl text-primary">Structured Learning Paths</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-muted-foreground text-lg">
                        The third gift: Guided curriculum that leads learners step by step toward their goals.
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <div className="w-2/12 flex justify-center">
                  <div className="w-8 h-8 bg-primary rounded-full animate-pulse delay-600"></div>
                </div>
                <div className="w-5/12"></div>
              </div>

              {/* Fourth tool */}
              <div className="flex items-center justify-between animate-slide-in-right">
                <div className="w-5/12"></div>
                <div className="w-2/12 flex justify-center">
                  <div className="w-8 h-8 bg-primary rounded-full animate-pulse delay-900"></div>
                </div>
                <div className="w-5/12">
                  <Card className="bg-card border-border hover:scale-105 transition-all duration-500">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-4 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors duration-300">
                        <Award className="h-12 w-12 text-primary" />
                      </div>
                      <CardTitle className="text-2xl text-primary">Verifiable Credentials</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-muted-foreground text-lg">
                        The fourth treasure: Recognized certifications that open doors to new opportunities.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Fifth tool */}
              <div className="flex items-center justify-between animate-slide-in-left">
                <div className="w-5/12">
                  <Card className="bg-card border-border hover:scale-105 transition-all duration-500">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-4 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors duration-300">
                        <Languages className="h-12 w-12 text-primary" />
                      </div>
                      <CardTitle className="text-2xl text-primary">Bilingual Support</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-muted-foreground text-lg">
                        The fifth wisdom: Learning in both English and Urdu, making complex concepts clear.
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <div className="w-2/12 flex justify-center">
                  <div className="w-8 h-8 bg-primary rounded-full animate-pulse delay-1200"></div>
                </div>
                <div className="w-5/12"></div>
              </div>

              {/* Sixth tool */}
              <div className="flex items-center justify-between animate-slide-in-right">
                <div className="w-5/12"></div>
                <div className="w-2/12 flex justify-center">
                  <div className="w-8 h-8 bg-primary rounded-full animate-pulse delay-1500"></div>
                </div>
                <div className="w-5/12">
                  <Card className="bg-card border-border hover:scale-105 transition-all duration-500">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-4 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors duration-300">
                        <Target className="h-12 w-12 text-primary" />
                      </div>
                      <CardTitle className="text-2xl text-primary">Progress Analytics</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-muted-foreground text-lg">
                        The final power: Clear visualization of growth and achievement along the journey.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 3: Tales from Fellow Travelers */}
      <section className="py-32 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-20 animate-fade-in-up">
            <span className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              🌟 Chapter 3: Tales from Fellow Travelers
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-8 text-primary">
              Stories from the learning kingdom
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Along the way, our hero met other learners who shared their transformation stories.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <Card className="bg-card border-border hover:scale-105 transition-all duration-700 animate-story-float delay-100">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mr-4">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-5 w-5 text-primary fill-current" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">
                  "Once I was struggling with English, but AI Tutor became my guide. 
                  Now I speak with confidence in every situation!"
                </p>
                <div>
                  <p className="font-bold text-foreground text-xl">Sarah Ahmed</p>
                  <p className="text-muted-foreground">The Determined Student</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:scale-105 transition-all duration-700 animate-story-float delay-300">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mr-4">
                    <Zap className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-5 w-5 text-primary fill-current" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">
                  "The cultural context opened my eyes! I finally understand 
                  English not just as words, but as a living language."
                </p>
                <div>
                  <p className="font-bold text-foreground text-xl">Mohammad Khan</p>
                  <p className="text-muted-foreground">The Cultural Explorer</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:scale-105 transition-all duration-700 animate-story-float delay-500">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mr-4">
                    <BookOpen className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="h-5 w-5 text-primary fill-current" />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">
                  "Like having a wise mentor available day and night. 
                  My English learning adventure never stops!"
                </p>
                <div>
                  <p className="font-bold text-foreground text-xl">Fatima Ali</p>
                  <p className="text-muted-foreground">The Lifelong Learner</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Chapter 4: The Grand Adventure Awaits */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary"></div>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 70px)`
        }}></div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-5xl mx-auto animate-epic-entrance">
            <span className="inline-block bg-primary-foreground/20 text-primary-foreground px-6 py-3 rounded-full text-lg font-medium mb-8">
              🏆 Chapter 4: Your Epic Begins Now
            </span>
            <h2 className="text-4xl md:text-7xl font-bold mb-8 text-primary-foreground leading-tight">
              The greatest adventure starts with a single step
            </h2>
            <p className="text-xl md:text-2xl text-primary-foreground/90 mb-16 max-w-4xl mx-auto leading-relaxed">
              Every master was once a beginner. Every legend started with courage. 
              Your English mastery story is waiting to unfold.
            </p>
            <div className="space-y-6">
              <Link to="/auth">
                <Button size="lg" className="bg-background text-primary hover:bg-background/90 font-bold text-xl md:text-2xl px-16 py-8 rounded-full hover:scale-110 transition-all duration-500 shadow-2xl group">
                  Write Your Success Story
                  <ArrowRight className="ml-4 h-8 w-8 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
              <p className="text-primary-foreground/80 text-lg">
                Join thousands of heroes who transformed their English skills
              </p>
            </div>
          </div>
        </div>

        {/* Floating story elements for finale */}
        <div className="absolute top-20 left-10 animate-float">
          <div className="w-20 h-20 bg-primary-foreground/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <BookOpen className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        <div className="absolute top-32 right-10 animate-float delay-500">
          <div className="w-16 h-16 bg-primary-foreground/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <div className="absolute bottom-20 left-1/4 animate-float delay-1000">
          <div className="w-24 h-24 bg-primary-foreground/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Award className="h-12 w-12 text-primary-foreground" />
          </div>
        </div>
        <div className="absolute bottom-32 right-1/4 animate-float delay-1500">
          <div className="w-18 h-18 bg-primary-foreground/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Target className="h-9 w-9 text-primary-foreground" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeLayout3;