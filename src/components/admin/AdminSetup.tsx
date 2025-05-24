import React, { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from '../ui/use-toast';
import { Shield, AlertTriangle } from 'lucide-react';

export function AdminSetup() {
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);

  // Simple secret key for demo purposes - in production, use proper authentication
  const ADMIN_SECRET = 'campus-connect-admin-2024';

  const handleSetupAdmin = async () => {
    const user = auth.currentUser;
    
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in first to set up admin access.',
        variant: 'destructive'
      });
      return;
    }

    if (secretKey !== ADMIN_SECRET) {
      toast({
        title: 'Invalid Secret Key',
        description: 'The secret key you entered is incorrect.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Update user document to add admin role
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'admin',
        isAdmin: true,
        adminSince: serverTimestamp()
      });

      toast({
        title: 'Admin Access Granted',
        description: 'You now have admin privileges. The admin panel will appear shortly.',
      });

      // Clear the secret key
      setSecretKey('');
      
      // Force a page reload to refresh all components including sidebar
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1500);

    } catch (error) {
      console.error('Error setting admin role:', error);
      toast({
        title: 'Error',
        description: 'Failed to set admin role. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Admin Setup</span>
        </CardTitle>
        <CardDescription>
          Enter the admin secret key to gain administrative privileges
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">For Demo/Testing Only</p>
              <p>This is a temporary setup method for testing the admin functionality.</p>
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="secret-key">Admin Secret Key</Label>
          <Input
            id="secret-key"
            type="password"
            placeholder="Enter admin secret key"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            className="mt-2"
          />
        </div>
        
        <Button
          onClick={handleSetupAdmin}
          disabled={loading || !secretKey.trim()}
          className="w-full"
        >
          {loading ? 'Setting up admin access...' : 'Grant Admin Access'}
        </Button>
        
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Demo Secret Key:</strong> campus-connect-admin-2024</p>
          <p>In production, use proper role-based authentication through your backend.</p>
        </div>
      </CardContent>
    </Card>
  );
}
