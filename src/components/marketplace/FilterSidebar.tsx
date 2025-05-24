
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface FilterSidebarProps {
  className?: string;
}

export function FilterSidebar({ className }: FilterSidebarProps) {
  const categories = [
    "Textbooks", "Electronics", "Furniture", "Clothing", 
    "Sports Equipment", "Services", "Transportation", "Other"
  ];

  const conditions = [
    { id: "new", label: "New" },
    { id: "like-new", label: "Like New" },
    { id: "good", label: "Good" },
    { id: "fair", label: "Fair" },
  ];

  const universities = [
    "IUT Dhaka", "University of Dhaka", "BUET", "NSU", "BRAC University"
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600">
              Reset All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Filters */}
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                Electronics
                <X className="h-3 w-3 cursor-pointer" />
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                $50-$200
                <X className="h-3 w-3 cursor-pointer" />
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Category Filter */}
          <div>
            <h3 className="font-medium mb-3">Category</h3>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category.toLowerCase()}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="font-medium mb-3">Price Range</h3>
            <div className="space-y-3">
              <Slider
                defaultValue={[0, 1000]}
                max={1000}
                min={0}
                step={10}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>$0</span>
                <span>$1000+</span>
              </div>
            </div>
          </div>

          {/* Condition */}
          <div>
            <h3 className="font-medium mb-3">Condition</h3>
            <div className="space-y-2">
              {conditions.map((condition) => (
                <div key={condition.id} className="flex items-center space-x-2">
                  <Checkbox id={condition.id} />
                  <label
                    htmlFor={condition.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {condition.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* University */}
          <div>
            <h3 className="font-medium mb-3">University</h3>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="All universities" />
              </SelectTrigger>
              <SelectContent>
                {universities.map((university) => (
                  <SelectItem key={university} value={university.toLowerCase()}>
                    {university}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Apply Filters Button */}
          <Button className="w-full bg-blue-500 hover:bg-blue-600">
            Apply Filters
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
