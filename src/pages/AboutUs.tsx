import { lazy, Suspense, memo } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Award, Heart, Globe, Sparkles, ArrowRight, CheckCircle, Target, Lightbulb, Shield, TrendingUp, MapPin, Phone, Mail } from 'lucide-react';
import { APEX } from '@/components/ui/AIAssistant';

// Lazy load heavy sections
const BoardOfDirectors = lazy(() => import('@/components/about/BoardOfDirectors'));
const AdvisoryBoardSection = lazy(() => import('@/components/about/AdvisoryBoardSection'));
const PatronSection = lazy(() => import('@/components/about/PatronSection'));

// Enhanced components
const EnhancedHeroSection = lazy(() => import('@/components/about/EnhancedHeroSection'));
const EnhancedContactSection = lazy(() => import('@/components/about/EnhancedContactSection'));

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
      <div id="top" className="min-h-screen bg-background text-foreground relative overflow-hidden scroll-smooth">
        {/* Premium Background Elements - Homepage Style */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary),0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary),0.02),transparent_50%)]"></div>
        

        {/* Enhanced Hero Section */}
        <div id="impact">
          <Suspense fallback={<SectionSkeleton />}>
            <EnhancedHeroSection />
          </Suspense>
            </div>
            
        {/* Board of Directors Section - Lazy Loaded */}
        <div id="leadership">
          <Suspense fallback={<SectionSkeleton />}>
            <BoardOfDirectors />
          </Suspense>
          </div>

        {/* Section Divider */}
        <div className="relative py-8">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border/30 to-transparent h-px top-1/2"></div>
          </div>

        {/* Patron Section - Lazy Loaded */}
        <Suspense fallback={<SectionSkeleton />}>
          <PatronSection />
        </Suspense>

        {/* Section Divider */}
        <div className="relative py-8">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border/30 to-transparent h-px top-1/2"></div>
        </div>

        {/* Advisory Board Section - Lazy Loaded */}
        <Suspense fallback={<SectionSkeleton />}>
          <AdvisoryBoardSection />
        </Suspense>

        {/* Section Divider */}
        <div className="relative py-8">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border/30 to-transparent h-px top-1/2"></div>
        </div>

        {/* Enhanced Contact Section */}
        <Suspense fallback={<SectionSkeleton />}>
          <EnhancedContactSection />
        </Suspense>

        {/* Professional Footer with Contact Information */}
        <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/20 bg-gradient-to-br from-muted/5 to-muted/10">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {/* Organization Info */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-green-600 flex items-center justify-center overflow-hidden">
                    <img src="/lovable-uploads/016ec8c7-bb16-4595-ab96-d96c8c779aa2.png" alt="DIL Logo" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-lg font-semibold text-foreground">DIL</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Delivering quality education to underserved communities across Pakistan.
                </p>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Contact</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Headquarters</div>
                      <div className="text-sm text-foreground">
                        8583 Irvine Center Drive #139<br />
                        Irvine, CA 92618
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Phone</div>
                      <a href="tel:+19494745303" className="text-sm text-foreground hover:text-primary transition-colors">
                        (949) 474-5303
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Email</div>
                      <a href="mailto:office@dil.org" className="text-sm text-foreground hover:text-primary transition-colors">
                        office@dil.org
                      </a>
                    </div>
                  </div>
                </div>
          </div>

              {/* Organization Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Organization</h4>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Tax ID:</span> 33-0843213
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Type:</span> 501(c)(3) Nonprofit
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Founded:</span> 1997
                  </div>
                </div>
          </div>
          
              {/* Quick Links */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Quick Links</h4>
                <div className="space-y-2">
                  <a 
                    href="#impact" 
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-all duration-200 block cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Impact link clicked');
                      setTimeout(() => {
                        const element = document.getElementById('impact');
                        console.log('Looking for impact element:', element);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } else {
                          console.log('Impact element not found, trying alternative');
                          // Try scrolling to the top of the page as fallback
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }, 100);
                    }}
                  >
                    Our Impact
                  </a>
                  <a 
                    href="#leadership" 
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-all duration-200 block cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Leadership link clicked');
                      setTimeout(() => {
                        const element = document.getElementById('leadership');
                        console.log('Looking for leadership element:', element);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } else {
                          console.log('Leadership element not found, trying alternative');
                          // Try scrolling to a position where leadership section should be
                          window.scrollTo({ top: 800, behavior: 'smooth' });
                        }
                      }, 100);
                    }}
                  >
                    Leadership
                  </a>
                  <a 
                    href="#top" 
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-all duration-200 block cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Back to top clicked');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Back to Top
                  </a>
                </div>
              </div>
              </div>
              
            {/* Bottom Bar */}
            <div className="border-t border-border/20 pt-6">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
                <p className="text-sm text-muted-foreground">
                  © 2025 Developments in Literacy. All rights reserved.
                </p>
                <div className="flex space-x-6">
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </a>
                </div>
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
