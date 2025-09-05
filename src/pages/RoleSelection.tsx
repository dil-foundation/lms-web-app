import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, ArrowRight } from 'lucide-react';
import { useRef, useEffect } from 'react';

const RoleSelection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleCanPlay = () => {
        video.playbackRate = 0.3;
      };
      
      // Set playback rate immediately if video is already loaded
      if (video.readyState >= 2) {
        video.playbackRate = 0.3;
      }
      
      // Also set it when video becomes ready to play
      video.addEventListener('canplay', handleCanPlay);
      
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, []);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        >
          <source src="/videos/login1.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Fallback background in case video doesn't load */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-background" style={{ zIndex: 0 }}></div>
        
        {/* Video background without dark overlay for maximum visibility */}
      </div>
      
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary),0.03),transparent_50%)]" style={{ zIndex: 2 }}></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary),0.02),transparent_50%)]" style={{ zIndex: 2 }}></div>
      
      {/* Abstract Global Flair Background */}
      <div className="absolute inset-0 opacity-30" style={{ zIndex: 2 }}>
        {/* Floating Geometric Shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-[#1582B4]/15 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-20 w-20 h-20 bg-gradient-to-br from-primary/8 to-transparent rounded-full blur-xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-40 w-28 h-28 bg-gradient-to-br from-[#1582B4]/12 to-transparent rounded-full blur-xl animate-pulse delay-1500"></div>
        
        {/* Global Connection Lines */}
        <div className="absolute top-1/4 left-1/4 w-px h-32 bg-gradient-to-b from-transparent via-primary/20 to-transparent"></div>
        <div className="absolute top-1/3 right-1/3 w-24 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        <div className="absolute bottom-1/3 left-1/3 w-px h-20 bg-gradient-to-b from-transparent via-primary/20 to-transparent"></div>
        <div className="absolute bottom-1/4 right-1/4 w-20 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        
        {/* Cultural Elements */}
        <div className="absolute top-1/2 left-10 text-4xl opacity-10 animate-bounce">🌍</div>
        <div className="absolute top-1/3 right-10 text-3xl opacity-10 animate-bounce delay-1000">🎓</div>
        <div className="absolute bottom-1/3 left-20 text-3xl opacity-10 animate-bounce delay-2000">🚀</div>
        <div className="absolute bottom-1/2 right-20 text-4xl opacity-10 animate-bounce delay-1500">💡</div>
      </div>
      
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 opacity-20" style={{ zIndex: 2 }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.08),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(var(--primary),0.02),transparent_25%,rgba(var(--primary),0.02))]"></div>
      </div>
      
      <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ zIndex: 3 }}>
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-12">
            {/* Global Flair Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in-up">
              <span className="text-lg">🌍</span>
              Global Learning Platform
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent tracking-tight">
              Welcome to DIL
            </h1>
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl px-6 py-4 mb-8">
              <p className="text-xl text-white font-medium tracking-wide mb-2">Choose your role to get started</p>
              <p className="text-base text-white/90 font-light">Join our global community of learners and educators</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 rounded-3xl overflow-hidden relative">
              {/* Card Background Pattern */}
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-primary/20 to-transparent rounded-full"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-[#1582B4]/20 to-transparent rounded-full"></div>
              </div>
              
              <CardHeader className="text-center pb-6 relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <GraduationCap className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">I'm a Student</CardTitle>
                <CardDescription className="text-lg leading-relaxed">
                  Access learning materials and track your progress
                </CardDescription>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                  <span>🎯</span>
                  <span>Personalized Learning</span>
                </div>
              </CardHeader>
              <CardContent className="pb-8 relative z-10">
                <Link to="/auth/student">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                    Continue as Student
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 rounded-3xl overflow-hidden relative">
              {/* Card Background Pattern */}
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-[#1582B4]/20 to-transparent rounded-full"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-primary/20 to-transparent rounded-full"></div>
              </div>
              
              <CardHeader className="text-center pb-6 relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-[#1582B4]/10 to-[#1582B4]/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Users className="w-10 h-10 text-[#1582B4]" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">I'm a Teacher</CardTitle>
                <CardDescription className="text-lg leading-relaxed">
                  Manage students and create learning experiences
                </CardDescription>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                  <span>🌟</span>
                  <span>Empower Learners</span>
                </div>
              </CardHeader>
              <CardContent className="pb-8 relative z-10">
                <Link to="/auth/teacher">
                  <Button className="w-full bg-[#1582B4] hover:bg-[#1582B4]/90 text-white font-semibold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
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
    </>
  );
};

export default RoleSelection;
