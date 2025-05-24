import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { AdminSetup } from '../components/admin/AdminSetup';

export default function AdminSetupPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isAuthenticated={true} />
      
      <div className="flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Setup
            </h1>
            <p className="text-gray-600">
              Set up administrative privileges for testing the admin dashboard
            </p>
          </div>
          
          <AdminSetup />
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              After setting up admin access, you can access the admin dashboard from the sidebar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
