import { memo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const boardMembers = [
  {
    name: "Fiza Shah",
    role: "Founder & CEO",
    credentials: "Executive MBA, UC Irvine | Tamgha-e-Imtiaz",
    company: "Developments in Literacy",
    bio: "Founded DIL in 1997, transforming it into Pakistan's leading education provider. Under her leadership, DIL has educated hundreds of thousands of students and introduced innovative technology-enabled learning solutions.",
    isExecutive: true
  },
  {
    name: "Muhammad Shahzad",
    role: "Chairperson",
    credentials: "MBA, UCLA Anderson | Wharton School",
    company: "Relativity Space",
    bio: "President & CFO at Relativity Space, overseeing $2B+ in funding. Former Goldman Sachs executive with 20+ years in finance and capital markets, advising on $30B+ in transactions.",
    isExecutive: true
  },
  {
    name: "Maha Hayat",
    role: "Board Member",
    credentials: "24+ Years DIL Supporter",
    company: "Alex Papachristidis Interiors",
    bio: "Founding member of DIL's New York chapter, leading fundraising efforts and cultivating donor networks. Specializes in interior architecture and design while maintaining long-standing philanthropic commitment.",
    isExecutive: false
  },
  {
    name: "Malika Junaid",
    role: "Board Member",
    credentials: "Sitara-e-Imtiaz | 30+ Years Experience",
    company: "M. Designs Architects",
    bio: "Principal architect specializing in sustainable design with multiple architectural awards. Co-founder of Empower Sports Academy, advocating for women's education and leadership in Pakistan.",
    isExecutive: false
  },
  {
    name: "Wajid Mirza",
    role: "Board Member",
    credentials: "Forbes Business Council",
    company: "Arthur Lawrence LP",
    bio: "Managing Partner of global consulting firm serving Fortune 500 clients. Social entrepreneur integrating business growth with social impact, focusing on literacy and youth mentorship.",
    isExecutive: false
  },
  {
    name: "Abdul Rehman Yaqub",
    role: "Board Member",
    credentials: "35+ Years Global Experience",
    company: "1888 Mills, LLC",
    bio: "Visionary leader in global textile industry with mills across Pakistan, Bangladesh, Ghana, and the United States. Recognized for bringing together diverse cultures and advancing education opportunities.",
    isExecutive: false
  },
  {
    name: "Shaila Zamir",
    role: "Board Member",
    credentials: "Former DIL NY President",
    company: "Interior Design Firm",
    bio: "Long-standing DIL Board member and former NY chapter president. Entrepreneur and interior design firm founder, driving impactful fundraising initiatives including the annual NY gala.",
    isExecutive: false
  },
  {
    name: "Adnan Zuberi",
    role: "Board Member",
    credentials: "University of Michigan",
    company: "BNP Paribas",
    bio: "Managing Director and Co-Head of Global Capital Markets for the Americas. Former senior roles at JPMorgan Chase, UBS, and Credit Suisse with 20+ years in complex credit transactions.",
    isExecutive: false
  }
];

const BoardMemberCard = memo(({ member, index }: { member: typeof boardMembers[0], index: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card 
      className={`group relative bg-card/40 backdrop-blur-xl border border-border/30 hover:border-primary/40 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 rounded-2xl overflow-hidden shadow-sm ${
        member.isExecutive ? 'ring-1 ring-primary/30 shadow-lg shadow-primary/5' : ''
      }`}
    >
      <CardContent className="p-6">
        {/* Executive Badge - Compact */}
        {member.isExecutive && (
          <div className="absolute top-4 right-4">
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Executive
            </div>
          </div>
        )}
        
        {/* Profile Section - Compact */}
        <div className="text-center mb-6">
          {/* Avatar - Smaller */}
          <div className="w-16 h-16 bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
            <span className="text-primary font-bold text-xl tracking-tight">
            {member.name.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
          
          {/* Name & Role - Improved Readability */}
          <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">{member.name}</h3>
          <p className="text-primary font-semibold text-base mb-2">{member.role}</p>
          <p className="text-muted-foreground text-sm font-medium">{member.company}</p>
        </div>
        
        {/* Credentials - Improved Readability */}
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">{member.credentials}</p>
      </div>
        
        {/* Expandable Bio - Compact */}
        <div className="border-t border-border/10 pt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-all duration-300 font-medium"
          >
            {isExpanded ? 'Show Less' : 'Learn More'}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 transition-transform duration-300" />
            ) : (
              <ChevronDown className="h-4 w-4 transition-transform duration-300" />
            )}
          </button>
          
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-border/5 animate-fade-in">
              <p className="text-sm text-muted-foreground leading-relaxed font-normal">
        {member.bio}
      </p>
            </div>
          )}
        </div>
    </CardContent>
  </Card>
  );
});

BoardMemberCard.displayName = 'BoardMemberCard';

const BoardOfDirectors = () => {
  const executives = boardMembers.filter(member => member.isExecutive);
  const boardMembers_list = boardMembers.filter(member => !member.isExecutive);

  return (
    <section className="py-32 lg:py-40 relative bg-gradient-to-br from-muted/10 via-background to-muted/5">
      {/* Section Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.04),transparent_70%)]"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Section Header - Apple Style */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 bg-primary/5 text-primary px-6 py-3 rounded-full text-sm font-medium mb-8 border border-primary/10 backdrop-blur-sm">
            <Users className="h-4 w-4" />
            Leadership Team
          </div>
            <h2 className="text-5xl sm:text-6xl font-bold mb-8 leading-[0.9] tracking-[-0.02em]">
              <span className="text-foreground">Board of </span>
              <span className="bg-gradient-to-r from-primary via-primary to-primary/90 bg-clip-text text-transparent">
                Directors
              </span>
          </h2>
            <p className="text-2xl text-muted-foreground max-w-3xl mx-auto leading-[1.4] font-light">
              Strategic leaders guiding our mission of transforming lives through education.
          </p>
        </div>

          {/* Executive Leadership */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Executive Leadership</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {executives.map((member, index) => (
                <BoardMemberCard key={index} member={member} index={index} />
              ))}
            </div>
          </div>

          {/* Board Members */}
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Board Members</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {boardMembers_list.map((member, index) => (
                <BoardMemberCard key={index} member={member} index={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BoardOfDirectors;

