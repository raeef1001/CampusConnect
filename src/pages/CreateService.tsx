import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUser } from '../utils/auth';
import { ServiceCategory } from '../types/service';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';

const CreateService: React.FC = () => {
  const user = getUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as ServiceCategory,
    hourlyRate: '',
    skills: [] as string[],
    availability: {
      days: [] as string[],
      timeSlots: [] as string[],
    },
    location: {
      type: 'online' as 'online' | 'in-person' | 'both',
      address: '',
    },
    requirements: '',
  });

  const [newSkill, setNewSkill] = useState('');

  const categories: { value: ServiceCategory; label: string }[] = [
    { value: 'assignments', label: 'Assignments Help' },
    { value: 'notes', label: 'Notes & Study Materials' },
    { value: 'lab-tasks', label: 'Lab Tasks' },
    { value: 'tuition', label: 'Tuition & Teaching' },
    { value: 'part-time-job', label: 'Part-time Jobs' },
    { value: 'task-offer', label: 'Task Offers' },
  ];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const timeSlots = [
    'Morning (6AM - 12PM)',
    'Afternoon (12PM - 6PM)',
    'Evening (6PM - 10PM)',
    'Night (10PM - 6AM)',
  ];

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as object),
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove),
    }));
  };

  const handleDayChange = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        days: checked
          ? [...prev.availability.days, day]
          : prev.availability.days.filter(d => d !== day),
      },
    }));
  };

  const handleTimeSlotChange = (timeSlot: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        timeSlots: checked
          ? [...prev.availability.timeSlots, timeSlot]
          : prev.availability.timeSlots.filter(t => t !== timeSlot),
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create a service');
      return;
    }

    if (!formData.title || !formData.description || !formData.category || !formData.hourlyRate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.skills.length === 0) {
      toast.error('Please add at least one skill');
      return;
    }

    if (formData.availability.days.length === 0) {
      toast.error('Please select at least one available day');
      return;
    }

    if (formData.availability.timeSlots.length === 0) {
      toast.error('Please select at least one time slot');
      return;
    }

    setLoading(true);

    try {
      const serviceData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        hourlyRate: parseFloat(formData.hourlyRate),
        providerId: user.uid,
        providerName: user.displayName || user.email?.split('@')[0] || 'Unknown',
        providerEmail: user.email || '',
        providerAvatar: user.photoURL || '',
        skills: formData.skills,
        availability: formData.availability,
        location: formData.location,
        rating: 0,
        reviewCount: 0,
        completedJobs: 0,
        responseTime: 'New provider',
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        tags: formData.skills.map(skill => skill.toLowerCase()),
        requirements: formData.requirements,
        portfolio: {
          images: [],
          documents: [],
        },
      };

      await addDoc(collection(db, 'services'), serviceData);
      toast.success('Service created successfully!');
      navigate('/services');
    } catch (error) {
      console.error('Error creating service:', error);
      toast.error('Failed to create service. Please try again.');
    } finally {
      setLoading(false);
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
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <Link to="/services" className="mr-4">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Services
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold mb-2">Offer Your Service</h1>
                <p className="text-lg text-gray-600">Help fellow students and earn money</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Service Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Math Tutoring, Assignment Help, Lab Report Writing"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your service, experience, and what you can help with..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate (USD) *</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="15.00"
                      value={formData.hourlyRate}
                      onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle>Skills & Expertise</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Add Skills *</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="e.g., Mathematics, Python, Essay Writing"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      />
                      <Button type="button" onClick={addSkill} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {skill}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeSkill(skill)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Availability */}
              <Card>
                <CardHeader>
                  <CardTitle>Availability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Available Days *</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {daysOfWeek.map((day) => (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox
                            id={day}
                            checked={formData.availability.days.includes(day)}
                            onCheckedChange={(checked) => handleDayChange(day, checked as boolean)}
                          />
                          <Label htmlFor={day} className="text-sm">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Time Slots *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {timeSlots.map((timeSlot) => (
                        <div key={timeSlot} className="flex items-center space-x-2">
                          <Checkbox
                            id={timeSlot}
                            checked={formData.availability.timeSlots.includes(timeSlot)}
                            onCheckedChange={(checked) => handleTimeSlotChange(timeSlot, checked as boolean)}
                          />
                          <Label htmlFor={timeSlot} className="text-sm">{timeSlot}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Service Type</Label>
                    <Select value={formData.location.type} onValueChange={(value) => handleInputChange('location.type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online Only</SelectItem>
                        <SelectItem value="in-person">In-Person Only</SelectItem>
                        <SelectItem value="both">Both Online & In-Person</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(formData.location.type === 'in-person' || formData.location.type === 'both') && (
                    <div>
                      <Label htmlFor="address">Address/Location</Label>
                      <Input
                        id="address"
                        placeholder="e.g., University Library, Campus Coffee Shop"
                        value={formData.location.address}
                        onChange={(e) => handleInputChange('location.address', e.target.value)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="requirements">Requirements (Optional)</Label>
                    <Textarea
                      id="requirements"
                      placeholder="Any specific requirements or expectations for clients..."
                      value={formData.requirements}
                      onChange={(e) => handleInputChange('requirements', e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Link to="/services">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Service'}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateService;
