import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Added Badge import
import { BellRing, Package, MessageSquare, User } from "lucide-react";

export default function Notifications() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mock notifications data
  const mockNotifications = [
    {
      id: "1",
      type: "listing",
      icon: Package,
      message: "Your 'MacBook Pro' listing received a new offer!",
      time: "2 hours ago",
      read: false,
    },
    {
      id: "2",
      type: "message",
      icon: MessageSquare,
      message: "New message from Sarah Chen regarding 'Calculus Textbook'.",
      time: "5 hours ago",
      read: false,
    },
    {
      id: "3",
      type: "profile",
      icon: User,
      message: "John Doe viewed your profile.",
      time: "1 day ago",
      read: true,
    },
    {
      id: "4",
      type: "system",
      icon: BellRing,
      message: "System update: New features are now available!",
      time: "3 days ago",
      read: true,
    },
  ];

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
              
              <div className="space-y-4">
                {mockNotifications.map((notification) => (
                  <Card key={notification.id} className={!notification.read ? "bg-blue-50 border-blue-200" : ""}>
                    <CardContent className="flex items-center p-4">
                      <div className="mr-4">
                        <notification.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{notification.message}</p>
                        <p className="text-sm text-gray-500">{notification.time}</p>
                      </div>
                      {!notification.read && (
                        <Badge variant="secondary" className="ml-auto">New</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {mockNotifications.length === 0 && (
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-gray-500">
                    No new notifications.
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
