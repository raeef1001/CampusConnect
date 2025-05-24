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

export default function CreateListing() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [image, setImage] = useState(''); // For simplicity, using a URL string

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you would send this data to a backend API
    console.log({ title, description, price, category, condition, image });
    alert('Listing created successfully! (Demo)');
    navigate('/dashboard'); // Redirect to dashboard after creation
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
                      <Label htmlFor="image">Image URL (for demo)</Label>
                      <Input 
                        id="image" 
                        placeholder="e.g., https://example.com/image.jpg" 
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                      />
                      <p className="text-sm text-gray-500">In a real app, this would be an image upload.</p>
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                      Create Listing
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
