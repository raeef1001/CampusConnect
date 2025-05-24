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
import { User as FirebaseUser } from "firebase/auth"; // Import Firebase User type
import { useEffect } from "react"; // Import useEffect

export default function Settings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null); // Current authenticated user
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [bookmarkNotifications, setBookmarkNotifications] = useState(true);
  const [systemNotifications, setSystemNotifications] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load user preferences
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setMessageNotifications(data.preferences?.messageNotifications ?? true);
          setBookmarkNotifications(data.preferences?.bookmarkNotifications ?? true);
          setSystemNotifications(data.preferences?.systemNotifications ?? true);
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Save notification preferences to Firestore
  const saveNotificationPreferences = async (type: string, value: boolean) => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, `preferences.${type}`, value); // Correct way to update nested field
      console.log(`Notification preference for ${type} updated to ${value}`);
    } catch (error) {
      console.error("Error saving notification preference:", error);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }
    // In a real app, send to backend for password update
    console.log("Changing password:", { currentPassword, newPassword });
    alert("Password changed successfully! (Demo)");
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
