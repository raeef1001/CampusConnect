import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Eye, EyeOff, ArrowLeft, Shield, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { app, analytics } from "@/lib/firebase";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

export default function Auth() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [date, setDate] = useState<Date>();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const navigate = useNavigate();
  const auth = getAuth(app);
  
  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const switchToSignup = () => {
    setActiveTab("signup");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!fullName || !signupEmail || !signupPassword || !confirmPassword) {
      toast.error("Please fill all required fields");
      setIsLoading(false);
      return;
    }

    if (signupPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!agreeToTerms) {
      toast.error("Please agree to the terms and conditions");
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      // You can access the user object via userCredential.user
      // Here you could store additional user information (fullName, phoneNumber, date) to Firestore or Realtime Database
      // For example: await setDoc(doc(db, "users", userCredential.user.uid), { fullName, email: signupEmail, phoneNumber, dateOfBirth: date });
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-blue-100/50 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-emerald-100/40 rounded-full blur-3xl -z-10"></div>
      <div className="absolute top-1/4 left-1/4 w-12 h-12 bg-blue-400/30 rounded-full blur-xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-emerald-400/20 rounded-full blur-xl -z-10"></div>
      
      <div className="w-full max-w-md z-10">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 group">
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>
          
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
              <span className="text-white font-bold text-lg">CC</span>
            </div>
            <div className="text-center">
              <h1 className="font-bold text-3xl text-gray-900">CampusConnect</h1>
              <p className="text-gray-600">Your University Marketplace</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-2 rounded-xl shadow-xl border border-white/50">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-2">
              <TabsTrigger value="login" className="text-base">Login</TabsTrigger>
              <TabsTrigger value="signup" className="text-base">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader>
                  <CardTitle className="text-2xl">Welcome Back!</CardTitle>
                  <CardDescription>
                    Access your account with your university credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-center mb-2">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">University Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="yourname@university.edu"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <a href="#" className="text-xs text-blue-600 hover:underline">
                          Forgot password?
                        </a>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/40"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                      />
                      <Label htmlFor="remember" className="text-sm">Remember me for 30 days</Label>
                    </div>
                    <Button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-base py-5"
                    >
                      {isLoading ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                  <div className="text-center text-sm">
                    Don't have an account? 
                    <button 
                      type="button"
                      onClick={switchToSignup}
                      className="text-blue-600 hover:underline ml-1"
                    >
                      Sign up now
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="signup">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader>
                  <CardTitle className="text-2xl">Create Your Account</CardTitle>
                  <CardDescription>
                    Join thousands of students already trading on CampusConnect
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-center mb-2">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                
                  <form onSubmit={handleSignup} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupEmail">University Email</Label>
                      <Input
                        id="signupEmail"
                        type="email"
                        placeholder="yourname@university.edu"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/40"
                      />
                      <p className="text-xs text-gray-500">
                        Must be an official university email address
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupPassword">Password</Label>
                      <div className="relative">
                        <Input
                          id="signupPassword"
                          type={showPassword ? "text" : "password"}
                          required
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/40"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/40"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/40"
                      />
                      <p className="text-xs text-gray-500">
                        For admin verification and safety purposes only
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-gray-500">
                        For admin verification purposes only
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="terms" 
                        required 
                        className="mt-1"
                        checked={agreeToTerms}
                        onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                      />
                      <Label htmlFor="terms" className="text-sm font-normal">
                        I agree to the{" "}
                        <a href="#" className="text-blue-600 hover:underline">
                          Terms & Conditions
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-blue-600 hover:underline">
                          Privacy Policy
                        </a>
                      </Label>
                    </div>
                    <Button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-base py-5"
                    >
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>© 2024 CampusConnect. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
