import { useParams } from 'react-router-dom';
import { SecureObserverForm } from '@/components/admin/SecureObserverForm';

const SecureObserverFormPage = () => {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Access
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            No token provided in the URL.
          </p>
        </div>
      </div>
    );
  }

  return <SecureObserverForm token={token} />;
};

export default SecureObserverFormPage; 