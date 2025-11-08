import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@/components/ui/button';
import authConfig from '../auth_config.json';

function SignInButton() {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Loading...
      </Button>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden md:inline">{user?.name || user?.email}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout({ logoutParams: { returnTo: authConfig.logoutReturnTo } })}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => loginWithRedirect()}
    >
      Sign in
    </Button>
  );
}

export default SignInButton;



