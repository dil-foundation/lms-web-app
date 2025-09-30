import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, MessageCircle, Globe, Award, Languages, Target, Sparkles, CheckCircle } from 'lucide-react';
import { APEX } from '@/components/ui/AIAssistant';

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Lessons",
      description: "Interactive and adaptive English learning with personalized content",
      details: [
        "Real-time difficulty adjustment",
        "Context-aware explanations",
        "Personalized vocabulary focus",
        "Adaptive learning paths"
      ],
      gradient: "from-primary via-[#1582B4] to-primary/90"
    },
    {
      icon: MessageCircle,
      title: "Conversational Practice",
      description: "Speak with your tutor in real-time with natural language processing",
      details: [
        "Speech recognition & analysis",
        "Cultural context integration",
        "Real-time pronunciation feedback",
        "Multi-language support"
      ],
      gradient: "from-[#1582B4] via-primary to-[#1582B4]/90"
    },
    {
      icon: Globe,
      title: "Global Learning",
      description: "Access world-class English education with international standards",
      details: [
        "Dynamic lesson sequencing",
        "Goal-based learning tracks",
        "Progress-based adjustments",
        "International standards"
      ],
      gradient: "from-primary via-[#1582B4] to-primary/90"
    },
    {
      icon: Award,
      title: "Certified Learning",
      description: "Earn recognized certificates and track your professional development",
      details: [
        "Achievement milestones",
        "Performance rewards",
        "Progress celebrations",
        "Motivation system"
      ],
      gradient: "from-[#1582B4] via-primary to-[#1582B4]/90"
    },
    {
      icon: Languages,
      title: "Bilingual Support",
      description: "Learn easily with bilingual (English & Urdu) support and cultural context",
      details: [
        "Multi-language interface",
        "Cultural context integration",
        "Localized examples",
        "Regional learning paths"
      ],
      gradient: "from-primary via-[#1582B4] to-primary/90"
    },
    {
      icon: Target,
      title: "Progress & Analytics",
      description: "Visualize your improvement with detailed analytics and insights",
      details: [
        "Real-time progress tracking",
        "AI-powered insights",
        "Performance predictions",
        "Learning optimization"
      ],
      gradient: "from-[#1582B4] via-primary to-[#1582B4]/90"
    }
  ];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
        {/* Premium Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary),0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary),0.02),transparent_50%)]"></div>
        
        {/* Hero Section */}
        <section className="relative pt-20 sm:pt-24 md:pt-32 lg:pt-40 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto text-center max-w-7xl relative">
            <div className="mb-6 md:mb-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium mb-4 md:mb-6 animate-fade-in-up">
                <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
                Platform Features
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 md:mb-8 leading-tight animate-fade-in-up text-foreground tracking-tight">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent relative block sm:inline">
                Master English
                <div className="absolute -bottom-1 md:-bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 md:mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-delayed px-2 sm:px-4 font-light tracking-wide">
              Discover the AI-powered features that make learning English effortless, engaging, and effective
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 relative">
          <div className="container mx-auto max-w-7xl relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {features.map((feature, index) => (
                <Card 
                  key={index}
                  className="bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl transition-all duration-500 rounded-3xl overflow-hidden"
                >
                  <CardHeader className="text-center pb-6">
                    <div className={`mx-auto mb-6 p-4 rounded-2xl bg-gradient-to-br ${feature.gradient}`}>
                      <feature.icon className="h-10 w-10 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground mb-3">
                      {feature.title}
                    </CardTitle>
                    <p className="text-muted-foreground text-base leading-relaxed">
                      {feature.description}
                    </p>
                  </CardHeader>
                  <CardContent className="px-6 pb-8">
                    <div className="space-y-3">
                      {feature.details.map((detail, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground text-sm">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="container mx-auto max-w-5xl relative">
            <Card className="bg-gradient-to-br from-primary via-[#1582B4] to-primary/90 border-0 text-white rounded-3xl overflow-hidden">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Get Started?</h2>
                <p className="text-white/90 text-lg mb-6 max-w-2xl mx-auto">
                  Join thousands of learners who have transformed their English skills with our AI-powered platform
                </p>
                <a href="/auth" className="inline-block">
                  <button className="bg-white text-primary hover:bg-white/90 font-semibold text-lg px-10 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl">
                    Start Learning Today
                  </button>
                </a>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 sm:py-14 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-border/20 relative">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(var(--primary),0.03),transparent_70%)]"></div>
          </div>
          
          <div className="container mx-auto max-w-7xl relative">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
              <div className="flex items-center space-x-3 group">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <img src="/lovable-uploads/016ec8c7-bb16-4595-ab96-d96c8c779aa2.png" alt="DIL Logo" className="w-full h-full object-cover" />
                </div>
                <span className="text-base sm:text-lg font-semibold text-foreground">LMS with AI Tutor</span>
              </div>
              
              <div className="text-center md:text-right">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  © 2025 AI Tutor. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
      <APEX />
    </>
  );
};

export default Features;

