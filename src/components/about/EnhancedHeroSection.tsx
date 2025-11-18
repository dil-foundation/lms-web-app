import { memo } from 'react';
import { ArrowRight, Users, Award, Heart, Globe } from 'lucide-react';

const EnhancedHeroSection = memo(() => {
  const impactStats = [
    { icon: Users, value: "100K+", label: "Students" },
    { icon: Award, value: "25+", label: "Years" },
    { icon: Heart, value: "91%", label: "Direct to Programs" },
    { icon: Globe, value: "Global", label: "Reach" }
  ];

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Clean Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/5"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.03),transparent_70%)]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight tracking-[-0.02em]">
            <span className="text-foreground">Our</span>
            <span className="bg-gradient-to-r from-primary via-primary to-primary/90 bg-clip-text text-transparent"> Impact</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
            Transforming lives through education across Pakistan
          </p>
        </div>

        {/* Impact Stats - Enhanced Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {impactStats.map((stat, index) => (
            <div key={index} className="text-center group animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="w-16 h-16 bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-primary/20 shadow-sm">
                <stat.icon className="h-8 w-8 text-primary drop-shadow-sm" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-2 tracking-tight drop-shadow-sm">{stat.value}</div>
              <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

EnhancedHeroSection.displayName = 'EnhancedHeroSection';

export default EnhancedHeroSection;
