import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PatronSection = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 relative bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900/50 dark:via-blue-900/20 dark:to-indigo-900/10">
      {/* Subtle background pattern - matching Student Success Stories */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.08),transparent_50%)]"></div>
      </div>
      
      <div className="container mx-auto max-w-5xl relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground tracking-tight">
            Our <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Patron</span>
          </h2>
        </div>
        
        <Card className="bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl transition-all duration-500 rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-3xl">ML</span>
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">Dr. Maleeha Lodhi</CardTitle>
            <p className="text-primary font-medium">Patron</p>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <p className="text-muted-foreground text-lg leading-relaxed text-center">
              Dr. Maleeha Lodhi is a journalist, an academic and a diplomat from Pakistan. Until recently, 
              she was the High Commissioner of Pakistan to the United Kingdom, and a former Ambassador to 
              the United States. She is currently a Fellow at the Institute of Politics, Kennedy School of 
              Government at Harvard University. She has also been a member of the United Nations Secretary-General 
              Advisory Board on Disarmament.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default PatronSection;

