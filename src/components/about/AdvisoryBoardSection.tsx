import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';

const advisoryBoard = [
  "Sara Abbasi",
  "Aamer Abdullah", 
  "Nasser A. Ahmad",
  "Najeeb Ghauri",
  "Henna Inam",
  "Ikram U. Khan MD",
  "Maha Khan",
  "Shoaib Kothawala"
];

const AdvisoryMember = memo(({ name }: { name: string }) => (
  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all duration-300">
    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
      <span className="text-primary-foreground font-bold text-sm">
        {name.split(' ').map(n => n[0]).join('')}
      </span>
    </div>
    <span className="text-foreground font-medium text-sm">{name}</span>
  </div>
));

AdvisoryMember.displayName = 'AdvisoryMember';

const AdvisoryBoardSection = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 relative bg-gradient-to-br from-muted/5 via-background to-muted/10">
      {/* Elegant Background Pattern */}
      <div className="absolute inset-0 opacity-25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(var(--primary),0.04),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_60%,rgba(var(--primary),0.02),transparent_60%)]"></div>
      </div>
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground tracking-tight">
            Advisory <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Board</span>
          </h2>
        </div>
        
        <Card className="bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl transition-all duration-500 rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {advisoryBoard.map((member, index) => (
                <AdvisoryMember key={index} name={member} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default AdvisoryBoardSection;

