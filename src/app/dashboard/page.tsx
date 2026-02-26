'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { FAMILY_DATA, RECENT_TRANSACTIONS } from '@/app/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TrendingUp, AlertCircle, CheckCircle2, MoreHorizontal, Wallet, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'users', user.uid) : null;
  }, [user, db]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    } else if (!isUserDataLoading && userData && !userData.familyId) {
      router.push('/onboarding');
    }
  }, [user, isUserLoading, userData, isUserDataLoading, router]);

  if (isUserLoading || isUserDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fallback to mock data for now while integrating real data
  const { name, safeToSpendDaily, healthScores, members, goals } = FAMILY_DATA;

  return (
    <div className="flex flex-col gap-6 p-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-headline">{userData?.familyId ? "My Household" : name}</h1>
          <p className="text-muted-foreground text-sm">Family Dashboard</p>
        </div>
        <div className="flex -space-x-2">
          {members.map(m => (
            <Avatar key={m.id} className="border-2 border-background w-8 h-8">
              <AvatarFallback className="text-[10px] bg-secondary text-primary font-bold">{m.avatar}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </header>

      {/* Safe to Spend Hero */}
      <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>
        <CardContent className="pt-8">
          <p className="text-primary-foreground/80 text-sm font-medium">Safe to spend today</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h2 className="text-5xl font-bold tracking-tight">${safeToSpendDaily.toFixed(2)}</h2>
          </div>
          <p className="text-primary-foreground/70 text-xs mt-4 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> All goals on track
          </p>
        </CardContent>
      </Card>

      {/* Financial Health Scores */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Financial Health</h3>
          <Badge variant="outline" className="text-[10px] font-bold">LIVE SCORE</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none bg-white shadow-sm">
            <CardContent className="p-4">
              <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Adherence</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-primary">{healthScores.adherence}%</span>
                <TrendingUp className="text-green-500 w-4 h-4 mb-1" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none bg-white shadow-sm">
            <CardContent className="p-4">
              <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Savings Rate</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-primary">{healthScores.savingsRate}%</span>
                <TrendingUp className="text-green-500 w-4 h-4 mb-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Shared Goals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Shared Goals</h3>
          <button className="text-xs text-primary font-bold">View All</button>
        </div>
        <div className="space-y-4">
          {goals.map(goal => (
            <Card key={goal.name} className="border-none bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-sm">{goal.name}</h4>
                    <p className="text-xs text-muted-foreground">${goal.currentAmount} of ${goal.targetAmount}</p>
                  </div>
                  <Badge className="bg-secondary text-primary border-none text-[10px]">
                    {Math.round((goal.currentAmount / goal.targetAmount) * 100)}%
                  </Badge>
                </div>
                <Progress value={(goal.currentAmount / goal.targetAmount) * 100} className="h-2 bg-secondary" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Recent Activity</h3>
          <MoreHorizontal className="text-muted-foreground w-5 h-5" />
        </div>
        <div className="space-y-3">
          {RECENT_TRANSACTIONS.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                  <span className="font-bold text-xs">{tx.member[0]}</span>
                </div>
                <div>
                  <p className="font-medium text-sm">{tx.description}</p>
                  <p className="text-[10px] text-muted-foreground">{tx.category} • {tx.member}</p>
                </div>
              </div>
              <p className="font-bold text-sm">-${tx.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
