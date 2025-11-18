import { memo } from 'react';
import { Users } from 'lucide-react';

const EnhancedLeadershipSection = memo(() => {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-8 leading-tight">
            <span className="text-foreground">Visionary</span>
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Leadership
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-16">
            Experienced leaders guiding our mission of transforming lives through education.
          </p>

          {/* Leadership Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-2">6</div>
              <div className="text-sm text-muted-foreground">Board Members</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-2">8</div>
              <div className="text-sm text-muted-foreground">Advisory Board</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-2">1</div>
              <div className="text-sm text-muted-foreground">Patron</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

EnhancedLeadershipSection.displayName = 'EnhancedLeadershipSection';

export default EnhancedLeadershipSection;
