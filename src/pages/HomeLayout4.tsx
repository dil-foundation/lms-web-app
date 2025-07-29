import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Brain, MessageCircle, Globe, Award, Languages, Target, ArrowRight, Sparkles, Play, Zap, Star, Rocket, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';

const HomeLayout4 = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const features = [
    { icon: Brain, title: "AI-Powered Lessons", desc: "Interactive and adaptive English learning" },
    { icon: MessageCircle, title: "Conversational Practice", desc: "Speak with your tutor in real-time" },
    { icon: Globe, title: "Structured Learning Paths", desc: "Follow guided curriculum aligned to goals" },
    { icon: Award, title: "Verifiable Credentials", desc: "Earn certifications recognized with sponsors" },
    { icon: Languages, title: "Bilingual Support", desc: "Learn easily with bilingual (English & Urdu) support" },
    { icon: Target, title: "Progress & Analytics", desc: "Visualize improvement with data" }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Get current feature icon component
  const CurrentFeatureIcon = features[currentFeature].icon;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <Header />
      
      {/* Dynamic mouse follower */}
      <div 
        className="fixed w-6 h-6 bg-primary/20 rounded-full pointer-events-none z-50 transition-all duration-300 ease-out"
        style={{
          left: mousePosition.x - 12,
          top: mousePosition.y - 12,
          transform: 'scale(1)',
        }}
      />

      {/* Interactive Particle Hero */}
      <section className="relative pt-20 pb-20 px-4 min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 bg-primary/30 rounded-full animate-float`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="container mx-auto relative z-10">
          <div className="text-center space-y-8 max-w-6xl mx-auto">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="relative inline-block mb-8">
                <h1 className="text-5xl sm:text-6xl md:text-8xl font-black leading-tight">
                  Master English with{' '}
                  <span className="relative inline-block">
                    <span className="text-primary">
                      AI-Powered
                    </span>
                    <div className="absolute -inset-2 bg-primary/20 blur-lg animate-pulse"></div>
                  </span>
                  {' '}Learning
                </h1>
                
                {/* Interactive floating icons */}
                <div className="absolute -top-8 -left-8 animate-bounce">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Rocket className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="absolute -top-4 -right-12 animate-bounce delay-500">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="absolute -bottom-6 left-1/4 animate-bounce delay-1000">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Heart className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-12">
                Your personalized English tutor powered by artificial intelligence. Learn 
                at your own pace with interactive lessons, real-time feedback, and 
                cultural context that adapts to your learning style.
              </p>
            </div>

            <div className={`transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link to="/auth">
                  <Button 
                    size="lg" 
                    className="group relative bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xl px-12 py-6 rounded-2xl transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-primary/25 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                    <span className="relative z-10 flex items-center">
                      Start Learning
                      <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="group border-2 border-primary text-primary hover:bg-primary/10 text-xl px-12 py-6 rounded-2xl transition-all duration-500 hover:scale-110 hover:shadow-xl"
                >
                  <Play className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
                  Interactive Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Rotating Features Showcase */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-8 text-primary">
              Everything You Need To Master English
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
              Discover our powerful features through interactive exploration
            </p>
          </div>

          {/* Central rotating display */}
          <div className="relative max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="relative inline-block">
                <div className={`w-32 h-32 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center transition-all duration-500 hover:scale-110`}>
                  <CurrentFeatureIcon className={`h-16 w-16 text-primary animate-pulse`} />
                </div>
                <h3 className="text-3xl font-bold mb-4 transition-all duration-500 text-primary">
                  {features[currentFeature].title}
                </h3>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  {features[currentFeature].desc}
                </p>
              </div>
            </div>

            {/* Feature selection circles */}
            <div className="flex justify-center space-x-4 mb-12">
              {features.map((feature, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeature(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    index === currentFeature 
                      ? `bg-primary scale-125` 
                      : 'bg-muted hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>

            {/* Interactive feature grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all duration-500 hover:scale-105 ${
                      index === currentFeature 
                        ? `bg-primary/5 border-primary shadow-lg shadow-primary/20` 
                        : 'bg-card border-border hover:shadow-lg'
                    }`}
                    onClick={() => setCurrentFeature(index)}
                  >
                    <CardHeader className="text-center">
                      <div className={`mx-auto mb-4 p-4 rounded-2xl transition-all duration-300 ${
                        index === currentFeature 
                          ? `bg-primary/20 scale-110` 
                          : `bg-primary/10 hover:bg-primary/20`
                      }`}>
                        <FeatureIcon className={`h-8 w-8 text-primary`} />
                      </div>
                      <CardTitle className={`text-lg ${
                        index === currentFeature 
                          ? `text-primary` 
                          : ''
                      }`}>
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Testimonials Carousel */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-8 text-primary">
              Loved By Learners Worldwide
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Interactive success stories from our learning community
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { name: "Sarah Ahmed", role: "Student", quote: "AI Tutor has completely transformed how I learn English. The personalized approach makes all the difference.", avatar: "👩‍🎓" },
              { name: "Mohammad Khan", role: "Professional", quote: "The cultural context and real-world scenarios have helped me understand English in practical situations.", avatar: "👨‍💼" },
              { name: "Fatima Ali", role: "Business Owner", quote: "I love how the app adapts to my learning style. It's like having a personal tutor available 24/7.", avatar: "👩‍💻" }
            ].map((testimonial, index) => (
              <Card 
                key={index}
                className={`group bg-card border-border hover:scale-105 transition-all duration-700 cursor-pointer hover:shadow-xl hover:shadow-primary/20`}
              >
                <CardHeader>
                  <div className="flex items-center mb-4">
                    <div className={`w-16 h-16 bg-primary rounded-full flex items-center justify-center text-2xl mr-4 group-hover:scale-110 transition-transform`}>
                      {testimonial.avatar}
                    </div>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-primary fill-current animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed group-hover:text-foreground transition-colors">
                    "{testimonial.quote}"
                  </p>
                  <div>
                    <p className="font-bold text-foreground text-xl">{testimonial.name}</p>
                    <p className={`text-primary font-medium`}>{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive CTA with Animated Elements */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary"></div>
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-primary-foreground/20 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${4 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <Rocket className="h-16 w-16 text-primary-foreground mx-auto mb-6 animate-bounce" />
            </div>
            <h2 className="text-4xl md:text-7xl font-bold mb-8 text-primary-foreground leading-tight animate-pulse">
              Start Your English Learning Journey Today
            </h2>
            <p className="text-xl md:text-2xl text-primary-foreground/90 mb-16 max-w-4xl mx-auto leading-relaxed">
              Join thousands of learners who have achieved fluency with AI Tutor
            </p>
            
            <div className="space-y-8">
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="group relative bg-background text-primary hover:bg-background/90 font-bold text-2xl px-16 py-8 rounded-2xl transition-all duration-500 hover:scale-110 shadow-2xl overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                  <span className="relative z-10 flex items-center">
                    Get Started Free
                    <Zap className="ml-4 h-8 w-8 group-hover:scale-110 transition-transform" />
                  </span>
                </Button>
              </Link>
              
              <div className="flex justify-center space-x-12 text-primary-foreground/80">
                <div className="text-center">
                  <div className="text-3xl font-bold animate-counter">10K+</div>
                  <div className="text-sm">Active Learners</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold animate-counter">50+</div>
                  <div className="text-sm">Countries</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold animate-counter">95%</div>
                  <div className="text-sm">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeLayout4;