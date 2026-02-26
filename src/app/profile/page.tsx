
'use client';

import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Settings, Bell, Shield, ChevronRight } from 'lucide-react';
import { useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const db = getFirestore();

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'users', user.uid) : null;
  }, [user, db]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  if (isUserLoading || isUserDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
    <div className="p-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold font-headline">My Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your account and preferences.</p>
      </header>

      <Card className="border-none shadow-xl bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={user.photoURL || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {user.displayName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{user.displayName}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                  {userData?.role || 'Member'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <span className="font-medium">Personal Information</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">Security & Roles</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <span className="font-medium">Notifications</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-primary" />
                <span className="font-medium">Preferences</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

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
              {userData?.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'Just now'}
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Joined KINETY</span>
            <span className="font-medium text-foreground">
              {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Today'}
            </span>
          </div>
        </Card>
      </section>
    </div>
  );
}
