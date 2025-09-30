import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Award, Heart, Globe, Sparkles } from 'lucide-react';
import { APEX } from '@/components/ui/AIAssistant';

const AboutUs = () => {
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
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium mb-4 md:mb-6 animate-fade-in-up">
                <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
                Our Leadership
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 md:mb-8 leading-tight animate-fade-in-up text-foreground tracking-tight">
              Leading the Way in{' '}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent relative block sm:inline">
                Educational Excellence
                <div className="absolute -bottom-1 md:-bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 md:mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-delayed px-2 sm:px-4 font-light tracking-wide">
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
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300">
                <CardContent className="text-center pt-8 pb-8">
                  <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-3xl font-bold text-foreground mb-2">100K+</h3>
                  <p className="text-muted-foreground">Students Educated</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300">
                <CardContent className="text-center pt-8 pb-8">
                  <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-3xl font-bold text-foreground mb-2">25+</h3>
                  <p className="text-muted-foreground">Years of Impact</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300">
                <CardContent className="text-center pt-8 pb-8">
                  <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-3xl font-bold text-foreground mb-2">91%</h3>
                  <p className="text-muted-foreground">Direct to Programs</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300">
                <CardContent className="text-center pt-8 pb-8">
                  <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-3xl font-bold text-foreground mb-2">Global</h3>
                  <p className="text-muted-foreground">Reach & Impact</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Patron Section */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="container mx-auto max-w-5xl relative">
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

        {/* Advisory Board Section */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="container mx-auto max-w-7xl relative">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground tracking-tight">
                Advisory <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Board</span>
              </h2>
            </div>
            
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl transition-all duration-500 rounded-3xl overflow-hidden">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {advisoryBoard.map((member, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all duration-300"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-foreground font-bold text-sm">
                          {member.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-foreground font-medium text-sm">{member}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Board of Directors Section */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 relative">
          <div className="container mx-auto max-w-7xl relative">
            <div className="text-center mb-12 md:mb-16">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in-up">
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
                <Card 
                  key={index}
                  className="bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-2xl transition-all duration-500 rounded-3xl overflow-hidden"
                >
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
              ))}
            </div>
          </div>
        </section>

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

