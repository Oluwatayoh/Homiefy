'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TrendingUp, CheckCircle2, MoreHorizontal, Wallet, Loader2, AlertCircle } from 'lucide-react';
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
    if (!budgetData) return { amount: 0, status: 'neutral', percentSpent: 0 };

    const totalAllocated = budgetData.envelopes?.reduce((sum: number, e: any) => sum + (e.allocated || 0), 0) || 0;
    const totalSpent = budgetData.envelopes?.reduce((sum: number, e: any) => sum + (e.spent || 0), 0) || 0;
    const remainingBudget = totalAllocated - totalSpent;

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysLeft = (daysInMonth - currentDay) + 1;

    const amount = Math.max(0, remainingBudget / daysLeft);
    const percentSpent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    let status = 'green';
    if (remainingBudget <= 0) status = 'red';
    else if (percentSpent > 80) status = 'yellow';

    return { amount, status, percentSpent, totalAllocated, totalSpent };
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
                <CheckCircle2 className="w-3 h-3" /> Budget is on track
              </p>
            )}
            {stsData.status === 'yellow' && (
              <p className="text-white/90 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Approaching budget limit
              </p>
            )}
            {stsData.status === 'red' && (
              <p className="text-white/90 text-xs flex items-center gap-1 font-bold">
                <AlertCircle className="w-3 h-3" /> OVER BUDGET
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Shared Budget Overview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Budget Health</h3>
          <Badge variant="outline" className="text-[10px] font-bold">LIVE STATUS</Badge>
        </div>
        <Card className="border-none bg-white shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Monthly Progress</span>
              <span className="text-sm font-bold">{Math.round(stsData.percentSpent)}% spent</span>
            </div>
            <Progress value={stsData.percentSpent} className="h-2 bg-secondary" />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Total Spent</p>
                <p className="text-lg font-bold">${stsData.totalSpent?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Remaining</p>
                <p className="text-lg font-bold">${(stsData.totalAllocated! - stsData.totalSpent!).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Insights */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Behavioral Insights</h3>
          <Badge variant="secondary" className="text-[10px]">AI COACH</Badge>
        </div>
        <Card className="border-none bg-white shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Stability is improving!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your daily variation is 12% lower than last month. Consistency builds wealth.
              </p>
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
          <p className="font-bold text-sm">Decision Intelligence</p>
          <p className="text-[10px] text-muted-foreground">Pre-spend check</p>
        </button>
      </div>
    </div>
  );
}
