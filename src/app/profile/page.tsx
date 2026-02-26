
'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, User, Settings, Bell, Shield, ChevronRight, Loader2, Save } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'users', user.uid) : null;
  }, [user, db]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');

  // Initialize edit states when userData is available
  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
      setEditPhotoUrl(userData.photoUrl || '');
    }
  }, [userData]);

  const handleSaveProfile = async () => {
    if (!user || !userDocRef) return;
    setIsSaving(true);
    try {
      await setDoc(userDocRef, {
        name: editName,
        photoUrl: editPhotoUrl,
        lastLogin: serverTimestamp() // Update last interaction
      }, { merge: true });
      
      toast({ 
        title: "Profile Updated", 
        description: "Your personal details have been saved." 
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

  if (isUserLoading || isUserDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  };

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
              <AvatarImage src={userData?.photoUrl || user.photoURL || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {userData?.name?.[0] || user.displayName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
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
            <AccordionItem value="personal-info" className="border-none">
              <AccordionTrigger className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors hover:no-underline font-medium border-none data-[state=open]:rounded-b-none [&>svg]:hidden">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <span>Personal Information</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
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
                  {!editName && <p className="text-[9px] text-amber-600 font-bold italic">Missing: Please add your name.</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo" className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Profile Picture URL</Label>
                  <Input 
                    id="photo"
                    value={editPhotoUrl} 
                    onChange={(e) => setEditPhotoUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="rounded-xl h-11 bg-white"
                  />
                  {!editPhotoUrl && <p className="text-[9px] text-amber-600 font-bold italic">Missing: Please add a photo link.</p>}
                  <p className="text-[9px] text-muted-foreground italic">Provide a link to an image file (JPG, PNG).</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Email (Read-only)</Label>
                  <Input 
                    value={user.email || ''} 
                    disabled
                    className="rounded-xl h-11 bg-muted/30 text-muted-foreground"
                  />
                </div>

                <Button 
                  className="w-full rounded-xl h-11 font-bold gap-2 mt-2 shadow-lg" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                  Update Profile
                </Button>
              </AccordionContent>
            </AccordionItem>

            <div className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 opacity-70">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">Security & Roles</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 opacity-70">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <span className="font-medium">Notifications</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 opacity-70">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-primary" />
                <span className="font-medium">Preferences</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
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
