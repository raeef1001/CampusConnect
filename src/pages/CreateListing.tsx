import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { db, auth } from '@/lib/firebase'; // Import storage
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'; // Import doc and getDoc
import { useToast } from '@/components/ui/use-toast';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({ 
  cloud_name: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME, 
  api_key: import.meta.env.VITE_CLOUDINARY_API_KEY, 
  api_secret: import.meta.env.VITE_CLOUDINARY_API_SECRET
});

export default function CreateListing() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null); // For file upload
  const [uploading, setUploading] = useState(false); // Loading state for upload

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a listing.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true); // Start uploading state
    let imageUrl = "";

    if (imageFile) {
      try {
        // Convert File to base64 string for Cloudinary upload
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        await new Promise<void>((resolve) => {
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            const uploadResult = await cloudinary.uploader.upload(base64data, {
              folder: `listing_images/${user.uid}`, // Optional: organize uploads in folders
              public_id: imageFile.name.split('.')[0], // Use original file name as public_id
            });
            imageUrl = uploadResult.secure_url;
            resolve();
          };
        });
      } catch (error) {
        console.error("Error uploading image to Cloudinary: ", error);
        toast({
          title: "Error",
          description: "Failed to upload image. Please try again.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }
    } else {
      imageUrl = "/placeholder.svg"; // Use placeholder if no image is selected
    }

    // Fetch seller profile
    let sellerProfile = {
      userId: user.uid,
      name: user.displayName || user.email?.split('@')[0] || "Unknown Seller",
      avatar: user.photoURL || "",
      university: "Unknown University", // Default, will try to fetch from profile
      rating: 0, // Default, will try to fetch from profile
    };

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        sellerProfile = {
          ...sellerProfile,
          name: userData.name || sellerProfile.name,
          avatar: userData.avatar || sellerProfile.avatar,
          university: userData.university || sellerProfile.university,
          rating: userData.rating || sellerProfile.rating,
        };
      }
    } catch (profileError) {
      console.error("Error fetching seller profile: ", profileError);
      // Continue without profile if there's an error
    }

    try {
      await addDoc(collection(db, "listings"), {
        title,
        description,
        price: parseFloat(price), // Convert price to a number
        category,
        condition,
        imageUrl, // Use the uploaded image URL
        userId: user.uid, // Keep userId at top level for easy querying
        userEmail: user.email, // Keep userEmail at top level
        seller: sellerProfile, // Add the complete seller profile
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Success",
        description: "Listing created successfully!",
      });
      navigate('/dashboard'); // Redirect to dashboard after creation
    } catch (error) {
      console.error("Error creating listing: ", error);
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false); // End uploading state
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
            <div className="max-w-3xl mx-auto">
              <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Create New Listing</CardTitle>
                  <CardDescription>Fill in the details below to create a new marketplace listing.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Listing Title</Label>
                      <Input 
                        id="title" 
                        placeholder="e.g., MacBook Pro 2021, Calculus Textbook" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Provide a detailed description of your item or service." 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={5}
                        required 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input 
                          id="price" 
                          type="number" 
                          placeholder="e.g., 1200" 
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          required 
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={category} onValueChange={setCategory} required>
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Electronics">Electronics</SelectItem>
                            <SelectItem value="Textbooks">Textbooks</SelectItem>
                            <SelectItem value="Services">Services</SelectItem>
                            <SelectItem value="Furniture">Furniture</SelectItem>
                            <SelectItem value="Academic Supplies">Academic Supplies</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="condition">Condition (for physical items)</Label>
                      <Select value={condition} onValueChange={setCondition}>
                        <SelectTrigger id="condition">
                          <SelectValue placeholder="Select condition (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Like New">Like New</SelectItem>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Used">Used</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image">Listing Image</Label>
                      <Input 
                        id="image" 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                      />
                      {imageFile && <p className="text-sm text-muted-foreground">Selected: {imageFile.name}</p>}
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={uploading}>
                      {uploading ? "Uploading Image..." : "Create Listing"}
                    </Button>
                  </form>
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
