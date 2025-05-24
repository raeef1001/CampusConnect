import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";

export default function Listings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
              <h1 className="text-3xl font-bold mb-4">My Listings</h1>
              <p className="text-lg text-gray-600 mb-8">Manage your active and past listings.</p>
              
              {/* Placeholder for listings content */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <p className="text-gray-500">Your listings will appear here.</p>
                <p className="text-gray-500 mt-2">Use the "Create Listing" button in the Navbar to add new items.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
