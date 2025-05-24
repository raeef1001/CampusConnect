import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase"; // Import auth and db
import { doc, getDoc, updateDoc } from "firebase/firestore"; // Import Firestore functions
import { User as FirebaseUser, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"; // Import Firebase User type, added updatePassword, EmailAuthProvider, reauthenticateWithCredential
import { useEffect } from "react"; // Import useEffect
import { useToast } from '@/components/ui/use-toast'; // Import useToast

export default function Settings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null); // Current authenticated user
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [bookmarkNotifications, setBookmarkNotifications] = useState(true);
  const [systemNotifications, setSystemNotifications] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { toast } = useToast(); // Initialize toast

  // Load user preferences
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setMessageNotifications(data.preferences?.messageNotifications ?? true);
            setBookmarkNotifications(data.preferences?.bookmarkNotifications ?? true);
            setSystemNotifications(data.preferences?.systemNotifications ?? true);
          }
        } catch (error) {
          console.error("Error loading notification preferences:", error);
          toast({
            title: "Error",
            description: "Failed to load notification preferences.",
            variant: "destructive",
          });
        }
      }
    });
    return () => unsubscribeAuth();
  }, [toast]); // Added toast to dependency array

  // Save notification preferences to Firestore
  const saveNotificationPreferences = async (type: string, value: boolean) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to save preferences.",
        variant: "destructive",
      });
      return;
    }
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      // Fetch current preferences to avoid overwriting other fields
      const userDocSnap = await getDoc(userDocRef);
      const currentPreferences = userDocSnap.exists() ? userDocSnap.data().preferences || {} : {};

      await updateDoc(userDocRef, {
        preferences: {
          ...currentPreferences,
          [type]: value,
        },
      });
      toast({
        title: "Success",
        description: "Notification preference updated.",
      });
    } catch (error) {
      console.error("Error saving notification preference:", error);
      toast({
        title: "Error",
        description: "Failed to save notification preference. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to change your password.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) { // Firebase minimum password length
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Re-authenticate user for sensitive operation
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      toast({
        title: "Success",
        description: "Password changed successfully!",
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Error changing password:", error);
      let errorMessage = "Failed to change password. Please try again.";

      if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect current password.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Please log out and log in again to change your password (requires recent login).";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "New password is too weak. Please choose a stronger password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email. Please ensure your account email is valid.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={true} />
      
      <div className="flex">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-8">Settings</h1>

              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Manage how you receive notifications.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="message-notifications">New Message Notifications</Label>
                      <Switch
                        id="message-notifications"
                        checked={messageNotifications}
                        onCheckedChange={(checked) => {
                          setMessageNotifications(checked);
                          saveNotificationPreferences("messageNotifications", checked);
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="bookmark-notifications">Listing Bookmark Notifications</Label>
                      <Switch
                        id="bookmark-notifications"
                        checked={bookmarkNotifications}
                        onCheckedChange={(checked) => {
                          setBookmarkNotifications(checked);
                          saveNotificationPreferences("bookmarkNotifications", checked);
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="system-notifications">System Announcements</Label>
                      <Switch
                        id="system-notifications"
                        checked={systemNotifications}
                        onCheckedChange={(checked) => {
                          setSystemNotifications(checked);
                          saveNotificationPreferences("systemNotifications", checked);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your account password.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input 
                          id="current-password" 
                          type="password" 
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input 
                          id="new-password" 
                          type="password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input 
                          id="confirm-password" 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required 
                        />
                      </div>
                      <Button type="submit" className="w-full">Change Password</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
