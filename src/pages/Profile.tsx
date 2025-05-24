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
import { Edit, Mail, Phone, MapPin, Star } from "lucide-react"; // Added Star icon for ratings
import LocationPickerMap from "@/components/LocationPickerMap"; // Import the new map component
import { auth, db } from "@/lib/firebase"; // Import auth and db
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore"; // Import firestore functions, added updateDoc and setDoc, and collection, query, where, getDocs, and Timestamp
import { onAuthStateChanged } from "firebase/auth"; // Import onAuthStateChanged
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { useToast } from '@/components/ui/use-toast'; // Import useToast
import { ListingCard } from "@/components/marketplace/ListingCard"; // Import ListingCard
import { Listing } from "@/types/listing"; // Import Listing type

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
    location?: string; // Stores coordinates "lat,lng"
    displayLocation?: string; // Stores human-readable address
  };
  listingsCount?: number;
  reviewsCount?: number;
  rating?: number;
}

interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number;
  comment: string;
  timestamp: Timestamp; // Firebase Timestamp
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
  const [editLocation, setEditLocation] = useState(''); // Stores coordinates "lat,lng"
  const [displayLocation, setDisplayLocation] = useState(''); // Stores human-readable address
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null); // For profile image upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false); // Loading state for avatar upload
  const [userListings, setUserListings] = useState<Listing[]>([]); // State for user's listings
  const [userReviews, setUserReviews] = useState<Review[]>([]); // State for reviews received by the user

  const { toast } = useToast();

  // Function to get human-readable place name from coordinates
  const getPlaceName = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.display_name || `${lat}, ${lng}`;
    } catch (error) {
      console.error("Error fetching place name:", error);
      return `${lat}, ${lng}`; // Fallback to coordinates if API fails
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          let profileData: UserProfile;

          if (userDocSnap.exists()) {
            profileData = { uid: user.uid, ...userDocSnap.data() } as UserProfile;
          } else {
            // If user profile doesn't exist, create a basic one in Firestore
            const newProfileData = {
              name: user.displayName || "New User",
              email: user.email || "N/A",
              university: "Not specified",
              avatar: user.photoURL || "/placeholder.svg",
              listingsCount: 0,
              reviewsCount: 0,
              rating: 0,
            };
            await setDoc(userDocRef, newProfileData, { merge: true }); // Create or merge
            profileData = { uid: user.uid, ...newProfileData } as UserProfile;
          }

          // Fetch listings count
          const listingsRef = collection(db, "listings");
          const qListings = query(listingsRef, where("sellerId", "==", user.uid));
          const listingsSnapshot = await getDocs(qListings);
          profileData.listingsCount = listingsSnapshot.size;

          // Fetch reviews count and calculate rating
          const reviewsRef = collection(db, "reviews");
          const qReviews = query(reviewsRef, where("reviewedUserId", "==", user.uid));
          const reviewsSnapshot = await getDocs(qReviews);
          profileData.reviewsCount = reviewsSnapshot.size;

          let totalRating = 0;
          const fetchedReviews: Review[] = [];
          reviewsSnapshot.forEach((doc) => {
            const reviewData = doc.data();
            totalRating += reviewData.rating;
            fetchedReviews.push({ id: doc.id, ...reviewData } as Review);
          });
          profileData.rating = reviewsSnapshot.size > 0 ? parseFloat((totalRating / reviewsSnapshot.size).toFixed(1)) : 0;

          setUserProfile(profileData);
          setUserListings(listingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing)));
          setUserReviews(fetchedReviews);

          // Initialize edit form states
          setEditName(profileData.name || '');
          setEditUniversity(profileData.university || '');
          setEditMajor(profileData.major || '');
          setEditBio(profileData.bio || '');
          setEditPhone(profileData.contact?.phone || '');
          setEditLocation(profileData.contact?.location || '');

          // Set display location if coordinates exist
          if (profileData.contact?.location) {
            const [lat, lng] = profileData.contact.location.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
              const placeName = await getPlaceName(lat, lng);
              setDisplayLocation(placeName);
            }
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
    let newDisplayLocation = userProfile?.contact?.displayLocation || '';

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

    // Perform reverse geocoding if location coordinates are available
    if (editLocation) {
      const [lat, lng] = editLocation.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        newDisplayLocation = await getPlaceName(lat, lng);
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
          location: editLocation, // Save coordinates
          displayLocation: newDisplayLocation, // Save human-readable address
        },
      };
      await updateDoc(userDocRef, updatedData);

      // Update local state to reflect changes
      setUserProfile(prev => prev ? { ...prev, ...updatedData, contact: { ...prev.contact, ...updatedData.contact } } : null);
      setDisplayLocation(newDisplayLocation); // Update displayLocation state

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
                  <DialogContent className="sm:max-w-2xl w-full p-6 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full pointer-events-auto h-[75vh] overflow-scroll">
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
                        <Label htmlFor="major">Major</Label>
                        <Input id="major" value={editMajor} onChange={(e) => setEditMajor(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea id="bio" value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <LocationPickerMap 
                          initialLocation={editLocation}
                          onLocationSelect={setEditLocation}
                        />
                        {editLocation && <p className="text-sm text-muted-foreground mt-2">Selected: {editLocation}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avatar">Profile Image</Label>
                        <Input 
                          id="avatar" 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => setEditAvatarFile(e.target.files ? e.target.files[0] : null)}
                          required
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
                      <Badge variant="secondary">Listings: {userProfile?.listingsCount || 0}</Badge>
                      <Badge variant="secondary">Reviews: {userProfile?.reviewsCount || 0}</Badge>
                      <Badge variant="secondary">Rating: {userProfile?.rating || 0}</Badge>
                    </div>
                    <p className="text-gray-700 mt-4 max-w-prose">{userProfile.bio || "No bio provided."}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-8">
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
                    <p>{userProfile.contact?.displayLocation || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* My Listings Section */}
              <h2 className="text-2xl font-bold mb-4">My Listings</h2>
              {userListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {userListings.map((listing) => (
                    <ListingCard 
                      key={listing.id}
                      id={listing.id}
                      title={listing.title}
                      price={listing.price}
                      condition={listing.condition}
                      description={listing.description}
                      image={listing.image}
                      seller={listing.seller}
                      category={listing.category}
                      isService={listing.isService}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 mb-8">No listings found.</p>
              )}

              {/* My Reviews Section */}
              <h2 className="text-2xl font-bold mb-4">Reviews Received</h2>
              {userReviews.length > 0 ? (
                <div className="space-y-6">
                  {userReviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center mb-2">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src={review.reviewerAvatar || "/placeholder.svg"} alt={review.reviewerName} />
                            <AvatarFallback>{review.reviewerName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{review.reviewerName}</p>
                            <div className="flex items-center text-yellow-500">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`}
                                />
                              ))}
                              <span className="ml-2 text-gray-600 text-sm">({review.rating.toFixed(1)})</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-700">{review.comment}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {review.timestamp?.toDate ? new Date(review.timestamp.toDate()).toLocaleDateString() : 'N/A'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No reviews received yet.</p>
              )}
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
