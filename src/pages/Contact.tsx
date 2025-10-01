import { memo } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin, Globe, Sparkles } from 'lucide-react';
import { APEX } from '@/components/ui/AIAssistant';

const ContactCard = memo(({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
  <Card className="bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl transition-all duration-500 rounded-3xl overflow-hidden">
    <CardHeader className="text-center pb-6">
      <div className="mx-auto mb-6 p-4 rounded-2xl bg-primary/10">
        <Icon className="h-10 w-10 text-primary" />
      </div>
      <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent className="px-6 pb-8 text-center">
      {children}
    </CardContent>
  </Card>
));

ContactCard.displayName = 'ContactCard';

const Contact = () => {
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
                Get in Touch
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 md:mb-8 leading-tight animate-fade-in-up text-foreground tracking-tight">
              Contact{' '}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent relative block sm:inline">
                Developments in Literacy
                <div className="absolute -bottom-1 md:-bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 md:mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-delayed px-2 sm:px-4 font-light tracking-wide">
              We're here to help. Reach out to us for any questions, support, or partnership opportunities
            </p>
          </div>
        </section>

        {/* Contact Information */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="container mx-auto max-w-5xl relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Main Office */}
              <ContactCard icon={MapPin} title="Main Office">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  8583 Irvine Center Drive #139<br />
                  Irvine, CA 92618<br />
                  United States
                </p>
              </ContactCard>

              {/* Phone */}
              <ContactCard icon={Phone} title="Phone">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  <a href="tel:+19494745303" className="hover:text-primary transition-colors">
                    (949) 474-5303
                  </a>
                </p>
              </ContactCard>

              {/* Email */}
              <ContactCard icon={Mail} title="Email">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  <a href="mailto:office@dil.org" className="hover:text-primary transition-colors">
                    office@dil.org
                  </a>
                </p>
              </ContactCard>

              {/* Website */}
              <ContactCard icon={Globe} title="Website">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  <a href="https://www.dil.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    www.dil.org
                  </a>
                  <br />
                  <a href="https://www.dilpakistan.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors mt-2 inline-block">
                    www.dilpakistan.org
                  </a>
                </p>
              </ContactCard>
            </div>
          </div>
        </section>

        {/* Organization Info */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="container mx-auto max-w-5xl relative">
            <Card className="bg-gradient-to-br from-primary via-[#1582B4] to-primary/90 border-0 text-white rounded-3xl overflow-hidden">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">About Our Organization</h2>
                <p className="text-white/90 text-lg mb-4 max-w-3xl mx-auto leading-relaxed">
                  Developments in Literacy (DIL) is a 501(c)(3) nonprofit delivering transformative 
                  education to children in underserved communities across Pakistan. Since 1997, we have 
                  educated hundreds of thousands of students, expanded girls' access to schooling, 
                  strengthened teacher development, and introduced technology-enabled learning solutions.
                </p>
                <div className="mt-8 pt-6 border-t border-white/20">
                  <p className="text-white/90 text-lg">
                    <strong>Federal Tax ID:</strong> 33-0843213
                  </p>
                  <p className="text-white/90 text-base mt-3">
                    91% of our expenses directly support educational programs
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

export default Contact;

