
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input"; // Import Input component

interface FilterSidebarProps {
  className?: string;
  onFilterChange: (filters: { category: string; priceRange: [number, number]; condition: string[]; university: string; sellerName: string; }) => void;
  onResetFilters: () => void;
  currentFilters: { category: string; priceRange: [number, number]; condition: string[]; university: string; sellerName: string; };
  onSellerNameChange: (name: string) => void; // New prop for seller name changes
}

export function FilterSidebar({ className, onFilterChange, onResetFilters, currentFilters, onSellerNameChange }: FilterSidebarProps) {
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

  const [category, setCategory] = useState(currentFilters.category);
  const [priceRange, setPriceRange] = useState(currentFilters.priceRange);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(currentFilters.condition);
  const [university, setUniversity] = useState(currentFilters.university);
  const [sellerName, setSellerName] = useState(currentFilters.sellerName); // New state for seller name

  useEffect(() => {
    setCategory(currentFilters.category);
    setPriceRange(currentFilters.priceRange);
    setSelectedConditions(currentFilters.condition);
    setUniversity(currentFilters.university);
    setSellerName(currentFilters.sellerName); // Sync sellerName
  }, [currentFilters]);

  const handleConditionChange = (id: string, checked: boolean) => {
    setSelectedConditions((prev) => 
      checked ? [...prev, id] : prev.filter((c) => c !== id)
    );
  };

  const handleApplyFilters = useCallback(() => {
    onFilterChange({
      category,
      priceRange,
      condition: selectedConditions,
      university,
      sellerName, // Include sellerName
    });
  }, [category, priceRange, selectedConditions, university, sellerName, onFilterChange]);

  const handleReset = useCallback(() => {
    setCategory("");
    setPriceRange([0, 1000]);
    setSelectedConditions([]);
    setUniversity("");
    setSellerName(""); // Clear seller name on reset
    onResetFilters();
  }, [onResetFilters]);

  const activeFilters = [
    category && { type: "category", value: category, label: categories.find(c => c.toLowerCase() === category)?.replace(/\b\w/g, l => l.toUpperCase()) || category },
    (priceRange[0] > 0 || priceRange[1] < 1000) && { type: "price", value: priceRange, label: `$${priceRange[0]}-$${priceRange[1]}` },
    ...selectedConditions.map(cond => ({ type: "condition", value: cond, label: conditions.find(c => c.id === cond)?.label || cond })),
    university && { type: "university", value: university, label: universities.find(u => u.toLowerCase() === university)?.replace(/\b\w/g, l => l.toUpperCase()) || university },
    sellerName && { type: "sellerName", value: sellerName, label: `Seller: ${sellerName}` }, // New active filter for seller name
  ].filter(Boolean) as { type: string; value: string | number[]; label: string }[]; // Explicitly type activeFilters

  const handleRemoveFilter = (type: string, value: string | number[]) => {
    if (type === "category") setCategory("");
    if (type === "price") setPriceRange([0, 1000]);
    if (type === "condition") setSelectedConditions((prev) => prev.filter((c) => c !== value));
    if (type === "university") setUniversity("");
    if (type === "sellerName") {
      setSellerName(""); // Remove seller name filter
      onSellerNameChange(""); // Notify parent to clear seller name
    }
    // Apply filters after removing one
    onFilterChange({
      category: type === "category" ? "" : category,
      priceRange: type === "price" ? [0, 1000] : priceRange,
      condition: type === "condition" ? selectedConditions.filter((c) => c !== value) : selectedConditions,
      university: type === "university" ? "" : university,
      sellerName: type === "sellerName" ? "" : sellerName, // Update sellerName
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600" onClick={handleReset}>
              Reset All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Active Filters</h3>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter) => ( // Removed 'any' type here
                  <Badge key={`${filter.type}-${filter.value}`} variant="secondary" className="flex items-center gap-1">
                    {filter.label}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveFilter(filter.type, filter.value)} />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Seller Name Filter */}
          <div>
            <h3 className="font-medium mb-3">Seller Name</h3>
            <Input
              type="text"
              placeholder="Search by seller name..."
              value={sellerName}
              onChange={(e) => {
                setSellerName(e.target.value);
                onSellerNameChange(e.target.value); // Call the new prop
              }}
            />
          </div>

          <Separator />

          {/* Category Filter */}
          <div>
            <h3 className="font-medium mb-3">Category</h3>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat.toLowerCase()}>
                    {cat}
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
                defaultValue={priceRange}
                value={priceRange}
                onValueChange={(val: number[]) => setPriceRange([val[0], val[1]])}
                max={1000}
                min={0}
                step={10}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>${priceRange[0]}</span>
                <span>${priceRange[1]}+</span>
              </div>
            </div>
          </div>

          {/* Condition */}
          <div>
            <h3 className="font-medium mb-3">Condition</h3>
            <div className="space-y-2">
              {conditions.map((cond) => (
                <div key={cond.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={cond.id} 
                    checked={selectedConditions.includes(cond.id)}
                    onCheckedChange={(checked: boolean) => handleConditionChange(cond.id, checked)}
                  />
                  <label
                    htmlFor={cond.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {cond.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* University */}
          <div>
            <h3 className="font-medium mb-3">University</h3>
            <Select value={university} onValueChange={setUniversity}>
              <SelectTrigger>
                <SelectValue placeholder="All universities" />
              </SelectTrigger>
              <SelectContent>
                {universities.map((uni) => (
                  <SelectItem key={uni} value={uni.toLowerCase()}>
                    {uni}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Apply Filters Button */}
          <Button className="w-full bg-blue-500 hover:bg-blue-600" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
