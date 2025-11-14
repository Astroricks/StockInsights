import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, ExternalLink, Check, X } from 'lucide-react';
import { saveApiKey, loadApiKey, deleteApiKey } from '../services/alphaVantageService';

const SettingsModal = ({ isOpen, onClose, onApiKeyUpdate }) => {
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadExistingKey();
    }
  }, [isOpen]);

  const loadExistingKey = () => {
    setMessage(null);
    
    const existingKey = loadApiKey();
    if (existingKey) {
      setApiKey(existingKey);
      setHasExistingKey(true);
    } else {
      setApiKey('');
      setHasExistingKey(false);
    }
  };

  const handleSave = () => {
    if (!apiKey || apiKey.trim().length === 0) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    try {
      saveApiKey(apiKey.trim());
      setMessage({ type: 'success', text: 'API key saved successfully!' });
      setHasExistingKey(true);
      
      // Notify parent component
      if (onApiKeyUpdate) {
        onApiKeyUpdate(apiKey.trim());
      }

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to save API key:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save API key' });
    }
  };

  const handleDelete = () => {
    if (!window.confirm('Are you sure you want to delete your saved API key?')) {
      return;
    }

    try {
      deleteApiKey();
      setApiKey('');
      setHasExistingKey(false);
      setMessage({ type: 'success', text: 'API key deleted successfully' });
      
      // Notify parent component
      if (onApiKeyUpdate) {
        onApiKeyUpdate(null);
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete API key' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Alpha Vantage API Key
          </DialogTitle>
          <DialogDescription>
            Configure your personal Alpha Vantage API key to access financial data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Alpha Vantage API key"
            />
            <p className="text-xs text-muted-foreground">
              Your API key is stored securely in your browser's local storage.
            </p>
          </div>

          {/* Instructions */}
          <Alert>
            <AlertDescription className="text-sm">
              <p className="font-semibold mb-2">Don't have an API key?</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Visit Alpha Vantage's website</li>
                <li>Click "Get Your Free API Key Today"</li>
                <li>Fill out the form and submit</li>
                <li>Copy your API key and paste it above</li>
              </ol>
              <a
                href="https://www.alphavantage.co/support/#api-key"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
              >
                Get API Key <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>

          {/* Message */}
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            {hasExistingKey && (
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                Delete Key
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!apiKey.trim()}
            >
              Save Key
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
