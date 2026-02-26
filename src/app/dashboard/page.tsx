
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit, where, updateDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { TrendingUp, CheckCircle2, MoreHorizontal, Wallet, Loader2, AlertCircle, AlertTriangle, ArrowRight, History, Plus, ShieldCheck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'users', user.uid) : null;
  }, [user, db]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const currentMonthId = useMemo(() => {
    if (!mounted) return '';
    return new Date().toISOString().slice(0, 7);
  }, [mounted]);
  
  const budgetDocRef = useMemoFirebase(() => {
    return userData?.familyId && currentMonthId ? doc(db, 'families', userData.familyId, 'budgets', currentMonthId) : null;
  }, [userData?.familyId, db, currentMonthId]);

  const { data: budgetData, isLoading: isBudgetLoading } = useDoc(budgetDocRef);

  const txQuery = useMemoFirebase(() => {
    if (!userData?.familyId) return null;
    return query(
      collection(db, 'families', userData.familyId, 'transactions'),
      orderBy('date', 'desc'),
      limit(5)
    );
  }, [userData?.familyId, db]);

  const { data: recentTxs, isLoading: isTxsLoading } = useCollection(txQuery);

  const isStaff = userData?.role === 'Admin' || userData?.role === 'Co-Manager';

  const approvalsQuery = useMemoFirebase(() => {
    if (!userData?.familyId) return null;
    // If Admin/Co-Manager, see all Pending. If Member, see own Pending.
    if (isStaff) {
      return query(
        collection(db, 'families', userData.familyId, 'approvals'),
        where('status', '==', 'Pending'),
        orderBy('requestedAt', 'desc')
      );
    } else {
      return query(
        collection(db, 'families', userData.familyId, 'approvals'),
        where('requesterId', '==', user?.uid),
        where('status', '==', 'Pending'),
        orderBy('requestedAt', 'desc')
      );
    }
  }, [userData?.familyId, db, isStaff, user?.uid]);

  const { data: pendingApprovals } = useCollection(approvalsQuery);

  const stsData = useMemo(() => {
    if (!budgetData || !mounted) return { amount: 0, status: 'neutral', percentSpent: 0, alerts: [] };

    const totalAllocated = budgetData.envelopes?.reduce((sum: number, e: any) => sum + (e.allocated || 0), 0) || 0;
    const totalSpent = budgetData.envelopes?.reduce((sum: number, e: any) => sum + (e.spent || 0), 0) || 0;
    const remainingBudget = totalAllocated - totalSpent;

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysLeft = (daysInMonth - currentDay) + 1;

    const amount = Math.max(0, remainingBudget / daysLeft);
    const percentSpent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    const alerts = (budgetData.envelopes || [])
      .filter((e: any) => (e.spent / (e.allocated || 1)) >= 0.8)
      .map((e: any) => ({
        name: e.name,
        percent: Math.round((e.spent / (e.allocated || 1)) * 100)
      }));

    let status = 'green';
    if (remainingBudget <= 0) status = 'red';
    else if (percentSpent > 80) status = 'yellow';

    return { amount, status, percentSpent, totalAllocated, totalSpent, alerts };
  }, [budgetData, mounted]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    } else if (!isUserDataLoading && userData && !userData.familyId) {
      router.push('/onboarding');
    }
  }, [user, isUserLoading, userData, isUserDataLoading, router]);

  const handleDecision = async (status: 'Approved' | 'Denied') => {
    if (!selectedApproval || !userData?.familyId) return;
    setIsProcessing(true);
    try {
      const approvalRef = doc(db, 'families', userData.familyId, 'approvals', selectedApproval.id);
      
      await updateDoc(approvalRef, {
        status,
        approverId: user!.uid,
        resolvedAt: new Date().toISOString()
      });

      if (status === 'Approved') {
        // Log the actual transaction
        const txRef = doc(collection(db, 'families', userData.familyId, 'transactions'));
        const txData = {
          ...selectedApproval.transactionData,
          id: txRef.id,
          familyId: userData.familyId,
          userId: selectedApproval.requesterId,
          userName: selectedApproval.requesterName,
          createdAt: new Date().toISOString()
        };
        await setDoc(txRef, txData);

        // Update budget envelope
        if (budgetDocRef && budgetData) {
          const updatedEnvelopes = budgetData.envelopes.map((e: any) => 
            e.name === selectedApproval.transactionData.category 
              ? { ...e, spent: (e.spent || 0) + selectedApproval.transactionData.amount } 
              : e
          );
          await updateDoc(budgetDocRef, { envelopes: updatedEnvelopes });
        }
      }

      toast({ 
        title: `Request ${status}`, 
        description: status === 'Approved' ? "Transaction has been logged." : "Requester will be notified." 
      });
      setSelectedApproval(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isUserLoading || isUserDataLoading || isBudgetLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-headline">{userData?.familyId ? "My Household" : "Welcome"}</h1>
          <p className="text-muted-foreground text-sm">Family Dashboard</p>
        </div>
        <div className="flex -space-x-2">
          <Avatar className="border-2 border-background w-8 h-8">
            <AvatarFallback className="text-[10px] bg-secondary text-primary font-bold">
              {user?.displayName?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <Card className={cn(
        "text-white border-none shadow-xl overflow-hidden relative transition-colors duration-500",
        stsData.status === 'green' ? "bg-emerald-600" : 
        stsData.status === 'yellow' ? "bg-amber-500" : "bg-destructive"
      )}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>
        <CardContent className="pt-8">
          <p className="text-white/80 text-sm font-medium">Safe to spend today</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h2 className="text-5xl font-bold tracking-tight">${stsData.amount.toFixed(2)}</h2>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {stsData.status === 'green' && (
              <p className="text-white/90 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Budget is healthy
              </p>
            )}
            {stsData.status === 'yellow' && (
              <p className="text-white/90 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Caution: Approaching limit
              </p>
            )}
            {stsData.status === 'red' && (
              <p className="text-white/90 text-xs flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3 h-3" /> OVER BUDGET ALERT
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals Section (Module 6) */}
      {pendingApprovals && pendingApprovals.length > 0 && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> 
              {isStaff ? "Needs Approval" : "Your Requests"}
            </h3>
            <Badge className="bg-primary text-[10px] font-bold">{pendingApprovals.length} PENDING</Badge>
          </div>
          <div className="space-y-2">
            {pendingApprovals.map((req) => (
              <Card 
                key={req.id} 
                className="border-none bg-amber-50 shadow-sm border-l-4 border-amber-500 cursor-pointer hover:bg-amber-100 transition-colors"
                onClick={() => setSelectedApproval(req)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{req.transactionData.description || req.transactionData.category}</p>
                      <p className="text-[10px] text-muted-foreground">{req.requesterName} • ${req.transactionData.amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[8px] border-amber-300 text-amber-700">REVIEW</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-semibold">Recent Activity</h3>
          <Button variant="ghost" size="sm" onClick={() => router.push('/transactions')} className="text-xs h-8 gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-2">
          {recentTxs?.map((tx) => (
            <Card key={tx.id} className="border-none bg-white shadow-sm overflow-hidden">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-primary">
                    <History className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold truncate max-w-[120px]">{tx.description || tx.category}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">${tx.amount.toFixed(2)}</p>
                  <p className="text-[8px] text-muted-foreground uppercase font-bold">{tx.category}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!recentTxs || recentTxs.length === 0) && !isTxsLoading && (
            <div className="text-center p-8 bg-white rounded-xl border-2 border-dashed border-muted text-xs text-muted-foreground">
              No transactions yet.
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-semibold">Budget Progress</h3>
          <Badge variant="outline" className="text-[10px] font-bold">MONTHLY</Badge>
        </div>
        <Card className="border-none bg-white shadow-sm overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase">Usage</span>
              <span className="text-sm font-bold">{Math.round(stsData.percentSpent)}%</span>
            </div>
            <Progress value={stsData.percentSpent} className={cn(
              "h-2 bg-secondary",
              stsData.percentSpent >= 100 ? "[&>div]:bg-red-500" : stsData.percentSpent >= 80 ? "[&>div]:bg-amber-500" : ""
            )} />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 rounded-xl bg-secondary/30">
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Spent</p>
                <p className="text-lg font-bold">${stsData.totalSpent?.toFixed(0)}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30">
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Budget</p>
                <p className="text-lg font-bold">${stsData.totalAllocated?.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <button 
          onClick={() => router.push('/log')}
          className="p-4 rounded-2xl bg-white shadow-sm border border-transparent hover:border-primary transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <Plus className="h-5 w-5" />
          </div>
          <p className="font-bold text-sm">Rapid Log</p>
          <p className="text-[10px] text-muted-foreground">Quick entry</p>
        </button>
        <button 
          onClick={() => router.push('/pre-spend')}
          className="p-4 rounded-2xl bg-white shadow-sm border border-transparent hover:border-accent transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="font-bold text-sm">Pre-Spend</p>
          <p className="text-[10px] text-muted-foreground">Decision check</p>
        </button>
      </div>

      {/* Approval Decision Modal */}
      <Dialog open={!!selectedApproval} onOpenChange={(open) => !open && setSelectedApproval(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Spending Request Review</DialogTitle>
            <DialogDescription>
              Submitted by {selectedApproval?.requesterName} on {selectedApproval && new Date(selectedApproval.requestedAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-secondary/30">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold">${selectedApproval.transactionData.amount.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/30">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Category</p>
                  <p className="text-lg font-bold">{selectedApproval.transactionData.category}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Justification</p>
                <p className="text-sm italic font-medium">"{selectedApproval.justification || 'No justification provided.'}"</p>
              </div>

              {isStaff ? (
                <div className="flex flex-col gap-2 pt-4">
                  <Button 
                    className="h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleDecision('Approved')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Approve Spending
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 rounded-xl font-bold border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => handleDecision('Denied')}
                    disabled={isProcessing}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Deny Request
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <p className="text-xs font-bold text-amber-900">Awaiting Decision</p>
                  <p className="text-[10px] text-amber-700">An Admin or Co-Manager needs to review this.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
