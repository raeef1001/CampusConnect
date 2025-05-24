import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import MultiLocationPickerMap, { LocationData } from "@/components/MultiLocationPickerMap";
import { ChevronLeft, Save, Eye, EyeOff } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [deliveryRadius, setDeliveryRadius] = useState<number>(5);
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'sold' | 'reserved' | 'unavailable'>('available');
  const [isAvailable, setIsAvailable] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) {
        setError("Listing ID is missing.");
        setLoading(false);
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to edit listings.");
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "listings", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const listingData = docSnap.data();
          
          // Check if current user is the owner
          if (listingData.userId !== user.uid) {
            setError("You can only edit your own listings.");
            setLoading(false);
            return;
          }

          // Populate form with existing data
          setTitle(listingData.title || '');
          setDescription(listingData.description || '');
          setPrice(listingData.price?.toString() || '');
          setCategory(listingData.category || '');
          setCondition(listingData.condition || '');
          setLocations(listingData.locations || []);
          setDeliveryRadius(listingData.deliveryRadius || 5);
          setAvailabilityStatus(listingData.availabilityStatus || 'available');
          setIsAvailable(listingData.isAvailable !== false); // Default to true if not set
        } else {
          setError("Listing not found.");
        }
      } catch (err) {
        console.error("Error fetching listing:", err);
        setError("Failed to load listing details.");
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to edit listings.",
        variant: "destructive",
      });
      return;
    }

    if (!id) {
      toast({
        title: "Error",
        description: "Listing ID is missing.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Generate location string for backward compatibility
      const mainLocation = locations.find(loc => loc.type === 'main');
      const locationString = mainLocation 
        ? `${mainLocation.lat.toFixed(6)},${mainLocation.lng.toFixed(6)}`
        : "";

      const updateData = {
        title,
        description,
        price: parseFloat(price),
        category,
        condition,
        location: locationString,
        locations: locations,
        deliveryRadius: deliveryRadius,
        isAvailable: isAvailable,
        availabilityStatus: availabilityStatus,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "listings", id), updateData);

      toast({
        title: "Success",
        description: "Listing updated successfully!",
      });
      
      navigate(`/listings/${id}`);
    } catch (error) {
      console.error("Error updating listing:", error);
      toast({
        title: "Error",
        description: "Failed to update listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvailabilityToggle = () => {
    const newAvailability = !isAvailable;
    setIsAvailable(newAvailability);
    
    // Auto-update status based on availability
    if (!newAvailability && availabilityStatus === 'available') {
      setAvailabilityStatus('unavailable');
    } else if (newAvailability && availabilityStatus === 'unavailable') {
      setAvailabilityStatus('available');
    }
  };

  if (loading) {
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
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-10 w-full" />
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

  if (error) {
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
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button onClick={() => navigate('/dashboard')}>
                      Go to Dashboard
                    </Button>
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
                Back
              </Button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Availability Controls */}
                <div className="lg:col-span-1 order-1 lg:order-2">
                  <div className="sticky top-6 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {isAvailable ? <Eye className="h-5 w-5 text-green-600" /> : <EyeOff className="h-5 w-5 text-red-600" />}
                          Product Availability
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="availability-toggle">Available for Sale</Label>
                          <Button
                            type="button"
                            variant={isAvailable ? "default" : "outline"}
                            size="sm"
                            onClick={handleAvailabilityToggle}
                            className={isAvailable ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            {isAvailable ? "Available" : "Unavailable"}
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="availability-status">Status</Label>
                          <Select value={availabilityStatus} onValueChange={(value: 'available' | 'sold' | 'reserved' | 'unavailable') => setAvailabilityStatus(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                              <SelectItem value="sold">Sold</SelectItem>
                              <SelectItem value="unavailable">Unavailable</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            {availabilityStatus === 'available' && "Your listing is visible and available for purchase."}
                            {availabilityStatus === 'reserved' && "Your listing is marked as reserved for a specific buyer."}
                            {availabilityStatus === 'sold' && "Your listing is marked as sold and hidden from search."}
                            {availabilityStatus === 'unavailable' && "Your listing is temporarily unavailable."}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Main Edit Form */}
                <div className="lg:col-span-2 order-2 lg:order-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">Edit Listing</CardTitle>
                      <CardDescription>
                        Update your listing details and manage availability.
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
                            <Label className="text-base font-medium">Selling & Delivery Locations</Label>
                          </div>
                          <p className="text-sm text-gray-600">
                            Update your main selling location and delivery locations.
                          </p>
                          <MultiLocationPickerMap
                            onLocationsChange={setLocations}
                            initialLocations={locations}
                            maxDeliveryLocations={3}
                            deliveryRadius={deliveryRadius}
                          />
                        </div>

                        <div className="flex gap-4">
                          <Button 
                            type="submit" 
                            className="flex-1 bg-blue-600 hover:bg-blue-700" 
                            disabled={saving}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save Changes"}
                          </Button>
                          
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => navigate(`/listings/${id}`)}
                          >
                            Cancel
                          </Button>
                        </div>
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
