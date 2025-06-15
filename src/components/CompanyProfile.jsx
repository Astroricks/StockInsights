import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Globe, MapPin } from 'lucide-react';

const CompanyProfile = ({ profile }) => {
  if (!profile) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {profile.logo && (
            <img 
              src={profile.logo} 
              alt={`${profile.name} logo`}
              className="w-12 h-12 rounded-lg object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div>
            <h2 className="text-2xl font-bold">{profile.name}</h2>
            <p className="text-muted-foreground">{profile.ticker}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profile.finnhubIndustry && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{profile.finnhubIndustry}</span>
            </div>
          )}
          {profile.country && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{profile.country}</span>
            </div>
          )}
          {profile.weburl && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a 
                href={profile.weburl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Website
              </a>
            </div>
          )}
        </div>
        
        {profile.description && (
          <div>
            <h3 className="font-semibold mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {profile.description}
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          {profile.marketCapitalization && (
            <div>
              <p className="text-xs text-muted-foreground">Market Cap</p>
              <p className="font-semibold">${(profile.marketCapitalization * 1000000).toLocaleString()}</p>
            </div>
          )}
          {profile.shareOutstanding && (
            <div>
              <p className="text-xs text-muted-foreground">Shares Outstanding</p>
              <p className="font-semibold">{(profile.shareOutstanding * 1000000).toLocaleString()}</p>
            </div>
          )}
          {profile.exchange && (
            <div>
              <p className="text-xs text-muted-foreground">Exchange</p>
              <p className="font-semibold">{profile.exchange}</p>
            </div>
          )}
          {profile.currency && (
            <div>
              <p className="text-xs text-muted-foreground">Currency</p>
              <p className="font-semibold">{profile.currency}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyProfile;

