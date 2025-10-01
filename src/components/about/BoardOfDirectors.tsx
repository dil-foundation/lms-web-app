import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

const boardMembers = [
  {
    name: "Fiza Shah",
    role: "Founder & CEO",
    bio: "Fiza Shah is the Founder and Chief Executive Officer of Developments in Literacy (DIL). Since establishing the organization in 1997, she has transformed it into one of Pakistan's leading providers of quality education for underserved children. Under her leadership, DIL has educated hundreds of thousands of students, expanded girls' access to schooling, strengthened teacher development, and introduced technology-enabled learning solutions that bring innovation to classrooms. Fiza earned her Executive MBA from the University of California, Irvine, and has received numerous honors for her contributions, including Pakistan's prestigious Tamgha-e-Imtiaz (Medal of Excellence). She remains deeply committed to ensuring that every child, regardless of background, has access to the knowledge and opportunities needed to achieve their fullest potential."
  },
  {
    name: "Muhammad Shahzad",
    role: "Chairperson",
    bio: "Muhammad Shahzad is President and Chief Financial Officer of Relativity Space, where he oversees the company's commercial, financial, people, legal, and risk functions. Under his leadership, Relativity has raised over $2 billion and expanded its team more than twentyfold. With over two decades of finance and capital markets experience, he has held senior roles at The Honest Company and Goldman Sachs, advising on transactions exceeding $30 billion. Earlier in his career, he founded a startup and worked at Accenture and Deutsche Bank. Muhammad graduated cum laude from The Wharton School and earned his MBA from the UCLA Anderson School of Management."
  },
  {
    name: "Maha Hayat",
    role: "Board Member",
    bio: "Maha Hayat is a founding member of DIL's New York chapter and has been a dedicated supporter of Developments in Literacy for more than 24 years. She has played a central role in establishing the chapter's presence, leading fundraising efforts, and cultivating a strong network of donors to advance DIL's mission of empowering underprivileged girls in Pakistan through education. Professionally, Maha brings her creative eye and passion for design to her work at Alex Papachristidis Interiors, where she specializes in interior architecture and design, balancing a thriving career with her long-standing commitment to philanthropy."
  },
  {
    name: "Malika Junaid",
    role: "Board Member",
    bio: "Malika Junaid is principal at M. Designs Architects, a Los Altos–based firm specializing in sustainable residential, office, and commercial projects. With over 30 years of experience, she is recognized for delivering innovative, environmentally conscious designs that have earned multiple architectural awards for excellence and leadership. Honored with the Sitara-e-Imtiaz, Pakistan's highest civilian award, Malika is also co-founder and board member of Empower Sports Academy, advocating for women's education, leadership, and sports in Pakistan. She actively supports youth education through organizations like DIL (Developments in Literacy) and serves as a board and charter member of OPEN North America, mentoring future leaders."
  },
  {
    name: "Wajid Mirza",
    role: "Board Member",
    bio: "Wajid Mirza is the Managing Partner of Arthur Lawrence LP, a global consulting firm he co-founded in 2003. He has led the company's expansion across industries and continents, serving Fortune 500 and Global 2000 clients while promoting technology-driven solutions. A social entrepreneur at heart, Wajid integrates business growth with social impact, creating opportunities for dignified livelihoods and community development. He is a member of the Forbes Business Development Council and actively supports nonprofit organizations focused on literacy, healthcare, and youth mentorship, extending his commitment to linking business leadership with meaningful social progress through education."
  },
  {
    name: "Abdul Rehman Yaqub",
    role: "Board Member",
    bio: "Abdul Rehman Yaqub has over 35 years of experience in the global textile industry and serves as a visionary leader at 1888 Mills, LLC. Over the years, he has drawn on his deep knowledge of international textile markets to guide the company's growth and long-term strategy. His unique ability to bring together people of diverse cultures and backgrounds has enabled 1888 Mills to become a pioneer of global textile production, with mills in Pakistan, Bangladesh, Ghana, and the United States. Today, Abdul Rehman is recognized as a predominant global business leader and remains committed to advancing opportunities for education and community development through DIL."
  },
  {
    name: "Shaila Zamir",
    role: "Board Member",
    bio: "Shaila Zamir is a long-standing member of the DIL Board and has previously served as President of the New York chapter. She has been a driving force behind some of the organization's most impactful fundraising initiatives, including the annual New York gala — one of DIL's most high-profile events. Through her leadership, Shaila has mobilized vital support for DIL's mission, strengthened its presence across the United States, and raised awareness about the urgent need for quality education in Pakistan. Professionally, Shaila is an entrepreneur and founder of her own interior design firm. She holds an undergraduate degree in art history and interior design from Parsons."
  },
  {
    name: "Adnan Zuberi",
    role: "Board Member",
    bio: "Adnan Zuberi is a Managing Director and Co-Head of Global Capital Markets for the Americas at BNP Paribas. His responsibilities span the Investment Grade, Leverage Finance, Equity, Securitization and Real Asset businesses. With more than two decades of experience, he previously held senior roles at JPMorgan Chase, UBS, and Credit Suisse, advising on complex credit and securitization transactions across asset classes. A graduate of the University of Michigan, Adnan has also been an active supporter of DIL's New York chapter, contributing to its growth and ensuring it remains a strong platform for advancing education in Pakistan."
  }
];

const BoardMemberCard = memo(({ member }: { member: typeof boardMembers[0] }) => (
  <Card className="bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl transition-all duration-500 rounded-3xl overflow-hidden">
    <CardHeader>
      <div className="flex items-start gap-6">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-xl md:text-2xl">
            {member.name.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div className="flex-1">
          <CardTitle className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {member.name}
          </CardTitle>
          <p className="text-primary font-semibold text-lg">{member.role}</p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="px-6 md:px-8 pb-8">
      <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
        {member.bio}
      </p>
    </CardContent>
  </Card>
));

BoardMemberCard.displayName = 'BoardMemberCard';

const BoardOfDirectors = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="container mx-auto max-w-7xl relative">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Users className="h-4 w-4" />
            Leadership Team
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground tracking-tight">
            Board of <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Directors</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The DIL Board of Directors provides strategic direction and oversight, ensuring that every decision 
            strengthens our mission. From guiding program priorities to expanding outreach and donor support, 
            the Board helps chart the path for DIL's long-term impact and sustainability.
          </p>
        </div>

        <div className="space-y-8">
          {boardMembers.map((member, index) => (
            <BoardMemberCard key={index} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BoardOfDirectors;

