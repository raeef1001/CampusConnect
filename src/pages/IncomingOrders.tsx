import React, { useState } from 'react';
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingChat } from "@/components/ui/floating-chat";
import { IncomingOrders as IncomingOrdersComponent } from "@/components/marketplace/IncomingOrders";

export default function IncomingOrdersPage() {
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
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Incoming Orders</h1>
                <p className="text-gray-600 mt-2">
                  Manage and fulfill orders received on your listings
                </p>
              </div>
              
              <IncomingOrdersComponent />
            </div>
          </main>
        </div>
      </div>
      
      <FloatingChat />
    </div>
  );
}
