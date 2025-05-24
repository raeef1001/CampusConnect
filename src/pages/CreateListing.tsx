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
import { PriceAdvisor } from "@/components/ui/price-advisor";
import { ImageAnalyzer } from "@/components/ui/image-analyzer";
import MultiLocationPickerMap, { LocationData } from "@/components/MultiLocationPickerMap";
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, MapPin } from 'lucide-react';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/components/ui/use-toast';
import { ImageAnalysisResult } from '@/lib/gemini';

export default function CreateListing() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [deliveryRadius, setDeliveryRadius] = useState<number>(5);

  const { toast } = useToast();

  const handleImageAnalysisComplete = (result: ImageAnalysisResult) => {
    setTitle(result.title);
    setDescription(result.description);
    setCategory(result.category);
    setCondition(result.condition);
    setPrice(result.suggestedPrice.toString());
    setAiAnalyzed(true);

    toast({
      title: "AI Analysis Complete!",
      description: `Form automatically filled with ${result.confidence}% confidence. Review and edit as needed.`,
    });
  };

  const handleImageSelected = (file: File) => {
    setImageFile(file);
    setAiAnalyzed(false);
  };

  const handlePriceSuggestion = (suggestedPrice: number) => {
    setPrice(suggestedPrice.toString());
    toast({
      title: "Price Updated",
      description: `Price set to $${suggestedPrice} based on market analysis.`,
    });
  };

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

    setUploading(true);
    let imageUrl = "";

    if (imageFile) {
      try {
        // Convert File to base64 string for Cloudinary upload
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; // Assuming an upload preset is configured for unsigned uploads

        if (!cloudName || !uploadPreset) {
          throw new Error("Cloudinary configuration missing. Please ensure VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are set in your .env file.");
        }

        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', `listing_images/${user.uid}`); // Optional: organize uploads in folders
        formData.append('public_id', imageFile.name.split('.')[0]); // Use original file name as public_id

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Cloudinary upload failed: ${response.statusText}`);
        }

        const uploadResult = await response.json();
        imageUrl = uploadResult.secure_url;
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
      imageUrl = "/placeholder.svg";
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

    // Generate location string for backward compatibility
    const mainLocation = locations.find(loc => loc.type === 'main');
    const locationString = mainLocation 
      ? `${mainLocation.lat.toFixed(6)},${mainLocation.lng.toFixed(6)}`
      : "";

    try {
      await addDoc(collection(db, "listings"), {
        title,
        description,
        price: parseFloat(price),
        category,
        condition,
        imageUrl, // Use the uploaded image URL
        location: locationString, // Keep for backward compatibility
        locations: locations, // New multi-location support
        deliveryRadius: deliveryRadius, // Delivery radius in kilometers
        isAvailable: true, // New listings are available by default
        availabilityStatus: 'available', // Default availability status
        userId: user.uid, // Keep userId at top level for easy querying
        userEmail: user.email, // Keep userEmail at top level
        seller: sellerProfile, // Add the complete seller profile
        createdAt: serverTimestamp(),
        aiGenerated: aiAnalyzed, // Track if listing was AI-generated
      });

      toast({
        title: "Success",
        description: "Listing created successfully!",
      });
      navigate('/dashboard');
    } catch (error) {
      console.error("Error creating listing: ", error);
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
            <div className="max-w-7xl mx-auto">
              <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* AI Image Analyzer - Top Priority */}
                <div className="lg:col-span-1 order-1 lg:order-2">
                  <div className="sticky top-6 space-y-6">
                    <ImageAnalyzer
                      onAnalysisComplete={handleImageAnalysisComplete}
                      onImageSelected={handleImageSelected}
                    />
                    
                    {/* Price Advisor - Only show after basic details are filled */}
                    {(title || category || description) && (
                      <PriceAdvisor
                        title={title}
                        category={category}
                        condition={condition}
                        description={description}
                        onPriceSuggestion={handlePriceSuggestion}
                      />
                    )}
                  </div>
                </div>

                {/* Main Form */}
                <div className="lg:col-span-2 order-2 lg:order-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        Create New Listing
                        {aiAnalyzed && (
                          <div className="flex items-center gap-1 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            <Sparkles className="h-3 w-3" />
                            AI Generated
                          </div>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {!imageFile 
                          ? "Start by uploading an image for AI analysis, or fill in the details manually."
                          : aiAnalyzed 
                            ? "AI has analyzed your image and filled in the details. Review and edit as needed."
                            : "Fill in the details below to create a new marketplace listing."
                        }
                      </CardDescription>
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
                            className={aiAnalyzed ? "border-purple-200 bg-purple-50/30" : ""}
                          />
                          {aiAnalyzed && (
                            <p className="text-xs text-purple-600">✨ AI generated - feel free to edit</p>
                          )}
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
                            className={aiAnalyzed ? "border-purple-200 bg-purple-50/30" : ""}
                          />
                          {aiAnalyzed && (
                            <p className="text-xs text-purple-600">✨ AI generated - feel free to edit</p>
                          )}
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
                              className={aiAnalyzed ? "border-purple-200 bg-purple-50/30" : ""}
                            />
                            {aiAnalyzed && (
                              <p className="text-xs text-purple-600">✨ AI suggested price</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select 
                              value={category} 
                              onValueChange={setCategory} 
                              required
                            >
                              <SelectTrigger 
                                id="category"
                                className={aiAnalyzed ? "border-purple-200 bg-purple-50/30" : ""}
                              >
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
                            {aiAnalyzed && (
                              <p className="text-xs text-purple-600">✨ AI detected category</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="condition">Condition (for physical items)</Label>
                          <Select 
                            value={condition} 
                            onValueChange={setCondition}
                          >
                            <SelectTrigger 
                              id="condition"
                              className={aiAnalyzed ? "border-purple-200 bg-purple-50/30" : ""}
                            >
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
                          {aiAnalyzed && (
                            <p className="text-xs text-purple-600">✨ AI assessed condition</p>
                          )}
                        </div>

                        {/* Delivery Radius Setting */}
                        <div className="space-y-2">
                          <Label htmlFor="delivery-radius">Delivery Radius (km)</Label>
                          <Input 
                            id="delivery-radius" 
                            type="number" 
                            placeholder="e.g., 5" 
                            value={deliveryRadius}
                            onChange={(e) => setDeliveryRadius(Number(e.target.value))}
                            min="1"
                            max="20"
                          />
                          <p className="text-xs text-gray-500">
                            Maximum distance you're willing to deliver products from your main location
                          </p>
                        </div>

                        {/* Location Selection */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-blue-600" />
                            <Label className="text-base font-medium">Selling & Delivery Locations</Label>
                          </div>
                          <p className="text-sm text-gray-600">
                            Select your main selling location and up to 3 delivery locations within your delivery radius.
                          </p>
                          <MultiLocationPickerMap
                            onLocationsChange={setLocations}
                            initialLocations={locations}
                            maxDeliveryLocations={3}
                            deliveryRadius={deliveryRadius}
                          />
                        </div>

                        {/* Manual Image Upload (if not using AI analyzer) */}
                        {!imageFile && (
                          <div className="space-y-2">
                            <Label htmlFor="manual-image">Or Upload Image Manually</Label>
                            <Input 
                              id="manual-image" 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageSelected(file);
                              }}
                            />
                          </div>
                        )}

                        <Button 
                          type="submit" 
                          className="w-full bg-blue-600 hover:bg-blue-700" 
                          disabled={uploading}
                        >
                          {uploading ? "Creating Listing..." : "Create Listing"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
