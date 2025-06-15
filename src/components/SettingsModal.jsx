import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SettingsModal = ({ open, onOpenChange, onApiKeyUpdate }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    // Load API key from localStorage on component mount
    const storedKey = localStorage.getItem('alpha_vantage_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('alpha_vantage_api_key', apiKey.trim());
      onApiKeyUpdate(apiKey.trim());
      onOpenChange(false);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('alpha_vantage_api_key');
    setApiKey('');
    onApiKeyUpdate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Alpha Vantage API Key</label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
              />
              <Button onClick={handleSave} disabled={!apiKey.trim()}>
                Save
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              You can get a free API key from{' '}
              <a
                href="https://www.alphavantage.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Alpha Vantage
              </a>
            </p>
            {apiKey && (
              <p className="text-sm text-green-600">
                ✓ API key is set
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal; 