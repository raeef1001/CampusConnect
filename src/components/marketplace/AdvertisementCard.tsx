import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdvertisementCard() {
  return (
    <Card className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg border-none">
      <CardHeader>
        <CardTitle className="text-3xl font-extrabold">Exclusive Student Discount!</CardTitle>
        <CardDescription className="text-blue-100">
          Unlock amazing deals on textbooks, electronics, and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-5xl font-black text-yellow-300">
          20% <span className="text-3xl font-semibold">OFF</span>
        </div>
        <div className="flex flex-col items-center md:items-start gap-2">
          <Badge variant="secondary" className="bg-yellow-300 text-blue-800 px-3 py-1 text-sm font-bold">
            Limited Time Offer!
          </Badge>
          <Button className="bg-white text-blue-600 hover:bg-gray-100 font-semibold py-2 px-6 rounded-full shadow-md transition-all duration-300">
            Shop Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
