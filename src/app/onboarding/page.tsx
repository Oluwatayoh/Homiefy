'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  const [currency, setCurrency] = useState('USD');
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
        currency: currency,
        members: {
          [user.uid]: 'Admin'
        },
        approvalThresholds: {
          'Member': 100,
          'Co-Manager': 500
        },
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      };

      await setDoc(familyRef, familyData);
      await updateDoc(doc(db, 'users', user.uid), {
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
      const q = query(familiesRef, where('inviteCode', '==', inviteCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Invalid invite code.");
      }

      const familyDoc = querySnapshot.docs[0];
      const familyData = familyDoc.data();
      
      // BR8.4.3: Invite code expires after 7 days
      if (new Date(familyData.inviteCodeExpires) < new Date()) {
        throw new Error("BR8.4.3: This invite code has expired. Request a new one from your admin.");
      }

      // BR8.4.5: Maximum 10 members per family (MVP)
      if (Object.keys(familyData.members || {}).length >= 10) {
        throw new Error("BR8.4.5: This family has reached the maximum capacity of 10 members.");
      }

      await updateDoc(familyDoc.ref, {
        [`members.${user.uid}`]: 'Member'
      });

      await updateDoc(doc(db, 'users', user.uid), {
        familyId: familyDoc.id,
        role: 'Member'
      });

      toast({ title: "Joined Family!", description: `You are now a member of ${familyData.name}.` });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Join Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading || (user && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 min-h-screen justify-center">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Setup Your Home</h1>
        <p className="text-muted-foreground mt-2">Every great financial journey starts with a plan.</p>
      </div>

      {mode === 'selection' && (
        <div className="grid gap-4">
          <Card 
            className="cursor-pointer hover:border-primary transition-all shadow-md group"
            onClick={() => setMode('create')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold">Create a New Family</h3>
                <p className="text-xs text-muted-foreground">Start fresh and invite your household.</p>
              </div>
              <ArrowRight className="text-muted-foreground w-4 h-4" />
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-accent transition-all shadow-md group"
            onClick={() => setMode('join')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold">Join Existing Family</h3>
                <p className="text-xs text-muted-foreground">Enter a code from an existing admin.</p>
              </div>
              <ArrowRight className="text-muted-foreground w-4 h-4" />
            </CardContent>
          </Card>
        </div>
      )}

      {mode === 'create' && (
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle>Family Details</CardTitle>
            <CardDescription>Give your financial unit a name.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Family Name</label>
              <Input 
                placeholder="The Smiths" 
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Base Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode('selection')}>Back</Button>
              <Button className="flex-1" onClick={handleCreateFamily} disabled={!familyName || familyName.length < 3}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === 'join' && (
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle>Enter Invite Code</CardTitle>
            <CardDescription>Check with your family admin for the 6-digit code.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              placeholder="e.g. 123456" 
              className="text-center text-2xl font-bold tracking-widest h-14"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              maxLength={6}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode('selection')}>Back</Button>
              <Button className="flex-1" onClick={handleJoinFamily} disabled={inviteCode.length < 6}>Join</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
