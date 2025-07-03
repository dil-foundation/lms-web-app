
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Brain, MessageCircle, Globe, Headphones, Languages, Target, ArrowRight } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen bg-[#11141A] text-white">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Master English with{' '}
            <span className="text-[#22C55E]">AI-Powered Learning</span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            Your personalized English tutor powered by artificial intelligence. Learn 
            at your own pace with interactive lessons, real-time feedback, and 
            cultural context.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="bg-[#22C55E] hover:bg-[#22C55E]/90 text-black font-semibold text-lg px-8 py-4 rounded-full">
                Start Learning
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E]/10 text-lg px-8 py-4 rounded-full">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#22C55E]">
              Everything You Need To Master English
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto">
              Comprehensive features designed to make English learning effective, enjoyable, and accessible for young minds.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-[#1A1F26] border-[#333A45] text-white">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-[#22C55E]/10">
                  <Brain className="h-8 w-8 text-[#22C55E]" />
                </div>
                <CardTitle className="text-xl">Personalized Learning</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-400">
                  AI-driven lessons adapt to your learning style and pace
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1F26] border-[#333A45] text-white">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-[#22C55E]/10">
                  <MessageCircle className="h-8 w-8 text-[#22C55E]" />
                </div>
                <CardTitle className="text-xl">Interactive Conversations</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-400">
                  Practice with AI-powered conversation scenarios
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1F26] border-[#333A45] text-white">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-[#22C55E]/10">
                  <Globe className="h-8 w-8 text-[#22C55E]" />
                </div>
                <CardTitle className="text-xl">Cultural Context</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-400">
                  Learn English within relevant cultural frameworks
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1F26] border-[#333A45] text-white">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-[#22C55E]/10">
                  <Headphones className="h-8 w-8 text-[#22C55E]" />
                </div>
                <CardTitle className="text-xl">Pronunciation Practice</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-400">
                  Real-time feedback on your english pronunciation
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1F26] border-[#333A45] text-white">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-[#22C55E]/10">
                  <Languages className="h-8 w-8 text-[#22C55E]" />
                </div>
                <CardTitle className="text-xl">Dual Language Support</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-400">
                  Learn easily with bilingual (English & Urdu) support
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1F26] border-[#333A45] text-white">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-[#22C55E]/10">
                  <Target className="h-8 w-8 text-[#22C55E]" />
                </div>
                <CardTitle className="text-xl">Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-400">
                  Track your learning journey with detailed analytics
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#22C55E]">
              Loved By Learners Worldwide
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Join thousands of satisfied students who have transformed their English skills
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-[#1A1F26] border-[#333A45] text-white">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="w-2 h-2 bg-[#22C55E] rounded-full mr-3"></div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-6 italic">
                  "AI Tutor has completely transformed how I learn English. The 
                  personalized approach makes all the difference."
                </p>
                <div>
                  <p className="font-semibold text-white">Sarah Ahmed</p>
                  <p className="text-sm text-gray-400">Student</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1F26] border-[#333A45] text-white">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="w-2 h-2 bg-[#22C55E] rounded-full mr-3"></div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-6 italic">
                  "The cultural context and real-world scenarios 
                  have helped me understand English in 
                  practical situations."
                </p>
                <div>
                  <p className="font-semibold text-white">Mohammad Khan</p>
                  <p className="text-sm text-gray-400">Professional</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1F26] border-[#333A45] text-white">
              <CardHeader>
                <div className="flex items-center mb-4">
                  <div className="w-2 h-2 bg-[#22C55E] rounded-full mr-3"></div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-6 italic">
                  "I love how the app adapts to my learning 
                  style. It's like having a personal tutor available 
                  24/7."
                </p>
                <div>
                  <p className="font-semibold text-white">Fatima Ali</p>
                  <p className="text-sm text-gray-400">Business Owner</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-[#22C55E] to-[#30A46C] rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-black">
              Start Your English Learning Journey Today
            </h2>
            <p className="text-xl text-black/80 mb-8 max-w-2xl mx-auto">
              Join thousands of learners who have achieved fluency with AI Tutor
            </p>
            <Link to="/auth">
              <Button size="lg" className="bg-[#4C51BF] hover:bg-[#4C51BF]/90 text-white font-semibold text-lg px-8 py-4 rounded-full">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
