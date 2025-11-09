import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ErrorMessage = ({ error, onRetry, loginRequired, onLogin }) => {
  if (!error) return null;

  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.response?.data?.error) return error.response.data.error;
    if (error.response?.status === 429) return 'Rate limit exceeded. Please try again in a moment.';
    if (error.response?.status === 404) return 'Stock ticker not found. Please check the symbol and try again.';
    if (error.response?.status >= 500) return 'Server error. Please try again later.';
    return 'An unexpected error occurred. Please try again.';
  };

  const errorMessage = getErrorMessage(error);

  return (
    <Alert variant={loginRequired ? "default" : "destructive"} className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{loginRequired ? 'Login Required' : 'Error'}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{errorMessage}</p>
        <div className="flex gap-2 flex-wrap">
          {loginRequired && onLogin && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={onLogin}
              className="bg-primary hover:bg-primary/90"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
          {onRetry && !loginRequired && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="bg-background hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ErrorMessage;

