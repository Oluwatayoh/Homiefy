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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LogOut, User as UserIcon, Settings, Bell, Shield, ChevronRight, Loader2, Save, Upload, X, Info, Fingerprint, Trash2, Lock, Mail, Phone } from 'lucide-react';
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
  const [editEmail, setEditEmail] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  
  const [pushEnabled, setPushEnabled] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState([80]);
  const [currency, setCurrency] = useState('NGN');
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  
  const [showBioPrompt, setShowBioPrompt] = useState(false);
  const [bioPassConfirm, setBioPassConfirm] = useState('');

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
      setEditEmail(userData.email || '');
      setEditPhoto(userData.photoUrl || null);
      setPushEnabled(userData.preferences?.pushNotifications ?? true);
      setAlertThreshold([userData.preferences?.alertThreshold ?? 80]);
      setCurrency(userData.preferences?.currency || 'NGN');
      
      const localBio = localStorage.getItem('biometric_enabled') === 'true';
      setIsBiometricsEnabled(localBio);
    }
  }, [userData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast({ variant: "destructive", title: "File too large", description: "Image must be smaller than 1MB." });
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
        id: user.uid,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        phoneNumber: editPhone,
        email: editEmail,
        photoUrl: editPhoto,
        updatedAt: new Date().toISOString(),
        preferences: {
          pushNotifications: pushEnabled,
          alertThreshold: alertThreshold[0],
          currency: currency
        }
      }, { merge: true });
      
      toast({ title: "Profile Updated", description: "Settings saved successfully." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterBiometrics = async () => {
    if (!user || !bioPassConfirm) return;

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: "Homiefy", id: window.location.hostname },
        user: {
          id: Uint8Array.from(user.uid, c => c.charCodeAt(0)),
          name: user.email || user.uid,
          displayName: firstName || "User",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: { platformAuthenticatorPreference: "preferred", userVerification: "required" },
        timeout: 60000,
      };

      const credential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions });

      if (credential) {
        localStorage.setItem('biometric_enabled', 'true');
        localStorage.setItem('biometric_email', user.email || '');
        localStorage.setItem('biometric_cred', btoa(bioPassConfirm));
        setIsBiometricsEnabled(true);
        setShowBioPrompt(false);
        setBioPassConfirm('');
        toast({ title: "Biometrics Registered", description: "You can now sign in with your biometrics." });
      }
    } catch (error: any) {
      let message = "Your device might not support this or the request was cancelled.";
      if (error.name === 'NotAllowedError') message = 'Registration restricted by browser security policy.';
      toast({ variant: "destructive", title: "Registration Failed", description: message });
    }
  };

  const handleRemoveBiometrics = () => {
    localStorage.removeItem('biometric_enabled');
    localStorage.removeItem('biometric_email');
    localStorage.removeItem('biometric_cred');
    setIsBiometricsEnabled(false);
    toast({ title: "Biometrics Removed", description: "Biometric login is now disabled." });
  };

  if (isUserLoading || isUserDataLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) return null;

  const isEmailDisabled = !!userData?.email;
  const isPhoneDisabled = !!userData?.phoneNumber;

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
                {firstName?.[0] || 'U'}
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
              <AccordionTrigger className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <span className="font-medium">Personal Information</span>
                </div>
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
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    Email {isEmailDisabled && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={editEmail} 
                      onChange={(e) => setEditEmail(e.target.value)} 
                      disabled={isEmailDisabled}
                      className="rounded-xl pl-10 bg-white/50 disabled:opacity-50" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    Mobile Number {isPhoneDisabled && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={editPhone} 
                      onChange={(e) => setEditPhone(e.target.value)} 
                      disabled={isPhoneDisabled}
                      className="rounded-xl pl-10 bg-white/50 disabled:opacity-50" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Profile Photo</Label>
                  <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <Button variant="outline" size="sm" className="rounded-xl flex-1 gap-2" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4" /> Upload
                    </Button>
                    {editPhoto && <Button variant="ghost" size="sm" className="rounded-xl text-destructive" onClick={() => setEditPhoto(null)}><X className="h-4 w-4" /></Button>}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="biometrics" className="border-none">
              <AccordionTrigger className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline">
                <div className="flex items-center gap-3">
                  <Fingerprint className="h-5 w-5 text-primary" />
                  <span className="font-medium">Biometric Security</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-4">
                <div className="space-y-2">
                  {isBiometricsEnabled ? (
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-primary/20">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-none">ACTIVE</Badge>
                        <span className="text-xs font-medium">Device Registered</span>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={handleRemoveBiometrics}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full rounded-xl gap-2 h-11" onClick={() => setShowBioPrompt(true)}>
                      <Fingerprint className="h-4 w-4" /> Register this Device
                    </Button>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center mr-1"><Info className="h-3 w-3" /></span> Enables Fingerprint/FaceID sign-in on this device.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="notifications" className="border-none">
              <AccordionTrigger className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <span className="font-medium">Notifications</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Push Alerts</Label>
                    <p className="text-[10px] text-muted-foreground">Approvals and goal progress.</p>
                  </div>
                  <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="preferences" className="border-none">
              <AccordionTrigger className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-primary" />
                  <span className="font-medium">Preferences</span>
                </div>
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
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Alert Threshold</Label>
                    <span className="text-xs font-bold text-primary">{alertThreshold[0]}%</span>
                  </div>
                  <Slider value={alertThreshold} onValueChange={setAlertThreshold} max={100} step={5} className="py-4" />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-8 space-y-3">
            <Button className="w-full h-12 rounded-xl font-bold gap-2 shadow-lg" onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />} Save All Settings
            </Button>
            <Button variant="destructive" className="w-full h-12 rounded-xl font-bold gap-2" onClick={() => auth.signOut()}>
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showBioPrompt} onOpenChange={setShowBioPrompt}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              Secure Biometrics
            </DialogTitle>
            <DialogDescription>
              Confirm your password to link your account to this device's biometrics.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="Your current password" 
                  className="pl-10 h-12 rounded-xl"
                  value={bioPassConfirm}
                  onChange={(e) => setBioPassConfirm(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBioPrompt(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleRegisterBiometrics} disabled={!bioPassConfirm} className="rounded-xl bg-primary">
              Verify & Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
