
import { Header } from '@/components/Header';
import { AuthTabs } from '@/components/AuthTabs';

const Auth = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <AuthTabs />
      </div>
    </div>
  );
};

export default Auth;
