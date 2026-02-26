'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useAuth, useUser as useFirebaseUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, User as UserIcon, Settings, Bell, Shield, ChevronRight, Loader2, Save, Camera, Upload, X, Info } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'users', user.uid) : null;
  }, [user, db]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  
  // Preferences & Notification State
  const [pushEnabled, setPushEnabled] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState([80]);
  const [currency, setCurrency] = useState('USD');

  // Handle redirection if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
      setEditPhone(userData.phoneNumber || '');
      setEditPhoto(userData.photoUrl || null);
      setPushEnabled(userData.preferences?.pushNotifications ?? true);
      setAlertThreshold([userData.preferences?.alertThreshold ?? 80]);
      setCurrency(userData.preferences?.currency || 'USD');
    }
  }, [userData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select an image smaller than 1MB."
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !userDocRef) return;
    setIsSaving(true);
    try {
      await setDoc(userDocRef, {
        name: editName,
        phoneNumber: editPhone,
        photoUrl: editPhoto,
        lastLogin: serverTimestamp(),
        preferences: {
          pushNotifications: pushEnabled,
          alertThreshold: alertThreshold[0],
          currency: currency
        }
      }, { merge: true });
      
      toast({ 
        title: "Profile Updated", 
        description: "Your account settings have been saved." 
      });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Update Failed", 
        description: error.message 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  };

  if (isUserLoading || isUserDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-6 flex flex-col gap-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold font-headline">My Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your account and preferences.</p>
      </header>

      <Card className="border-none shadow-xl bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative group">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={editPhoto || ''} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                  {userData?.name?.[0] || user.displayName?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <button 
                onClick={() => !editPhoto && fileInputRef.current?.click()}
                disabled={!!editPhoto}
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{userData?.name || user.displayName}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                  {userData?.role || 'Member'}
                </Badge>
              </div>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4 border-none">
            {/* Personal Information */}
            <AccordionItem value="personal-info" className="border-none">
              <AccordionTrigger className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline font-medium border-none data-[state=open]:rounded-b-none [&>svg]:hidden">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <span>Personal Information</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Display Name</Label>
                  <Input 
                    id="name"
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="rounded-xl h-11 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Mobile Number</Label>
                  <Input 
                    id="phone"
                    value={editPhone} 
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +234 800 000 0000"
                    className={cn(
                      "rounded-xl h-11 transition-colors",
                      userData?.phoneNumber ? "bg-muted/30 text-muted-foreground" : "bg-white"
                    )}
                    disabled={!!userData?.phoneNumber}
                  />
                  {userData?.phoneNumber && (
                    <p className="text-[9px] text-muted-foreground font-bold italic">Contact support to change your verified mobile number.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Profile Photo</Label>
                  <div className="flex flex-col gap-3">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl flex-1 gap-2 bg-white"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!!editPhoto}
                      >
                        <Upload className="h-4 w-4" /> Upload
                      </Button>
                      {editPhoto && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setEditPhoto(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <X className="h-4 w-4" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Button className="w-full rounded-xl h-11 font-bold gap-2 mt-2 shadow-lg" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Security & Roles */}
            <AccordionItem value="security" className="border-none">
              <AccordionTrigger className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline font-medium border-none data-[state=open]:rounded-b-none [&>svg]:hidden">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Security & Roles</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-4">
                <div className="p-4 rounded-xl bg-white border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Current Role</span>
                    <Badge variant="outline" className="border-primary text-primary">{userData?.role || 'Member'}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Your role determines your spending limits and approval authority. 
                    {userData?.role === 'Admin' 
                      ? " You have full control over family governance." 
                      : " Speak to your family Admin to request a role change."}
                  </p>
                  {userData?.role === 'Admin' && (
                    <Button variant="ghost" className="w-full text-primary text-xs h-8 font-bold mt-2" onClick={() => router.push('/family')}>
                      Manage Family Members <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Notifications */}
            <AccordionItem value="notifications" className="border-none">
              <AccordionTrigger className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline font-medium border-none data-[state=open]:rounded-b-none [&>svg]:hidden">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <span>Notifications</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-4">
                <div className="space-y-4 bg-white p-4 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Push Alerts</Label>
                      <p className="text-[10px] text-muted-foreground">Get notified of spending approvals.</p>
                    </div>
                    <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
                  </div>
                  <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Email Digest</Label>
                      <p className="text-[10px] text-muted-foreground">Weekly behavioral insights.</p>
                    </div>
                    <Switch disabled />
                  </div>
                </div>
                <Button className="w-full rounded-xl h-11 font-bold gap-2 shadow-lg" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                  Save Preferences
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Preferences */}
            <AccordionItem value="preferences" className="border-none">
              <AccordionTrigger className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline font-medium border-none data-[state=open]:rounded-b-none [&>svg]:hidden">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-primary" />
                  <span>Preferences</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-6">
                <div className="space-y-4 bg-white p-4 rounded-xl border">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Personal Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="NGN">NGN (₦)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Alert Threshold</Label>
                      <span className="text-xs font-bold text-primary">{alertThreshold[0]}%</span>
                    </div>
                    <Slider value={alertThreshold} onValueChange={setAlertThreshold} max={100} step={5} className="py-2" />
                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                      <Info className="h-3 w-3" /> Notify me when I reach this % of my envelope.
                    </p>
                  </div>
                </div>
                <Button className="w-full rounded-xl h-11 font-bold gap-2 shadow-lg" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                  Save Preferences
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button 
            variant="destructive" 
            className="w-full h-12 rounded-xl mt-8 font-bold flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </CardContent>
      </Card>

      <section className="mt-4">
        <h3 className="font-semibold mb-3 px-1">Session Info</h3>
        <Card className="border-none shadow-sm bg-white p-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Last Login</span>
            <span className="font-medium text-foreground">
              {userData?.lastLogin && typeof userData.lastLogin === 'object' && 'toDate' in userData.lastLogin
                ? (userData.lastLogin as any).toDate().toLocaleString()
                : userData?.lastLogin ? new Date(userData.lastLogin as any).toLocaleString() : 'Just now'}
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Joined KINETY</span>
            <span className="font-medium text-foreground">
              {userData?.createdAt && typeof userData.createdAt === 'object' && 'toDate' in userData.createdAt
                ? (userData.createdAt as any).toDate().toLocaleDateString()
                : userData?.createdAt ? new Date(userData.createdAt as any).toLocaleDateString() : 'Today'}
            </span>
          </div>
        </Card>
      </section>
    </div>
  );
}
