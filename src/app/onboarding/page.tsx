'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, UserPlus, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [inviteCode, setInviteCode] = useState('');
  const [mode, setMode] = useState<'selection' | 'create' | 'join'>('selection');

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const generateInviteCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleCreateFamily = async () => {
    if (!user || !familyName) return;
    setLoading(true);
    try {
      const familyRef = doc(collection(db, 'families'));
      const familyId = familyRef.id;
      const code = generateInviteCode();
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      const familyData = {
        id: familyId,
        name: familyName,
        inviteCode: code,
        inviteCodeExpires: expires.toISOString(),
        currencyCode: currency,
        adminUserId: user.uid,
        members: {
          [user.uid]: 'Admin'
        },
        approvalThresholds: {
          'Member': 100,
          'Co-Manager': 500
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(familyRef, familyData);
      await updateDoc(doc(db, 'userProfiles', user.uid), {
        familyId: familyId,
        role: 'Admin'
      });

      toast({ title: "Family Created!", description: `Welcome to ${familyName}.` });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!user || !inviteCode) return;
    setLoading(true);
    try {
      const familiesRef = collection(db, 'families');
      const q = query(familiesRef, where('inviteCode', '==', inviteCode.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("No family found with that invite code.");
      }

      const familyDoc = querySnapshot.docs[0];
      const familyData = familyDoc.data();
      
      const expiryDate = new Date(familyData.inviteCodeExpires);
      if (expiryDate < new Date()) {
        throw new Error("This invite code has expired. Please ask for a new one.");
      }

      if (Object.keys(familyData.members || {}).length >= 10) {
        throw new Error("This family has reached the maximum capacity of 10 members.");
      }

      // Add user to family members map
      await updateDoc(familyDoc.ref, {
        [`members.${user.uid}`]: 'Member'
      });

      // Update user profile with family ID
      await updateDoc(doc(db, 'userProfiles', user.uid), {
        familyId: familyDoc.id,
        role: 'Member'
      });

      toast({ title: "Welcome Home!", description: `You have joined ${familyData.name}.` });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Join family error:", error);
      toast({ 
        variant: "destructive", 
        title: "Join Failed", 
        description: error.message || "An unexpected error occurred while joining the family." 
      });
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading || (user && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 min-h-screen justify-center bg-background">
      <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold font-headline text-primary">Setup Your Home</h1>
        <p className="text-muted-foreground mt-2">Connect your family and start managing wealth.</p>
      </div>

      {mode === 'selection' && (
        <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-500">
          <Card className="cursor-pointer hover:border-primary transition-all shadow-md group bg-card" onClick={() => setMode('create')}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold">Create a New Family</h3>
                <p className="text-xs text-muted-foreground">Start a fresh household and invite others.</p>
              </div>
              <ArrowRight className="text-muted-foreground w-4 h-4" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-accent transition-all shadow-md group bg-card" onClick={() => setMode('join')}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold">Join Existing Family</h3>
                <p className="text-xs text-muted-foreground">Enter a 6-digit code shared by an admin.</p>
              </div>
              <ArrowRight className="text-muted-foreground w-4 h-4" />
            </CardContent>
          </Card>
        </div>
      )}

      {mode === 'create' && (
        <Card className="border-none shadow-xl bg-card animate-in slide-in-from-right-4 duration-300">
          <CardHeader>
            <CardTitle>Family Details</CardTitle>
            <CardDescription>Give your household a name and set a base currency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="familyName">Family Name</Label>
              <Input 
                id="familyName"
                placeholder="The Smiths" 
                value={familyName} 
                onChange={(e) => setFamilyName(e.target.value)} 
                className="rounded-xl h-11 bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Base Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency" className="rounded-xl h-11 bg-background">
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
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setMode('selection')}>Back</Button>
              <Button className="flex-1 rounded-xl h-11 font-bold" onClick={handleCreateFamily} disabled={!familyName}>Create Family</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === 'join' && (
        <Card className="border-none shadow-xl bg-card animate-in slide-in-from-right-4 duration-300">
          <CardHeader>
            <CardTitle>Invite Code</CardTitle>
            <CardDescription>Enter the 6-digit code from your family admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Input 
                placeholder="0 0 0 0 0 0" 
                className="text-center font-bold text-2xl h-16 tracking-[0.5em] rounded-xl bg-background" 
                value={inviteCode} 
                onChange={(e) => setInviteCode(e.target.value.slice(0, 6))}
                maxLength={6}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setMode('selection')}>Back</Button>
              <Button className="flex-1 rounded-xl h-11 font-bold" onClick={handleJoinFamily} disabled={inviteCode.length < 6}>Join Family</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}