
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserMinus, Shield, ShieldCheck, Copy, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function FamilyManagement() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'userProfiles', user.uid) : null;
  }, [user, db]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const familyDocRef = useMemoFirebase(() => {
    return userData?.familyId ? doc(db, 'families', userData.familyId) : null;
  }, [userData?.familyId, db]);

  const { data: familyData, isLoading: isFamilyDataLoading } = useDoc(familyDocRef);

  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const isAdmin = userData?.role === 'Admin';

  const adminCount = useMemo(() => {
    if (!familyData?.members) return 0;
    return Object.values(familyData.members).filter(role => role === 'Admin').length;
  }, [familyData]);

  const generateNewCode = async () => {
    if (!familyDocRef || !isAdmin) return;
    setIsUpdating(true);
    try {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      
      await updateDoc(familyDocRef, {
        inviteCode: newCode,
        inviteCodeExpires: expires.toISOString()
      });
      toast({ title: "New Invite Code Generated", description: `Code: ${newCode} (Expires in 7 days)` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (!familyDocRef || !isAdmin) return;
    
    const currentRole = familyData.members[targetUserId];
    if (currentRole === 'Admin' && newRole !== 'Admin' && adminCount <= 1) {
      toast({ variant: "destructive", title: "Action Blocked", description: "BR8.4.1: You must have at least one Admin in the family." });
      return;
    }

    setIsUpdating(true);
    try {
      await updateDoc(familyDocRef, {
        [`members.${targetUserId}`]: newRole
      });
      await updateDoc(doc(db, 'userProfiles', targetUserId), {
        role: newRole
      });
      toast({ title: "Role Updated", description: "The member's permissions have been changed." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!familyDocRef || !isAdmin) return;
    
    const currentRole = familyData.members[targetUserId];
    if (currentRole === 'Admin' && adminCount <= 1) {
      toast({ variant: "destructive", title: "Action Blocked", description: "BR8.4.1: Cannot remove the last Admin. Promote someone else first." });
      return;
    }

    if (!confirm("Are you sure you want to remove this member?")) return;
    
    setIsUpdating(true);
    try {
      await updateDoc(familyDocRef, {
        [`members.${targetUserId}`]: deleteField()
      });
      await updateDoc(doc(db, 'userProfiles', targetUserId), {
        familyId: deleteField(),
        role: deleteField()
      });
      toast({ title: "Member Removed", description: "They no longer have access to family data." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Removal Failed", description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isUserLoading || isUserDataLoading || isFamilyDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!familyData) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Family Found</h2>
        <p className="text-muted-foreground text-sm mt-2 mb-6">You haven't joined or created a family yet.</p>
        <Button onClick={() => router.push('/onboarding')}>Get Started</Button>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold font-headline">{familyData.name}</h1>
        <p className="text-muted-foreground text-sm">Family Governance & Settings</p>
      </header>

      {isAdmin && (
        <Card className="border-none shadow-xl bg-accent text-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/80">Invite Members</CardTitle>
            <CardDescription className="text-white/70">Share this code to add family members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/20 rounded-xl h-14 flex items-center justify-center text-2xl font-bold tracking-widest">
                {familyData.inviteCode}
              </div>
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-14 w-14 rounded-xl"
                onClick={() => {
                  navigator.clipboard.writeText(familyData.inviteCode);
                  toast({ title: "Copied!", description: "Invite code copied to clipboard." });
                }}
              >
                <Copy className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/70">Expires: {new Date(familyData.inviteCodeExpires).toLocaleDateString()}</span>
              <button className="font-bold underline text-white" onClick={generateNewCode} disabled={isUpdating}>Refresh Code</button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold">Family Members</h3>
          <Badge variant="secondary" className="text-[10px]">{Object.keys(familyData.members).length}/10 MEMBERS</Badge>
        </div>
        <div className="space-y-3">
          {Object.entries(familyData.members).map(([memberId, role]) => (
            <Card key={memberId} className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/10">
                    <AvatarFallback className="bg-secondary text-primary font-bold">{memberId[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold">{memberId === user?.uid ? "You" : "Member"}</p>
                    <div className="flex items-center gap-1">
                      {role === 'Admin' ? <ShieldCheck className="h-3 w-3 text-primary" /> : <Shield className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-[10px] font-medium text-muted-foreground">{role as string}</span>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Select 
                      value={role as string} 
                      onValueChange={(val) => handleRoleChange(memberId, val)}
                      disabled={memberId === user?.uid && adminCount <= 1}
                    >
                      <SelectTrigger className="h-8 w-28 text-[10px] font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Co-Manager">Co-Manager</SelectItem>
                        <SelectItem value="Member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    {memberId !== user?.uid && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveMember(memberId)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
