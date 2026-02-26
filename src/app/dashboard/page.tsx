
'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TrendingUp, CheckCircle2, MoreHorizontal, Wallet, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'users', user.uid) : null;
  }, [user, db]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const currentMonthId = useMemo(() => new Date().toISOString().slice(0, 7), []);
  
  const budgetDocRef = useMemoFirebase(() => {
    return userData?.familyId ? doc(db, 'families', userData.familyId, 'budgets', currentMonthId) : null;
  }, [userData?.familyId, db, currentMonthId]);

  const { data: budgetData, isLoading: isBudgetLoading } = useDoc(budgetDocRef);

  // Safe to Spend Calculation Logic (FR3.4)
  const stsData = useMemo(() => {
    if (!budgetData) return { amount: 0, status: 'neutral', percentSpent: 0, alerts: [] };

    const totalAllocated = budgetData.envelopes?.reduce((sum: number, e: any) => sum + (e.allocated || 0), 0) || 0;
    const totalSpent = budgetData.envelopes?.reduce((sum: number, e: any) => sum + (e.spent || 0), 0) || 0;
    const remainingBudget = totalAllocated - totalSpent;

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysLeft = (daysInMonth - currentDay) + 1;

    const amount = Math.max(0, remainingBudget / daysLeft);
    const percentSpent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    // Threshold Alerts (FR3.5)
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
  }, [budgetData]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    } else if (!isUserDataLoading && userData && !userData.familyId) {
      router.push('/onboarding');
    }
  }, [user, isUserLoading, userData, isUserDataLoading, router]);

  if (isUserLoading || isUserDataLoading || isBudgetLoading) {
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

      {/* Safe to Spend Hero (FR3.4) */}
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

      {/* Budget Alerts (FR3.5) */}
      {stsData.alerts.length > 0 && (
        <section className="animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-2 px-1">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget Alerts</h3>
          </div>
          <div className="space-y-2">
            {stsData.alerts.map((alert, i) => (
              <Card key={i} className="border-none bg-amber-50 shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{alert.name}</p>
                      <p className="text-[10px] text-amber-700 font-bold uppercase">{alert.percent}% Spent</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/budget')} className="h-8 text-amber-700 hover:bg-amber-100">
                    Adjust
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Shared Budget Overview (FR3.6) */}
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

      {/* Navigation Shortcuts */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <button 
          onClick={() => router.push('/log')}
          className="p-4 rounded-2xl bg-white shadow-sm border border-transparent hover:border-primary transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <MoreHorizontal className="h-5 w-5" />
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
    </div>
  );
}
