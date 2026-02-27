'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, deleteField, collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserMinus, Shield, ShieldCheck, Copy, AlertCircle, User, RefreshCcw, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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

  // Fetch all user profiles that belong to this family.
  const membersQuery = useMemoFirebase(() => {
    if (!userData?.familyId) return null;
    return query(
      collection(db, 'userProfiles'), 
      where('familyId', '==', userData.familyId)
    );
  }, [userData?.familyId, db]);

  const { data: memberProfiles, isLoading: isMembersLoading } = useCollection(membersQuery);

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
    
    const currentRole = familyData.members?.[targetUserId];
    if (currentRole === 'Admin' && newRole !== 'Admin' && adminCount <= 1) {
      toast({ variant: "destructive", title: "Action Blocked", description: "You must have at least one Admin in the family." });
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
    
    const currentRole = familyData.members?.[targetUserId];
    if (currentRole === 'Admin' && adminCount <= 1) {
      toast({ variant: "destructive", title: "Action Blocked", description: "Cannot remove the last Admin. Promote someone else first." });
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!familyData) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen text-center bg-background">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Family Found</h2>
        <p className="text-muted-foreground text-sm mt-2 mb-6">You haven't joined or created a family yet.</p>
        <Button onClick={() => router.push('/onboarding')}>Get Started</Button>
      </div>
    );
  }

  const membersList = Object.entries(familyData.members || {});

  return (
    <div className="p-6 pb-24 flex flex-col gap-6 bg-background min-h-screen">
      <header>
        <h1 className="text-2xl font-bold font-headline">{familyData.name}</h1>
        <p className="text-muted-foreground text-sm">Family Governance & Settings</p>
      </header>

      {isAdmin && (
        <Card className="border-none shadow-xl bg-primary text-white overflow-hidden">
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
              <button className="font-bold underline text-white flex items-center gap-1" onClick={generateNewCode} disabled={isUpdating}>
                <RefreshCcw className={cn("h-3 w-3", isUpdating && "animate-spin")} /> Refresh Code
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold">Family Members</h3>
          <Badge variant="secondary" className="text-[10px] font-bold">{membersList.length}/10 MEMBERS</Badge>
        </div>
        <div className="space-y-3">
          {membersList.map(([memberId, role]) => {
            const profile = memberProfiles?.find(p => p.id === memberId);
            const isMe = memberId === user?.uid;
            
            const firstName = profile?.firstName || (isMe ? userData?.firstName : '');
            const lastName = profile?.lastName || (isMe ? userData?.lastName : '');
            const fullName = `${firstName} ${lastName}`.trim();
            const displayName = fullName || profile?.email || "Unnamed Member";

            return (
              <Card key={memberId} className="border-none shadow-sm overflow-hidden bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/10">
                      <AvatarImage src={profile?.photoUrl} />
                      <AvatarFallback className="bg-secondary text-primary font-bold text-lg">
                        {displayName?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        {displayName}
                        {isMe && <Badge variant="outline" className="text-[8px] h-4 py-0 px-1 font-bold border-primary text-primary">YOU</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        {role === 'Admin' ? <ShieldCheck className="h-3 w-3 text-primary" /> : <Shield className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{role as string}</span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Select 
                        value={role as string} 
                        onValueChange={(val) => handleRoleChange(memberId, val)}
                        disabled={isMe && adminCount <= 1}
                      >
                        <SelectTrigger className="h-9 w-28 text-[10px] font-bold rounded-lg bg-secondary/50 border-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Co-Manager">Co-Manager</SelectItem>
                          <SelectItem value="Member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      {!isMe && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={() => handleRemoveMember(memberId)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {(isMembersLoading || isFamilyDataLoading) && membersList.length === 0 && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-none shadow-sm bg-card h-20 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
