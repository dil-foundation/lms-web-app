// Update this page (the content is just a fallback if you fail to update the page)
import { useTranslation } from 'react-i18next';

const Index = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t('index.welcome')}</h1>
        <p className="text-xl text-muted-foreground">{t('index.start_building')}</p>
      </div>
    </div>
  );
};

export default Index;
