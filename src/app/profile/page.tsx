'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, User as UserIcon, Settings, Bell, Shield, ChevronRight, Loader2, Save, Upload, X, Info, Fingerprint, Trash2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'userProfiles', user.uid) : null;
  }, [user, db]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const [isSaving, setIsSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  
  const [pushEnabled, setPushEnabled] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState([80]);
  const [currency, setCurrency] = useState('NGN');
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (userData) {
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setEditPhone(userData.phoneNumber || '');
      setEditPhoto(userData.photoUrl || null);
      setPushEnabled(userData.preferences?.pushNotifications ?? true);
      setAlertThreshold([userData.preferences?.alertThreshold ?? 80]);
      setCurrency(userData.preferences?.currency || 'NGN');
      
      // Check local storage for biometric state
      const localBio = localStorage.getItem('biometric_enabled') === 'true';
      setIsBiometricsEnabled(localBio);
    }
  }, [userData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast({ variant: "destructive", title: "File too large", description: "Please select an image smaller than 1MB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setEditPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !userDocRef) return;
    setIsSaving(true);
    try {
      await setDoc(userDocRef, {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        phoneNumber: editPhone,
        photoUrl: editPhoto,
        updatedAt: new Date().toISOString(),
        preferences: {
          pushNotifications: pushEnabled,
          alertThreshold: alertThreshold[0],
          currency: currency
        }
      }, { merge: true });
      
      toast({ title: "Profile Updated", description: "Your account settings have been saved." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterBiometrics = async () => {
    if (!user) return;

    try {
      // Trigger WebAuthn credential creation
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "KINETY",
          id: window.location.hostname,
        },
        user: {
          id: Uint8Array.from(user.uid, c => c.charCodeAt(0)),
          name: user.email || user.uid,
          displayName: firstName || user.email || "User",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      });

      if (credential) {
        localStorage.setItem('biometric_enabled', 'true');
        localStorage.setItem('biometric_email', user.email || '');
        setIsBiometricsEnabled(true);
        toast({ title: "Biometrics Registered", description: "You can now sign in with your device's biometrics." });
      }
    } catch (error: any) {
      console.error("Biometric registration failed:", error);
      toast({ 
        variant: "destructive", 
        title: "Registration Failed", 
        description: "Your device might not support this or the request was cancelled." 
      });
    }
  };

  const handleRemoveBiometrics = () => {
    localStorage.removeItem('biometric_enabled');
    localStorage.removeItem('biometric_email');
    setIsBiometricsEnabled(false);
    toast({ title: "Biometrics Removed", description: "Biometric login is now disabled for this device." });
  };

  if (isUserLoading || isUserDataLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) return null;

  return (
    <div className="p-6 flex flex-col gap-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold font-headline">My Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your account and preferences.</p>
      </header>

      <Card className="border-none shadow-xl bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={editPhoto || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{firstName} {lastName}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none mt-2">
                {userData?.role || 'Member'}
              </Badge>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="personal-info" className="border-none">
              <AccordionTrigger className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline [&>svg]:hidden">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <span className="font-medium">Personal Information</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">First Name</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Last Name</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Mobile Number</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} disabled={!!userData?.phoneNumber} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Profile Photo</Label>
                  <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <Button variant="outline" size="sm" className="rounded-xl flex-1 gap-2" onClick={() => fileInputRef.current?.click()} disabled={!!editPhoto}>
                      <Upload className="h-4 w-4" /> Upload
                    </Button>
                    {editPhoto && <Button variant="ghost" size="sm" className="rounded-xl text-destructive" onClick={() => setEditPhoto(null)}><X className="h-4 w-4" /></Button>}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="biometrics" className="border-none">
              <AccordionTrigger className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline [&>svg]:hidden">
                <div className="flex items-center gap-3">
                  <Fingerprint className="h-5 w-5 text-primary" />
                  <span className="font-medium">Biometric Security</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-4">
                <div className="space-y-2">
                  <p className="text-sm">Enable biometric sign-in for subsequent logins on this device.</p>
                  <div className="flex flex-col gap-2 pt-2">
                    {isBiometricsEnabled ? (
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-primary/20">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">ACTIVE</Badge>
                          <span className="text-xs font-medium">Device Registered</span>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={handleRemoveBiometrics}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full rounded-xl gap-2 h-11" onClick={handleRegisterBiometrics}>
                        <Fingerprint className="h-4 w-4" /> Register this Device
                      </Button>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      <Info className="inline h-3 w-3 mr-1" /> This only enables biometrics for this specific browser and device.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security" className="border-none">
              <AccordionTrigger className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline [&>svg]:hidden">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-medium">Security & Roles</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-4">
                <div className="p-3 rounded-lg bg-white/50 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Family Access Level</p>
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{userData?.role || 'Member'}</p>
                    {userData?.role === 'Admin' && <Badge className="text-[8px]">PRIMARY</Badge>}
                  </div>
                </div>
                {userData?.role === 'Admin' && (
                  <Button variant="outline" className="w-full rounded-xl gap-2" onClick={() => router.push('/family')}>
                    <Settings className="h-4 w-4" /> Manage Family Governance
                  </Button>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="notifications" className="border-none">
              <AccordionTrigger className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline [&>svg]:hidden">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <span className="font-medium">Notifications</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Push Alerts</Label>
                    <p className="text-[10px] text-muted-foreground">Spending approvals and goals.</p>
                  </div>
                  <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
                </div>
                <div className="flex items-center justify-between opacity-50">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Weekly Digest</Label>
                    <p className="text-[10px] text-muted-foreground">Family behavior summary.</p>
                  </div>
                  <Switch disabled />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="preferences" className="border-none">
              <AccordionTrigger className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline [&>svg]:hidden">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-primary" />
                  <span className="font-medium">Preferences</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-4">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Base Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="rounded-xl h-11 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGN">Nigerian Naira (NGN)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Alert Threshold</Label>
                    <span className="text-xs font-bold text-primary">{alertThreshold}%</span>
                  </div>
                  <Slider value={alertThreshold} onValueChange={setAlertThreshold} max={100} step={5} className="py-4" />
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" /> Warn me when envelope usage exceeds this limit.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-8 space-y-3">
            <Button className="w-full h-12 rounded-xl font-bold gap-2 shadow-lg" onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />} Save All Settings
            </Button>
            <Button variant="destructive" className="w-full h-12 rounded-xl font-bold flex items-center gap-2" onClick={() => auth.signOut()}>
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
