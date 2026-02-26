
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
  const [currency, setCurrency] = useState('USD');

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
      setCurrency(userData.preferences?.currency || 'USD');
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

          <Accordion type="single" collapsible className="w-full space-y-4 border-none">
            <AccordionItem value="personal-info" className="border-none">
              <AccordionTrigger className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline font-medium border-none [&>svg]:hidden">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <span>Personal Information</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-secondary/10 rounded-b-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">First Name</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-xl h-11 bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Last Name</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-xl h-11 bg-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Mobile Number</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} disabled={!!userData?.phoneNumber} className="rounded-xl h-11 bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Profile Photo</Label>
                  <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <Button variant="outline" size="sm" className="rounded-xl flex-1 gap-2 bg-white" onClick={() => fileInputRef.current?.click()} disabled={!!editPhoto}>
                      <Upload className="h-4 w-4" /> Upload
                    </Button>
                    {editPhoto && <Button variant="ghost" size="sm" className="rounded-xl text-destructive" onClick={() => setEditPhoto(null)}><X className="h-4 w-4" /></Button>}
                  </div>
                </div>
                <Button className="w-full rounded-xl h-11 font-bold gap-2 mt-2 shadow-lg" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />} Save Changes
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button variant="destructive" className="w-full h-12 rounded-xl mt-8 font-bold flex items-center gap-2" onClick={() => auth.signOut()}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
