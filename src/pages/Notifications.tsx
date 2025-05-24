import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BellRing, Package, MessageSquare, User as UserIcon } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { User as FirebaseUser } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button"; // Import Button component
import { Trash2, CheckCircle2 } from "lucide-react"; // Import icons
import { writeBatch } from "firebase/firestore"; // Import writeBatch

interface Notification {
  id: string;
  userId: string;
  type: "listing" | "message" | "profile" | "system" | "bookmark";
  message: string;
  read: boolean;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  relatedId?: string; // e.g., listingId, chatId, userId
}

export default function Notifications() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        setLoading(true);
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
          const fetchedNotifications: Notification[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Notification));
          setNotifications(fetchedNotifications);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching notifications: ", error);
          setLoading(false);
          toast({
            title: "Error",
            description: "Failed to load notifications.",
            variant: "destructive",
          });
        });

        return () => unsubscribeNotifications();
      } else {
        setCurrentUser(null);
        setNotifications([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      });
      toast({
        title: "Notification Marked as Read",
        description: "This notification has been marked as read.",
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    const unreadNotifications = notifications.filter(n => !n.read);

    if (unreadNotifications.length === 0) {
      toast({
        title: "No Unread Notifications",
        description: "All notifications are already marked as read.",
      });
      return;
    }

    unreadNotifications.forEach(notification => {
      const notificationRef = doc(db, "notifications", notification.id);
      batch.update(notificationRef, { read: true });
    });

    try {
      await batch.commit();
      toast({
        title: "All Notifications Marked as Read",
        description: "All your unread notifications have been marked as read.",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReadNotifications = async () => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    const readNotifications = notifications.filter(n => n.read);

    if (readNotifications.length === 0) {
      toast({
        title: "No Read Notifications to Delete",
        description: "There are no read notifications to delete.",
      });
      return;
    }

    readNotifications.forEach(notification => {
      const notificationRef = doc(db, "notifications", notification.id);
      batch.delete(notificationRef);
    });

    try {
      await batch.commit();
      toast({
        title: "Read Notifications Deleted",
        description: "All your read notifications have been deleted.",
      });
    } catch (error) {
      console.error("Error deleting read notifications:", error);
      toast({
        title: "Error",
        description: "Failed to delete read notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case "listing": return Package;
      case "message": return MessageSquare;
      case "profile": return UserIcon;
      case "bookmark": return BellRing; // Using BellRing for bookmark for now
      case "system": return BellRing;
      default: return BellRing;
    }
  };

  const formatTime = (timestamp: { seconds: number; nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
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
              <h1 className="text-3xl font-bold mb-4">Notifications</h1>
              <p className="text-lg text-gray-600 mb-8">Stay updated with activities on CampusConnect.</p>
              
              <div className="flex justify-end space-x-2 mb-4">
                <Button 
                  variant="outline" 
                  onClick={handleMarkAllAsRead} 
                  disabled={loading || notifications.filter(n => !n.read).length === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark All as Read
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDeleteReadNotifications} 
                  disabled={loading || notifications.filter(n => n.read).length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Read
                </Button>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="flex items-center p-4">
                          <Skeleton className="h-6 w-6 mr-4 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                          <Skeleton className="h-6 w-16 ml-auto" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notification) => {
                    const IconComponent = getNotificationIcon(notification.type);
                    const handleNotificationClick = async () => {
                      if (!notification.read) {
                        await handleMarkAsRead(notification.id);
                      }
                      if (notification.relatedId) {
                        switch (notification.type) {
                          case "listing":
                            navigate(`/listings/${notification.relatedId}`);
                            break;
                          case "message":
                            navigate(`/messages/${notification.relatedId}`);
                            break;
                          case "profile":
                            navigate(`/profile/${notification.relatedId}`);
                            break;
                          // Add more cases for other types if needed
                          default:
                            // For system or bookmark, might navigate to a generic notification detail or do nothing
                            console.log(`Unhandled notification type for deep linking: ${notification.type}`);
                            break;
                        }
                      }
                    };

                    return (
                      <Card 
                        key={notification.id} 
                        className={!notification.read ? "bg-blue-50 border-blue-200" : ""}
                        onClick={handleNotificationClick} // Use the new handler
                      >
                        <CardContent className="flex items-center p-4 cursor-pointer">
                          <div className="mr-4">
                            <IconComponent className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{notification.message}</p>
                            <p className="text-sm text-gray-500">{formatTime(notification.createdAt)}</p>
                          </div>
                          {!notification.read && (
                            <Badge variant="secondary" className="ml-auto">New</Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-gray-500 text-center">
                    <BellRing className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>You're all caught up!</p>
                    <p className="text-sm">No new notifications.</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
