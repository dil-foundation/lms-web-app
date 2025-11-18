import { memo } from 'react';
import { Users, Award, Heart, Globe } from 'lucide-react';

const EnhancedMissionSection = memo(() => {
  const impactStats = [
    { icon: Users, value: "100K+", label: "Students" },
    { icon: Award, value: "25+", label: "Years" },
    { icon: Heart, value: "91%", label: "Direct to Programs" },
    { icon: Globe, value: "Global", label: "Reach" }
  ];

  return (
    <section className="py-24 lg:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Mission Statement */}
          <h2 className="text-4xl sm:text-5xl font-bold mb-8 leading-tight">
            <span className="text-foreground">Every child deserves</span>
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              quality education
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-16">
            We provide transformative learning experiences to underserved communities across Pakistan.
          </p>

          {/* Impact Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {impactStats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

EnhancedMissionSection.displayName = 'EnhancedMissionSection';

export default EnhancedMissionSection;
