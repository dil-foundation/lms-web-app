import { lazy, Suspense, memo } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Award, Heart, Globe, Sparkles } from 'lucide-react';
import { APEX } from '@/components/ui/AIAssistant';

// Lazy load heavy sections
const BoardOfDirectors = lazy(() => import('@/components/about/BoardOfDirectors'));
const AdvisoryBoardSection = lazy(() => import('@/components/about/AdvisoryBoardSection'));
const PatronSection = lazy(() => import('@/components/about/PatronSection'));

// Memoized stat card component
const StatCard = memo(({ icon: Icon, value, label }: { icon: any, value: string, label: string }) => (
  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300">
    <CardContent className="text-center pt-8 pb-8">
      <Icon className="h-12 w-12 text-primary mx-auto mb-4" />
      <h3 className="text-3xl font-bold text-foreground mb-2">{value}</h3>
      <p className="text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

// Loading skeleton component
const SectionSkeleton = () => (
  <div className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 relative">
    <div className="container mx-auto max-w-7xl relative">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
        <div className="h-4 bg-muted rounded w-2/3 mx-auto"></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-3xl"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const AboutUs = () => {
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

        {/* Hero Section */}
        <section className="relative pt-20 sm:pt-24 md:pt-32 lg:pt-40 pb-12 sm:pb-16 md:pb-20 lg:pb-24 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto text-center max-w-7xl relative">
            <div className="mb-6 md:mb-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium mb-4 md:mb-6">
                <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
                Our Leadership
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 md:mb-8 leading-tight text-foreground tracking-tight">
              Leading the Way in{' '}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent relative block sm:inline">
                Educational Excellence
                <div className="absolute -bottom-1 md:-bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 md:mb-12 max-w-4xl mx-auto leading-relaxed px-2 sm:px-4 font-light tracking-wide">
              Our leaders bring decades of experience, vision, and commitment to advancing educational equity. 
              From global policymakers to grassroots advocates, DIL's leadership embodies the values of accountability, 
              transparency, and community partnership that guide our mission every day.
            </p>
          </div>
        </section>

        {/* Mission Stats */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="container mx-auto max-w-7xl relative">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
              <StatCard icon={Users} value="100K+" label="Students Educated" />
              <StatCard icon={Award} value="25+" label="Years of Impact" />
              <StatCard icon={Heart} value="91%" label="Direct to Programs" />
              <StatCard icon={Globe} value="Global" label="Reach & Impact" />
            </div>
          </div>
        </section>

        {/* Patron Section - Lazy Loaded */}
        <Suspense fallback={<SectionSkeleton />}>
          <PatronSection />
        </Suspense>

        {/* Advisory Board Section - Lazy Loaded */}
        <Suspense fallback={<SectionSkeleton />}>
          <AdvisoryBoardSection />
        </Suspense>

        {/* Board of Directors Section - Lazy Loaded */}
        <Suspense fallback={<SectionSkeleton />}>
          <BoardOfDirectors />
        </Suspense>

        {/* Contact Section */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="container mx-auto max-w-5xl relative">
            <Card className="bg-gradient-to-br from-primary via-[#1582B4] to-primary/90 border-0 text-white rounded-3xl overflow-hidden">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Get in Touch</h2>
                <p className="text-white/90 text-lg mb-6 max-w-2xl mx-auto">
                  Developments in Literacy (DIL) is a 501(c)(3) nonprofit delivering transformative 
                  education to children in underserved communities across Pakistan.
                </p>
                <div className="space-y-3 text-white/90">
                  <p className="text-lg">
                    <strong>Address:</strong> 8583 Irvine Center Drive #139, Irvine, CA 92618
                  </p>
                  <p className="text-lg">
                    <strong>Phone:</strong> (949) 474-5303
                  </p>
                  <p className="text-lg">
                    <strong>Email:</strong> office@dil.org
                  </p>
                  <p className="text-lg">
                    <strong>Federal Tax ID:</strong> 33-0843213
                  </p>
                </div>
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
                <span className="text-base sm:text-lg font-semibold text-foreground">Developments in Literacy</span>
              </div>
              
              <div className="text-center md:text-right">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  © 2025 Developments in Literacy. All rights reserved.
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

export default AboutUs;
