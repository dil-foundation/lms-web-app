import { memo } from 'react';
import { MapPin, Phone, Mail, ExternalLink, Clock, Building2, FileText, Shield, Calendar } from 'lucide-react';

const EnhancedContactSection = memo(() => {
  const contactMethods = [
    {
      type: "Office",
      icon: Building2,
      primary: "Headquarters",
      secondary: "8583 Irvine Center Drive #139",
      tertiary: "Irvine, CA 92618, United States",
      action: "Get Directions",
      href: "https://maps.google.com/?q=8583+Irvine+Center+Drive+139+Irvine+CA+92618"
    },
    {
      type: "Phone",
      icon: Phone,
      primary: "(949) 474-5303",
      secondary: "Monday - Friday",
      tertiary: "9:00 AM - 5:00 PM PST",
      action: "Call Now",
      href: "tel:+19494745303"
    },
    {
      type: "Email",
      icon: Mail,
      primary: "office@dil.org",
      secondary: "General Inquiries",
      tertiary: "Partnership Opportunities",
      action: "Send Email",
      href: "mailto:office@dil.org"
    }
  ];

  const additionalInfo = [
    { 
      label: "Federal Tax ID", 
      value: "33-0843213", 
      icon: FileText 
    },
    { 
      label: "Organization Type", 
      value: "501(c)(3) Nonprofit", 
      icon: Shield 
    },
    { 
      label: "Founded", 
      value: "1997", 
      icon: Calendar 
    }
  ];

  return (
    <section className="py-20 lg:py-24 relative bg-gradient-to-br from-background via-primary/3 to-muted/8">
      {/* Mission Section Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(var(--primary),0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(var(--primary),0.03),transparent_70%)]"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Section Header */}
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight tracking-[-0.01em]">
              <span className="text-foreground">Our</span>
              <span className="text-primary"> Mission</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transforming lives through education across Pakistan
            </p>
          </div>

          {/* Mission Statement */}
          <div className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm rounded-2xl p-8 border border-border/20 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-lg text-foreground leading-relaxed font-light">
              Delivering quality education to underserved communities across Pakistan, 
              empowering children with knowledge and opportunities for a brighter future.
            </p>
          </div>

          {/* Call to Action */}
          <div className="mt-12">
            <p className="text-muted-foreground mb-6">
              Ready to make a difference? Contact us to learn more about our programs and how you can help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:office@dil.org"
                className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Send Email
              </a>
              <a
                href="tel:+19494745303"
                className="border border-border text-foreground px-8 py-3 rounded-lg font-medium hover:bg-accent hover:text-accent-foreground hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Call Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

EnhancedContactSection.displayName = 'EnhancedContactSection';

export default EnhancedContactSection;
