import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, MessageCircle, Globe, Award, Languages, Target, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AIAssistant } from '@/components/ui/AIAssistant';

const Home = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const autoRotateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      // Ensure video plays when component mounts
      const playVideo = async () => {
        try {
          // Wait for video to be ready
          if (videoRef.current?.readyState >= 2) {
            videoRef.current.playbackRate = 0.5; // Slow down video to half speed
            await videoRef.current.play();
            console.log('Video started playing at slow speed');
          } else {
            // Wait for video to be ready
            videoRef.current.addEventListener('canplay', async () => {
              try {
                videoRef.current!.playbackRate = 0.5; // Slow down video to half speed
                await videoRef.current?.play();
                console.log('Video started playing at slow speed after canplay event');
              } catch (error) {
                console.error('Error playing video after canplay:', error);
              }
            }, { once: true });
          }
        } catch (error) {
          console.error('Error playing video:', error);
        }
      };
      
      playVideo();
    }
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    autoRotateInterval.current = setInterval(() => {
      setCurrentPage((prev) => (prev === 0 ? 1 : 0));
    }, 5000); // Change every 5 seconds

    return () => {
      if (autoRotateInterval.current) {
        clearInterval(autoRotateInterval.current);
      }
    };
  }, []);

  const navigateCarousel = (direction: 'prev' | 'next') => {
    const newPage = direction === 'prev' 
      ? (currentPage === 0 ? 1 : 0)
      : (currentPage === 1 ? 0 : 1);
    
    setCurrentPage(newPage);
    
    // Reset auto-rotation timer
    if (autoRotateInterval.current) {
      clearInterval(autoRotateInterval.current);
    }
    autoRotateInterval.current = setInterval(() => {
      setCurrentPage((prev) => (prev === 0 ? 1 : 0));
    }, 5000);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    
    // Reset auto-rotation timer
    if (autoRotateInterval.current) {
      clearInterval(autoRotateInterval.current);
    }
    autoRotateInterval.current = setInterval(() => {
      setCurrentPage((prev) => (prev === 0 ? 1 : 0));
    }, 5000);
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
        {/* Premium Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary),0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary),0.02),transparent_50%)]"></div>
        
        {/* Floating Elements for Depth */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-primary/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-primary/30 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-primary/25 rounded-full animate-pulse delay-2000"></div>
      
             {/* Hero Section - Premium Redesign */}
       <section className="relative pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-20 md:pb-24 px-4 sm:px-6 lg:px-8">
        {/* Video Background */}
        <div className="absolute inset-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 0 }}
            onError={(e) => console.error('Video error:', e)}
            onLoadStart={() => console.log('Video loading started')}
            onCanPlay={() => console.log('Video can play')}
            onLoadedData={() => console.log('Video data loaded')}
            onPlay={() => console.log('Video is playing')}
            onPause={() => console.log('Video paused')}
            ref={videoRef}
          >
            <source src="/videos/pgirl.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Fallback background in case video doesn't load */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-background" style={{ zIndex: 0 }}></div>
          
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/50" style={{ zIndex: 1 }}></div>
        </div>
        
        <div className="container mx-auto text-center max-w-7xl relative" style={{ zIndex: 2 }}>
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in-up">
              <Sparkles className="h-4 w-4" />
              AI-Powered Learning Platform
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 sm:mb-8 leading-tight animate-fade-in-up text-white tracking-tight">
            Master English with{' '}
            <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent relative">
              AI-Powered Learning
              <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-white/90 mb-10 sm:mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-delayed px-4 font-light tracking-wide">
            Your personalized English tutor powered by artificial intelligence. Learn 
            <span className="text-white font-medium"> at your own pace</span> with interactive lessons, 
            <span className="text-white font-medium"> real-time feedback</span>, and 
            <span className="text-white font-medium"> cultural context</span>.
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

      {/* Features Section - Apple-Style Flip Cards with AI Reveal */}
      <section className="py-20 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 relative">
        {/* Section Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.05),transparent_70%)]"></div>
        </div>
        
        <div className="container mx-auto max-w-7xl relative">
          <div className="text-center mb-16 sm:mb-20 md:mb-24">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in-up">
              <Sparkles className="h-4 w-4" />
              Core Features
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 text-foreground animate-fade-in-up tracking-tight">
              Everything You Need To{' '}
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Master English
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto animate-fade-in-delayed px-4 font-light leading-relaxed tracking-wide">
              Hover over each card to discover the AI-powered features that make learning effortless and engaging
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-10 max-w-7xl mx-auto">
            {/* AI-Powered Lessons - Flip Card */}
            <div className="group perspective-1000 animate-fade-in-up stagger-1">
              <div className="relative w-full h-80 transition-transform duration-700 transform-style-preserve-3d group-hover:rotate-y-180">
                {/* Front of Card */}
                <div className="absolute inset-0 backface-hidden">
                  <Card className="w-full h-full bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden">
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
                </div>
                
                {/* Back of Card - AI Intelligence */}
                <div className="absolute inset-0 backface-hidden rotate-y-180">
                  <Card className="w-full h-full bg-gradient-to-br from-primary via-[#1582B4] to-primary/90 border-0 text-white overflow-hidden rounded-3xl">
                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-4 p-3 rounded-2xl bg-white/20">
                        <Brain className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">AI Intelligence</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <ul className="text-sm space-y-2 text-left">
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Real-time difficulty adjustment
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Context-aware explanations
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Personalized vocabulary focus
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Adaptive learning paths
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Conversational Practice - Flip Card */}
            <div className="group perspective-1000 animate-fade-in-up stagger-2">
              <div className="relative w-full h-80 transition-transform duration-700 transform-style-preserve-3d group-hover:rotate-y-180">
                {/* Front of Card */}
                <div className="absolute inset-0 backface-hidden">
                  <Card className="w-full h-full bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden">
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
                </div>
                
                {/* Back of Card - Natural Conversations */}
                <div className="absolute inset-0 backface-hidden rotate-y-180">
                  <Card className="w-full h-full bg-gradient-to-bl from-[#1582B4] via-primary to-[#1582B4]/90 border-0 text-white overflow-hidden rounded-3xl">
                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-4 p-3 rounded-2xl bg-white/20">
                        <MessageCircle className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Natural Conversations</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <ul className="text-sm space-y-2 text-left">
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Speech recognition & analysis
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Cultural context integration
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Real-time pronunciation feedback
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Multi-language support
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Global Learning - Flip Card */}
            <div className="group perspective-1000 animate-fade-in-up stagger-3">
              <div className="relative w-full h-80 transition-transform duration-700 transform-style-preserve-3d group-hover:rotate-y-180">
                {/* Front of Card */}
                <div className="absolute inset-0 backface-hidden">
                  <Card className="w-full h-full bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden">
                    <CardHeader className="text-center pb-6">
                      <div className="mx-auto mb-6 p-4 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                        <Globe className="h-10 w-10 text-primary" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-foreground">Global Learning</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center pb-8">
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        Access world-class English education with international standards
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Back of Card - World-Class Education */}
                <div className="absolute inset-0 backface-hidden rotate-y-180">
                  <Card className="w-full h-full bg-gradient-to-t from-primary via-[#1582B4] to-primary/90 border-0 text-white overflow-hidden rounded-3xl">
                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-4 p-3 rounded-2xl bg-white/20">
                        <Globe className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">World-Class Education</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <ul className="text-sm space-y-2 text-left">
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Dynamic lesson sequencing
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Goal-based learning tracks
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Progress-based adjustments
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          International standards
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Certified Learning - Flip Card */}
            <div className="group perspective-1000 animate-fade-in-up stagger-4">
              <div className="relative w-full h-80 transition-transform duration-700 transform-style-preserve-3d group-hover:rotate-y-180">
                {/* Front of Card */}
                <div className="absolute inset-0 backface-hidden">
                  <Card className="w-full h-full bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden">
                    <CardHeader className="text-center pb-6">
                      <div className="mx-auto mb-6 p-4 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                        <Award className="h-10 w-10 text-primary" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-foreground">Certified Learning</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center pb-8">
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        Earn recognized certificates and track your professional development
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Back of Card - Excellence Recognition */}
                <div className="absolute inset-0 backface-hidden rotate-y-180">
                  <Card className="w-full h-full bg-gradient-to-tr from-[#1582B4] via-primary to-[#1582B4]/90 border-0 text-white overflow-hidden rounded-3xl">
                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-4 p-3 rounded-2xl bg-white/20">
                        <Award className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Excellence Recognition</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <ul className="text-sm space-y-2 text-left">
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Achievement milestones
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Performance rewards
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Progress celebrations
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Motivation system
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Bilingual Support - Flip Card */}
            <div className="group perspective-1000 animate-fade-in-up stagger-5">
              <div className="relative w-full h-80 transition-transform duration-700 transform-style-preserve-3d group-hover:rotate-y-180">
                {/* Front of Card */}
                <div className="absolute inset-0 backface-hidden">
                  <Card className="w-full h-full bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden">
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
                </div>
                
                {/* Back of Card - Cultural Intelligence */}
                <div className="absolute inset-0 backface-hidden rotate-y-180">
                  <Card className="w-full h-full bg-gradient-to-l from-primary via-[#1582B4] to-primary/90 border-0 text-white overflow-hidden rounded-3xl">
                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-4 p-3 rounded-2xl bg-white/20">
                        <Languages className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Cultural Intelligence</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <ul className="text-sm space-y-2 text-left">
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Multi-language interface
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Cultural context integration
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Localized examples
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Regional learning paths
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Progress & Analytics - Flip Card */}
            <div className="group perspective-1000 animate-fade-in-up stagger-6">
              <div className="relative w-full h-80 transition-transform duration-700 transform-style-preserve-3d group-hover:rotate-y-180">
                {/* Front of Card */}
                <div className="absolute inset-0 backface-hidden">
                  <Card className="w-full h-full bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden">
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
                
                {/* Back of Card - Smart Analytics */}
                <div className="absolute inset-0 backface-hidden rotate-y-180">
                  <Card className="w-full h-full bg-gradient-to-r from-[#1582B4] via-primary to-[#1582B4]/90 border-0 text-white overflow-hidden rounded-3xl">
                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-4 p-3 rounded-2xl bg-white/20">
                        <Target className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Smart Analytics</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <ul className="text-sm space-y-2 text-left">
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Real-time progress tracking
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          AI-powered insights
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Performance predictions
                        </li>
                        <li className="flex items-center text-white">
                          <CheckCircle className="h-4 w-4 mr-2 text-white/90" />
                          Learning optimization
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Premium Redesign with Carousel */}
      <section className="py-20 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 relative bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900/50 dark:via-blue-900/20 dark:to-indigo-900/10">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.08),transparent_50%)]"></div>
        </div>
        
        <div className="container mx-auto max-w-7xl relative">
          <div className="text-center mb-16 sm:mb-20 md:mb-24">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in-up">
              <Sparkles className="h-4 w-4" />
              Student Success Stories
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 text-foreground animate-fade-in-up tracking-tight">
              Loved By{' '}
              <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Learners Worldwide
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto animate-fade-in-delayed px-4 font-light leading-relaxed tracking-wide">
              Join thousands of satisfied students who have transformed their English skills with our AI-powered platform
            </p>
          </div>
          
          {/* Testimonials Carousel */}
          <div className="relative">
            {/* Carousel Container */}
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-700 ease-out" 
                style={{ 
                  width: '200%',
                  transform: `translateX(-${currentPage * 50}%)`
                }}
              >
                {/* Page 1 - First 3 testimonials */}
                <div className="flex w-1/2 gap-8 lg:gap-10 flex-shrink-0 px-4">
                  <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden flex flex-col flex-1 animate-slide-in-left stagger-1">
                    <CardHeader className="text-center pb-6">
                      <div className="flex items-center mb-4">
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Sparkles key={i} className="h-4 w-4 text-primary" />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-center pb-8 flex-1 flex flex-col">
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

                  <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden flex flex-col flex-1 animate-fade-in-up stagger-2">
                    <CardHeader className="text-center pb-6">
                      <div className="flex items-center mb-4">
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Sparkles key={i} className="h-4 w-4 text-primary" />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-center pb-8 flex-1 flex flex-col">
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

                  <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden flex flex-col flex-1 animate-slide-in-right stagger-3">
                    <CardHeader className="text-center pb-6">
                      <div className="flex items-center mb-4">
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Sparkles key={i} className="h-4 w-4 text-primary" />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-center pb-8 flex-1 flex flex-col">
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

                {/* Page 2 - Additional 3 testimonials */}
                <div className="flex w-1/2 gap-8 lg:gap-10 flex-shrink-0 px-4">
                  <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden flex flex-col flex-1">
                    <CardHeader className="text-center pb-6">
                      <div className="flex items-center mb-4">
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Sparkles key={i} className="h-4 w-4 text-primary" />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-center pb-8 flex-1 flex flex-col">
                      <p className="text-muted-foreground mb-8 text-lg leading-relaxed italic flex-1">
                        "The AI feedback is incredibly accurate. It's helped me improve my pronunciation dramatically in just weeks."
                      </p>
                      <div className="flex items-center space-x-4 mt-auto">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-foreground font-bold text-lg">RJ</span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-lg">Rajesh Kumar</p>
                          <p className="text-muted-foreground">Software Engineer</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden flex flex-col flex-1">
                    <CardHeader className="text-center pb-6">
                      <div className="flex items-center mb-4">
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Sparkles key={i} className="h-4 w-4 text-primary" />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-center pb-8 flex-1 flex flex-col">
                      <p className="text-muted-foreground mb-8 text-lg leading-relaxed italic flex-1">
                        "Perfect for busy professionals. I can practice during my commute and the lessons adapt to my schedule."
                      </p>
                      <div className="flex items-center space-x-4 mt-auto">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-foreground font-bold text-lg">LM</span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-lg">Lisa Martinez</p>
                          <p className="text-muted-foreground">Marketing Manager</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-3xl overflow-hidden flex flex-col flex-1">
                    <CardHeader className="text-center pb-6">
                      <div className="flex items-center mb-4">
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Sparkles key={i} className="h-4 w-4 text-primary" />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-center pb-8 flex-1 flex flex-col">
                      <p className="text-muted-foreground mb-8 text-lg leading-relaxed italic flex-1">
                        "The cultural insights make learning so much more meaningful. I feel confident speaking in any situation now."
                      </p>
                      <div className="flex items-center space-x-4 mt-auto">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-foreground font-bold text-lg">YC</span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-lg">Yuki Chen</p>
                          <p className="text-muted-foreground">International Student</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Carousel Navigation */}
            <div className="flex justify-center items-center mt-12 space-x-4">
              {/* Previous Button */}
              <button 
                onClick={() => navigateCarousel('prev')}
                className="p-3 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 shadow-lg hover:shadow-xl group"
                aria-label="Previous testimonials"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Page Indicators */}
              <div className="flex space-x-2">
                <button 
                  onClick={() => goToPage(0)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 hover:scale-125 ${
                    currentPage === 0 ? 'bg-primary shadow-lg shadow-primary/50' : 'bg-slate-300 dark:bg-slate-600 hover:bg-primary'
                  }`}
                  aria-label="Go to page 1"
                ></button>
                <button 
                  onClick={() => goToPage(1)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 hover:scale-125 ${
                    currentPage === 1 ? 'bg-primary shadow-lg shadow-primary/50' : 'bg-primary'
                  }`}
                  aria-label="Go to page 2"
                ></button>
              </div>

              {/* Next Button */}
              <button 
                onClick={() => navigateCarousel('next')}
                className="p-3 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 shadow-lg hover:shadow-xl group"
                aria-label="Next testimonials"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(var(--primary),0.08),transparent_60%)]"></div>
        </div>
        
        <div className="container mx-auto text-center relative">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-primary via-[#1582B4] to-primary/90 rounded-3xl p-6 sm:p-8 md:p-12 hover-scale transition-all duration-500 animate-scale-in shadow-2xl shadow-primary/20">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                Ready to Start?
              </div>
              
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Ready to Transform Your English Skills?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto tracking-wide">
                Join thousands of learners who have already improved their English with our AI-powered platform.
              </p>
              <Button size="lg" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white font-semibold text-base sm:text-lg px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-6 rounded-xl hover-scale transition-all duration-300 shadow-lg hover:shadow-xl">
                Get Started Today
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Minimalist Footer */}
      <footer className="py-16 px-4 border-t border-border/20 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(var(--primary),0.03),transparent_70%)]"></div>
        </div>
        
        <div className="container mx-auto max-w-7xl relative">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3 group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 overflow-hidden">
                <img src="/lovable-uploads/016ec8c7-bb16-4595-ab96-d96c8c779aa2.png" alt="DIL Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-semibold text-foreground">LMS with AI Tutor</span>
            </div>
            
            {/* Copyright */}
            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground">
                © 2024 AI Tutor. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
      </div>
      <AIAssistant />
    </>
  );
};

export default Home;
