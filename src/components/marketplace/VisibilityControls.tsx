import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, University, Info } from 'lucide-react';
import { VisibilitySettings } from '@/types/listing';

interface VisibilityControlsProps {
  visibilitySettings: VisibilitySettings;
  onVisibilityChange: (settings: VisibilitySettings) => void;
  userUniversity?: string;
}

export function VisibilityControls({ 
  visibilitySettings, 
  onVisibilityChange, 
  userUniversity 
}: VisibilityControlsProps) {
  const handleModeChange = (mode: 'university' | 'all_students') => {
    const newSettings: VisibilitySettings = {
      ...visibilitySettings,
      mode,
      allowedUniversities: mode === 'university' && userUniversity ? [userUniversity] : undefined
    };
    onVisibilityChange(newSettings);
  };

  const getVisibilityDescription = () => {
    switch (visibilitySettings.mode) {
      case 'university':
        return userUniversity 
          ? `Only students from ${userUniversity} can see this listing`
          : 'Only students from your university can see this listing';
      case 'all_students':
        return 'All registered students across participating institutions can see this listing';
      default:
        return 'Select a visibility mode';
    }
  };

  const getVisibilityIcon = () => {
    switch (visibilitySettings.mode) {
      case 'university':
        return <University className="h-5 w-5 text-blue-600" />;
      case 'all_students':
        return <Globe className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const getVisibilityBadge = () => {
    switch (visibilitySettings.mode) {
      case 'university':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">University Only</Badge>;
      case 'all_students':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">All Students</Badge>;
      default:
        return <Badge variant="outline">Not Set</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getVisibilityIcon()}
          Listing Visibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="visibility-mode">Visibility Mode</Label>
          {getVisibilityBadge()}
        </div>

        <div className="space-y-2">
          <Select 
            value={visibilitySettings.mode} 
            onValueChange={handleModeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select visibility mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="university">
                <div className="flex items-center gap-2">
                  <University className="h-4 w-4" />
                  <div>
                    <div className="font-medium">University Only</div>
                    <div className="text-xs text-gray-500">Visible to peers within your university</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="all_students">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <div>
                    <div className="font-medium">All Students</div>
                    <div className="text-xs text-gray-500">Visible to all registered students</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              {getVisibilityDescription()}
            </p>
          </div>
        </div>

        {visibilitySettings.mode === 'university' && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <University className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 mb-1">University-Only Mode</p>
                <p className="text-blue-700">
                  This listing will only be visible to students who are verified members of your university. 
                  This helps create a trusted community marketplace within your campus.
                </p>
              </div>
            </div>
          </div>
        )}

        {visibilitySettings.mode === 'all_students' && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <Globe className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-800 mb-1">All Students Mode</p>
                <p className="text-green-700">
                  This listing will be visible to all verified students across participating institutions. 
                  This maximizes your potential buyer reach.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
