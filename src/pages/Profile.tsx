import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, MapPin } from "lucide-react";

export default function Profile() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mock user data
  const user = {
    name: "John Doe",
    email: "john@iut-dhaka.edu",
    university: "IUT Dhaka",
    major: "Computer Science",
    bio: "Student passionate about technology and community building. Looking to connect with fellow students!",
    avatar: "/placeholder.svg",
    contact: {
      email: "john.doe@example.com",
      phone: "+880 123 456 789",
      location: "Dhaka, Bangladesh",
    },
    listingsCount: 5,
    reviewsCount: 12,
    rating: 4.8,
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
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">My Profile</h1>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>

              <Card className="mb-8">
                <CardContent className="flex flex-col md:flex-row items-center md:items-start p-6">
                  <Avatar className="h-24 w-24 md:h-32 md:w-32 mb-4 md:mb-0 md:mr-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="text-center md:text-left flex-1">
                    <h2 className="text-2xl font-semibold">{user.name}</h2>
                    <p className="text-gray-600">{user.university} - {user.major}</p>
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                      <Badge variant="secondary">Listings: {user.listingsCount}</Badge>
                      <Badge variant="secondary">Reviews: {user.reviewsCount}</Badge>
                      <Badge variant="secondary">Rating: {user.rating}</Badge>
                    </div>
                    <p className="text-gray-700 mt-4 max-w-prose">{user.bio}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>How to reach me.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-600 mr-3" />
                    <p>{user.contact.email}</p>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-600 mr-3" />
                    <p>{user.contact.phone}</p>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-600 mr-3" />
                    <p>{user.contact.location}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
