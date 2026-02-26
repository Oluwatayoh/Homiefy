'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, ShieldCheck, Mail, Lock, Phone, Loader2, Fingerprint, Eye, EyeOff } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Validation States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const biometricsEnabled = localStorage.getItem('biometric_enabled') === 'true';
    const storedEmail = localStorage.getItem('biometric_email');
    if (biometricsEnabled && storedEmail) {
      setHasBiometrics(true);
      setEmail(storedEmail);
    }
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    // Allows + prefix, optional spaces/dashes/dots, and 10-15 digits
    return phone === '' || /^[\+]?[0-9\s\-\.]{10,15}$/.test(phone);
  };

  const validatePasswordStrength = (pass: string) => {
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasLowerCase = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const isLongEnough = pass.length >= 8;

    return {
      isValid: hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isLongEnough,
      errors: {
        length: !isLongEnough,
        upper: !hasUpperCase,
        lower: !hasLowerCase,
        number: !hasNumber,
        special: !hasSpecialChar,
      }
    };
  };

  async function handleGoogleLogin() {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'userProfiles', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const names = user.displayName?.split(' ') || [];
        await setDoc(userRef, {
          id: user.uid,
          firstName: names[0] || 'User',
          lastName: names.slice(1).join(' ') || '',
          email: user.email,
          displayName: user.displayName,
          photoUrl: user.photoURL,
          role: 'Member',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          preferences: {
            currency: 'USD',
            alertThreshold: 80,
            pushNotifications: true
          }
        });
      }
      toast({ title: "Welcome!", description: "Signed in with Google." });
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!firstName) newErrors.firstName = "First name is required";
    if (!lastName) newErrors.lastName = "Last name is required";
    
    if (!validateEmail(email)) {
      newErrors.email = "Invalid email address";
    }

    if (!validatePhone(phoneNumber)) {
      newErrors.phone = "Invalid format (e.g., +1234567890)";
    }

    const passStrength = validatePasswordStrength(password);
    if (!passStrength.isValid) {
      newErrors.password = "Requires 8+ chars, upper, lower, digit, & symbol";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({ 
        variant: "destructive", 
        title: "Validation Error", 
        description: "Please correct the highlighted fields." 
      });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      await setDoc(doc(db, 'userProfiles', user.uid), {
        id: user.uid,
        firstName,
        lastName,
        email,
        phoneNumber,
        displayName: `${firstName} ${lastName}`,
        role: 'Member',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          currency: 'USD',
          alertThreshold: 80,
          pushNotifications: true
        }
      });
      
      toast({ title: "Welcome!", description: "Account created successfully." });
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail(email)) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." });
      return;
    }
    if (!password) {
      toast({ variant: "destructive", title: "Missing Password", description: "Please enter your password." });
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      const userRef = doc(db, 'userProfiles', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          id: user.uid,
          firstName: 'User',
          lastName: '',
          email: user.email,
          displayName: user.email?.split('@')[0] || 'User',
          role: 'Member',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          preferences: {
            currency: 'USD',
            alertThreshold: 80,
            pushNotifications: true
          }
        });
      }
      
      toast({ title: "Welcome Back", description: "Signed in successfully." });
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    const storedEmail = localStorage.getItem('biometric_email');
    if (!storedEmail) return;

    try {
      setLoading(true);
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required"
        }
      });

      if (credential) {
        toast({ title: "Biometric Success", description: "Signing you in securely..." });
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error("Biometric login failed:", error);
      let message = 'Could not verify identity. Please use your password.';
      if (error.name === 'NotAllowedError') {
        message = 'Biometric sign-in is restricted by browser security policies.';
      }
      toast({ 
        variant: 'destructive', 
        title: 'Biometric Failed', 
        description: message 
      });
    } finally {
      setLoading(false);
    }
  }

  function handleAuthError(error: any) {
    let message = 'An unexpected error occurred.';
    if (error instanceof FirebaseError) {
      if (error.code === 'auth/operation-not-allowed') {
        message = 'Google sign-in is not enabled.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else {
        message = error.message;
      }
    }
    toast({ variant: 'destructive', title: 'Authentication Error', description: message });
  }

  if (isUserLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col items-center min-h-screen px-6 py-12 bg-white">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Zap className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-primary tracking-tight font-headline">KINETY</h1>
        <p className="text-muted-foreground text-sm font-medium mt-1">Family Financial Behavior OS</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl h-12 bg-secondary/50">
            <TabsTrigger value="login" className="rounded-lg font-bold">Login</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg font-bold">Signup</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 pt-4">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder="name@example.com" 
                    className="pl-10 h-12 rounded-xl" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    className="pl-10 pr-10 h-12 rounded-xl" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-lg" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign In"}
                </Button>

                {hasBiometrics && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleBiometricLogin}
                    className="w-full h-12 rounded-xl font-bold gap-2 border-primary/20 hover:bg-primary/5 text-primary"
                    disabled={loading}
                  >
                    <Fingerprint className="h-5 w-5" /> Sign in with Biometrics
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 pt-4">
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">First Name</Label>
                  <Input 
                    placeholder="Jane" 
                    className={cn("h-12 rounded-xl", errors.firstName && "border-red-500")} 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                  />
                  {errors.firstName && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.firstName}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Last Name</Label>
                  <Input 
                    placeholder="Doe" 
                    className={cn("h-12 rounded-xl", errors.lastName && "border-red-500")} 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                  />
                  {errors.lastName && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.lastName}</p>}
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder="name@example.com" 
                    className={cn("pl-10 h-12 rounded-xl", errors.email && "border-red-500")} 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>
                {errors.email && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.email}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Phone (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="tel" 
                    placeholder="+1234567890" 
                    className={cn("pl-10 h-12 rounded-xl", errors.phone && "border-red-500")} 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                  />
                </div>
                {errors.phone && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.phone}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type={showSignupPassword ? "text" : "password"}
                    placeholder="Min 8 characters" 
                    className={cn("pl-10 pr-10 h-12 rounded-xl", errors.password && "border-red-500")} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-[9px] text-red-500 leading-tight mt-1 ml-1">{errors.password}</p>
                ) : (
                  <p className="text-[9px] text-muted-foreground leading-tight mt-1 ml-1">
                    Must include uppercase, lowercase, number, and special character.
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground font-bold">Or</span></div>
        </div>

        <Button variant="outline" onClick={handleGoogleLogin} className="w-full h-12 rounded-xl font-bold gap-2 border-2" disabled={loading}>
          {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </>
          )}
        </Button>
      </div>

      <p className="mt-auto pt-10 text-xs text-muted-foreground flex items-center gap-1">
        <ShieldCheck className="h-3 w-3" /> Secure Collaborative Financial OS
      </p>
    </div>
  );
}
