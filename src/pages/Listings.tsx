import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  imageUrl: string;
  userId: string;
  userEmail: string;
  createdAt: Timestamp; // Firebase Timestamp
}

export default function Listings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listingsData: Listing[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Listing));
      console.log("Fetched listings:", listingsData); // Add this line for debugging
      setListings(listingsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching listings: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
              <h1 className="text-3xl font-bold mb-4">Marketplace Listings</h1>
              <p className="text-lg text-gray-600 mb-8">Browse items and services offered by students.</p>
              
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-72 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.length > 0 ? (
                    listings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        id={listing.id}
                        title={listing.title}
                        price={`$${typeof listing.price === 'number' ? listing.price.toFixed(2) : 'N/A'}`}
                        condition={listing.condition}
                        description={listing.description}
                        image={listing.imageUrl || "/placeholder.svg"}
                        category={listing.category}
                        seller={{
                          name: listing.userEmail.split('@')[0], // Use email prefix as name
                          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${listing.userEmail}`, // Placeholder avatar
                          university: "University Name", // Placeholder
                          rating: 4.5, // Placeholder
                          userId: listing.userId, // Pass the userId
                        }}
                        isService={listing.category === "Services"}
                      />
                    ))
                  ) : (
                    <div className="col-span-full bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                      <p className="text-gray-500">No listings found. Be the first to create one!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
