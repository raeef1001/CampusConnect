import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Added for edit form
import { Label } from "@/components/ui/label"; // Added for edit form
import { Textarea } from "@/components/ui/textarea"; // Added for edit form
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"; // Added for edit profile dialog
import { Edit, Mail, Phone, MapPin } from "lucide-react";
import { auth, db } from "@/lib/firebase"; // Import auth and db
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"; // Import firestore functions, added updateDoc and setDoc
import { onAuthStateChanged } from "firebase/auth"; // Import onAuthStateChanged
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { useToast } from '@/components/ui/use-toast'; // Import useToast

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  university: string;
  major?: string;
  bio?: string;
  avatar?: string;
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
  };
  listingsCount?: number;
  reviewsCount?: number;
  rating?: number;
}

export default function Profile() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // State for dialog visibility
  const [editName, setEditName] = useState('');
  const [editUniversity, setEditUniversity] = useState('');
  const [editMajor, setEditMajor] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null); // For profile image upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false); // Loading state for avatar upload

  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = { uid: user.uid, ...userDocSnap.data() } as UserProfile;
            setUserProfile(data);
            // Initialize edit form states
            setEditName(data.name || '');
            setEditUniversity(data.university || '');
            setEditMajor(data.major || '');
            setEditBio(data.bio || '');
            setEditPhone(data.contact?.phone || '');
            setEditLocation(data.contact?.location || '');
          } else {
            // If user profile doesn't exist, create a basic one in Firestore
            const newProfileData = {
              name: user.displayName || "New User",
              email: user.email || "N/A",
              university: "Not specified",
              avatar: user.photoURL || "/placeholder.svg",
              // Add other default fields as necessary
            };
            await setDoc(userDocRef, newProfileData, { merge: true }); // Create or merge
            const data = { uid: user.uid, ...newProfileData } as UserProfile;
            setUserProfile(data);
            // Initialize edit form states for new profile
            setEditName(data.name);
            setEditUniversity(data.university);
            setEditMajor('');
            setEditBio('');
            setEditPhone('');
            setEditLocation('');
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setError("Failed to load profile.");
        } finally {
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
        setError("Please log in to view your profile.");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSaveProfile = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to edit your profile.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadingAvatar(true); // Start avatar upload loading

    let avatarUrl = userProfile?.avatar || "/placeholder.svg"; // Default to current or placeholder

    if (editAvatarFile) {
      try {
        const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
          throw new Error("Cloudinary environment variables are not set.");
        }

        const formData = new FormData();
        formData.append('file', editAvatarFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Cloudinary upload failed.");
        }

        const data = await response.json();
        avatarUrl = data.secure_url;
        toast({
          title: "Image Uploaded",
          description: "Profile image uploaded successfully to Cloudinary.",
        });
      } catch (error) {
        console.error("Error uploading avatar to Cloudinary: ", error);
        toast({
          title: "Error",
          description: `Failed to upload profile image: ${error instanceof Error ? error.message : String(error)}.`,
          variant: "destructive",
        });
        setLoading(false);
        setUploadingAvatar(false);
        return; // Stop the process if avatar upload fails
      }
    }

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const updatedData = {
        name: editName,
        university: editUniversity,
        major: editMajor,
        bio: editBio,
        avatar: avatarUrl, // Use the uploaded avatar URL
        contact: {
          email: auth.currentUser.email, // Keep current user email
          phone: editPhone,
          location: editLocation,
        },
      };
      await updateDoc(userDocRef, updatedData);

      // Update local state to reflect changes
      setUserProfile(prev => prev ? { ...prev, ...updatedData, contact: { ...prev.contact, ...updatedData.contact } } : null);

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      setIsEditDialogOpen(false); // Close dialog on success
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadingAvatar(false); // End avatar upload loading
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar isAuthenticated={true} />
        <div className="flex flex-1">
          <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <Skeleton className="h-8 w-48 mb-8" />
              <Card className="mb-8">
                <CardContent className="flex flex-col md:flex-row items-center md:items-start p-6">
                  <Skeleton className="h-24 w-24 md:h-32 md:w-32 mb-4 md:mb-0 md:mr-8 rounded-full" />
                  <div className="text-center md:text-left flex-1">
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64 mb-4" />
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                    <Skeleton className="h-20 w-full mt-4" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar isAuthenticated={true} />
        <div className="flex flex-1">
          <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md text-center text-red-600">
              <p>{error}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return null; // Should not happen if error is handled
  }

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
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg w-full fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-6 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Make changes to your profile here. Click save when you're done.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="university">University</Label>
                        <Input id="university" value={editUniversity} onChange={(e) => setEditUniversity(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="major">Major (Optional)</Label>
                        <Input id="major" value={editMajor} onChange={(e) => setEditMajor(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio (Optional)</Label>
                        <Textarea id="bio" value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input id="phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location (Optional)</Label>
                        <Input id="location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avatar">Profile Image (Optional)</Label>
                        <Input 
                          id="avatar" 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => setEditAvatarFile(e.target.files ? e.target.files[0] : null)}
                        />
                        {editAvatarFile && <p className="text-sm text-muted-foreground">Selected: {editAvatarFile.name}</p>}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" onClick={handleSaveProfile} disabled={loading || uploadingAvatar}>
                        {loading || uploadingAvatar ? (uploadingAvatar ? "Uploading Image..." : "Saving...") : "Save changes"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="mb-8">
                <CardContent className="flex flex-col md:flex-row items-center md:items-start p-6">
                  <Avatar className="h-24 w-24 md:h-32 md:w-32 mb-4 md:mb-0 md:mr-8">
                    <AvatarImage src={userProfile.avatar || "/placeholder.svg"} alt={userProfile.name} />
                    <AvatarFallback>{userProfile.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="text-center md:text-left flex-1">
                    <h2 className="text-2xl font-semibold">{userProfile.name}</h2>
                    <p className="text-gray-600">{userProfile.university} {userProfile.major && `- ${userProfile.major}`}</p>
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                      <Badge variant="secondary">Listings: {userProfile.listingsCount || 0}</Badge>
                      <Badge variant="secondary">Reviews: {userProfile.reviewsCount || 0}</Badge>
                      <Badge variant="secondary">Rating: {userProfile.rating || 0}</Badge>
                    </div>
                    <p className="text-gray-700 mt-4 max-w-prose">{userProfile.bio || "No bio provided."}</p>
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
                    <p>{userProfile.contact?.email || userProfile.email}</p>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-600 mr-3" />
                    <p>{userProfile.contact?.phone || "N/A"}</p>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-600 mr-3" />
                    <p>{userProfile.contact?.location || "N/A"}</p>
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
