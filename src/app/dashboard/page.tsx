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
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  TrendingUp, CheckCircle2, Wallet, Loader2, AlertCircle, 
  AlertTriangle, ArrowRight, History, Plus, ShieldCheck, XCircle, 
  BrainCircuit, PieChart, Target, Sparkles, Activity, PlusCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart as RePieChart, Cell, ResponsiveContainer } from 'recharts';
import { getCurrencySymbol } from '@/lib/currency';

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'userProfiles', user.uid) : null;
  }, [user, db]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const familyDocRef = useMemoFirebase(() => {
    return userData?.familyId ? doc(db, 'families', userData.familyId) : null;
  }, [userData?.familyId, db]);

  const { data: familyData } = useDoc(familyDocRef);

  const currencyCode = userData?.preferences?.currency || familyData?.currencyCode || 'NGN';
  const currencySymbol = getCurrencySymbol(currencyCode);

  const currentMonthId = useMemo(() => {
    if (!mounted) return '';
    return new Date().toISOString().slice(0, 7);
  }, [mounted]);
  
  const budgetDocRef = useMemoFirebase(() => {
    return userData?.familyId && currentMonthId ? doc(db, 'families', userData.familyId, 'budgets', currentMonthId) : null;
  }, [userData?.familyId, db, currentMonthId]);

  const { data: budgetData, isLoading: isBudgetLoading } = useDoc(budgetDocRef);

  const isStaff = userData?.role === 'Admin' || userData?.role === 'Co-Manager';

  const txQuery = useMemoFirebase(() => {
    if (isUserDataLoading || !userData?.familyId || !user?.uid) return null;
    return query(
      collection(db, 'families', userData.familyId, 'transactions'),
      where(`members.${user.uid}`, '!=', null),
      orderBy('date', 'desc'),
      limit(5)
    );
  }, [userData?.familyId, user?.uid, isUserDataLoading, db]);

  const { data: recentTxs, isLoading: isTxsLoading } = useCollection(txQuery);

  const goalsQuery = useMemoFirebase(() => {
    if (isUserDataLoading || !userData?.familyId || !user?.uid) return null;
    return query(
      collection(db, 'families', userData.familyId, 'goals'),
      where(`members.${user.uid}`, '!=', null),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
  }, [userData?.familyId, user?.uid, isUserDataLoading, db]);

  const { data: goalsData, isLoading: isGoalsLoading } = useCollection(goalsQuery);

  const decisionsQuery = useMemoFirebase(() => {
    if (isUserDataLoading || !userData?.familyId || !user?.uid) return null;
    return query(
      collection(db, 'families', userData.familyId, 'decisions'),
      where(`members.${user.uid}`, '!=', null),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
  }, [userData?.familyId, user?.uid, isUserDataLoading, db]);

  const { data: recentDecisions } = useCollection(decisionsQuery);

  const approvalsQuery = useMemoFirebase(() => {
    if (isUserDataLoading || !userData?.familyId || !user?.uid) return null;
    return query(
      collection(db, 'families', userData.familyId, 'approvals'),
      where(`members.${user.uid}`, '!=', null),
      where('status', '==', 'Pending'),
      orderBy('requestedAt', 'desc')
    );
  }, [userData?.familyId, user?.uid, isUserDataLoading, db]);

  const { data: pendingApprovals, isLoading: isApprovalsLoading } = useCollection(approvalsQuery);

  const filteredApprovals = useMemo(() => {
    if (!pendingApprovals || !user) return [];
    if (isStaff) return pendingApprovals;
    return pendingApprovals.filter(a => a.requesterId === user.uid);
  }, [pendingApprovals, isStaff, user]);

  const stsData = useMemo(() => {
    if (!budgetData || !mounted) return { 
      amount: 0, 
      status: 'neutral', 
      percentSpent: 0, 
      alerts: [], 
      totalAllocated: 0, 
      totalSpent: 0,
      pieData: [],
      totalHealthScore: 0,
      breakdown: { adherenceScore: 0, savingsScore: 0, goalScore: 0, impulseScore: 0 }
    };

    const totalAllocated = budgetData.totalIncome || 0;
    const totalSpent = budgetData.envelopes?.reduce((sum: number, e: any) => sum + (e.spent || 0), 0) || 0;
    const remainingBudget = totalAllocated - totalSpent;

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysLeft = (daysInMonth - currentDay) + 1;

    const amount = Math.max(0, remainingBudget / daysLeft);
    const percentSpent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    const pieData = (budgetData.envelopes || [])
      .filter((e: any) => e.spent > 0)
      .map((e: any, i: number) => ({
        name: e.name,
        value: e.spent,
        fill: `hsl(var(--chart-${(i % 5) + 1}))`
      }));

    let status = 'green';
    if (remainingBudget <= 0) status = 'red';
    else if (percentSpent > 80) status = 'yellow';

    const adherenceScore = Math.max(0, 40 * (1 - (totalSpent > totalAllocated ? (totalSpent - totalAllocated) / totalAllocated : 0)));
    const spendingRatio = budgetData.totalIncome > 0 ? totalSpent / budgetData.totalIncome : 1;
    const savingsScore = Math.max(0, 30 * (1 - spendingRatio));
    const goalScore = goalsData?.length 
      ? (goalsData.reduce((sum, g) => sum + (g.currentAmount / (g.targetAmount || 1)), 0) / goalsData.length) * 20
      : 0;
    const impulseRatio = recentDecisions?.length 
      ? recentDecisions.filter(d => d.userAction === 'proceeded' && d.aiAnalysis?.regretScore > 50).length / recentDecisions.length
      : 0;
    const impulseScore = 10 * (1 - impulseRatio);

    const totalHealthScore = Math.round(adherenceScore + savingsScore + goalScore + impulseScore);

    return { 
      amount, 
      status, 
      percentSpent, 
      totalAllocated, 
      totalSpent, 
      pieData,
      totalHealthScore,
      breakdown: { adherenceScore, savingsScore, goalScore, impulseScore }
    };
  }, [budgetData, mounted, goalsData, recentDecisions]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    } else if (!isUserDataLoading && userData && !userData.familyId) {
      router.push('/onboarding');
    }
  }, [user, isUserLoading, userData, isUserDataLoading, router]);

  const handleDecision = async (status: 'Approved' | 'Denied') => {
    if (!selectedApproval || !userData?.familyId || !user || !familyData) return;
    
    if (selectedApproval.requesterId === user.uid) {
      toast({ variant: "destructive", title: "Rule Violation", description: "You cannot approve your own spending request." });
      return;
    }

    setIsProcessing(true);
    try {
      const approvalRef = doc(db, 'families', userData.familyId, 'approvals', selectedApproval.id);
      
      await updateDoc(approvalRef, {
        status,
        approverId: user.uid,
        resolvedAt: new Date().toISOString()
      });

      if (status === 'Approved') {
        const txRef = doc(collection(db, 'families', userData.familyId, 'transactions'));
        const txData = {
          ...selectedApproval.transactionData,
          id: txRef.id,
          familyId: userData.familyId,
          userId: selectedApproval.requesterId,
          userName: selectedApproval.requesterName,
          members: familyData.members,
          createdAt: new Date().toISOString()
        };
        await setDoc(txRef, txData);

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

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-headline">{userData?.familyId ? "My Household" : "Welcome"}</h1>
          <p className="text-muted-foreground text-sm">Family Dashboard</p>
        </div>
        <div className="flex -space-x-2">
          {isUserDataLoading ? (
            <Skeleton className="w-8 h-8 rounded-full" />
          ) : (
            <Avatar className="border-2 border-background w-8 h-8 cursor-pointer" onClick={() => router.push('/profile')}>
              <AvatarFallback className="text-[10px] bg-secondary text-primary font-bold">
                {userData?.firstName?.[0] || user?.displayName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </header>

      {/* Safe to Spend Widget */}
      {isBudgetLoading ? (
        <Skeleton className="h-[180px] w-full rounded-2xl" />
      ) : (
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
              <h2 className="text-5xl font-bold tracking-tight">{currencySymbol}{stsData.amount.toFixed(2)}</h2>
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
      )}

      {/* Health Score Gauge */}
      {isBudgetLoading || isGoalsLoading ? (
        <Skeleton className="h-[96px] w-full rounded-xl" />
      ) : (
        <Card className="border-none shadow-sm bg-white overflow-hidden cursor-pointer hover:bg-secondary/5 transition-colors" onClick={() => setShowScoreBreakdown(true)}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={[
                        { value: stsData.totalHealthScore },
                        { value: 100 - stsData.totalHealthScore }
                      ]}
                      innerRadius={24}
                      outerRadius={30}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--secondary))" />
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
                <span className="absolute font-bold text-xs">{stsData.totalHealthScore}</span>
              </div>
              <div>
                <h3 className="text-sm font-bold">Budget Health Score</h3>
                <p className="text-[10px] text-muted-foreground">Tap to see behavioral breakdown</p>
              </div>
            </div>
            <Sparkles className="h-5 w-5 text-accent animate-pulse" />
          </CardContent>
        </Card>
      )}

      {/* Spending Visualization */}
      {isBudgetLoading ? (
        <Skeleton className="h-[240px] w-full rounded-xl" />
      ) : stsData.pieData.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Spending Mix
            </h3>
          </div>
          <Card className="border-none bg-white shadow-sm p-4 h-[240px] flex items-center justify-center">
             <ChartContainer 
              config={Object.fromEntries(stsData.pieData.map(d => [d.name, { label: d.name, color: d.fill }]))}
              className="w-full h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={stsData.pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                  >
                    {stsData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                </RePieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>
        </section>
      ) : null}

      {/* Pending Approvals */}
      {isApprovalsLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : filteredApprovals.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> 
              {isStaff ? "Needs Approval" : "Your Requests"}
            </h3>
            <Badge className="bg-primary text-[10px] font-bold">{filteredApprovals.length} PENDING</Badge>
          </div>
          <div className="space-y-2">
            {filteredApprovals.map((req) => (
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
                      <p className="text-xs font-bold">{req.transactionData?.description || req.transactionData?.category}</p>
                      <p className="text-[10px] text-muted-foreground">{req.requesterName} • {currencySymbol}{req.transactionData?.amount?.toFixed(2)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[8px] border-amber-300 text-amber-700">REVIEW</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Goal Progress */}
      {isGoalsLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Active Goals
            </h3>
            <Button variant="ghost" size="sm" onClick={() => router.push('/goals')} className="text-xs h-8">View All</Button>
          </div>
          {goalsData && goalsData.length > 0 ? (
            <div className="space-y-3">
              {goalsData.map((goal) => {
                const percent = Math.min(100, (goal.currentAmount / (goal.targetAmount || 1)) * 100);
                return (
                  <Card key={goal.id} className="border-none bg-white shadow-sm p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold">{goal.name}</span>
                      <span className="text-[10px] font-bold text-primary">{Math.round(percent)}%</span>
                    </div>
                    <Progress value={percent} className="h-1.5" />
                    <p className="text-[8px] text-muted-foreground text-right">Target: {currencySymbol}{goal.targetAmount.toLocaleString()}</p>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-2 bg-secondary/10 p-6 flex flex-col items-center justify-center text-center gap-2 rounded-2xl">
              <Target className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">No active goals found.</p>
              <Button size="sm" variant="outline" onClick={() => router.push('/goals')} className="text-[10px] font-bold h-7 gap-1">
                <Plus className="h-3 w-3" /> Start A Goal
              </Button>
            </Card>
          )}
        </section>
      )}

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-semibold">Recent Activity</h3>
          <Button variant="ghost" size="sm" onClick={() => router.push('/transactions')} className="text-xs h-8 gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        {isTxsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : recentTxs && recentTxs.length > 0 ? (
          <div className="space-y-2">
            {recentTxs.map((tx) => (
              <Card key={tx.id} className="border-none bg-white shadow-sm overflow-hidden" onClick={() => router.push(`/transactions`)}>
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
                    <p className="text-xs font-bold text-primary">{currencySymbol}{tx.amount.toFixed(2)}</p>
                    <p className="text-[8px] text-muted-foreground uppercase font-bold">{tx.category}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-secondary/10 p-6 flex flex-col items-center justify-center text-center gap-2 rounded-2xl">
            <History className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">No recent transactions.</p>
            <Button size="sm" variant="outline" onClick={() => router.push('/log')} className="text-[10px] font-bold h-7 gap-1">
              <PlusCircle className="h-3 w-3" /> Add Your First
            </Button>
          </Card>
        )}
      </section>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <button 
          onClick={() => router.push('/log')}
          className="p-4 rounded-2xl bg-white shadow-sm border border-transparent hover:border-primary transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Plus className="h-6 w-6" />
          </div>
          <p className="font-bold text-sm">Rapid Log</p>
          <p className="text-[10px] text-muted-foreground">Quick entry</p>
        </button>
        <button 
          onClick={() => router.push('/pre-spend')}
          className="p-4 rounded-2xl bg-white shadow-sm border border-transparent hover:border-accent transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="font-bold text-sm">Pre-Spend</p>
          <p className="text-[10px] text-muted-foreground">AI Intel</p>
        </button>
      </div>

      {/* Health Score Breakdown Modal */}
      <Dialog open={showScoreBreakdown} onOpenChange={setShowScoreBreakdown}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Behavioral Breakdown
            </DialogTitle>
            <DialogDescription>
              Your score is a weighted average of your family's financial habits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="text-center pb-4">
              <p className="text-5xl font-bold text-primary">{stsData.totalHealthScore}</p>
              <p className="text-xs font-bold uppercase text-muted-foreground mt-2">Overall Score</p>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Budget Adherence', score: stsData.breakdown.adherenceScore, max: 40, desc: 'How well you stay within envelopes.' },
                { label: 'Savings Rate', score: stsData.breakdown.savingsScore, max: 30, desc: 'Unspent income from this month.' },
                { label: 'Goal Progress', score: stsData.breakdown.goalScore, max: 20, desc: 'Contributions to family savings goals.' },
                { label: 'Impulse Control', score: stsData.breakdown.impulseScore, max: 10, desc: 'Actions taken after AI pre-spend analysis.' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">{Math.round(item.score)}/{item.max}</span>
                  </div>
                  <Progress value={(item.score / (item.max || 1)) * 100} className="h-1.5" />
                  <p className="text-[9px] text-muted-foreground italic">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-bold text-primary flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Coaching Tip
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {stsData.totalHealthScore > 80 
                  ? "Outstanding! Your family is demonstrating elite financial discipline." 
                  : "Try checking 'Decision Intel' before discretionary spending to boost your Impulse Control score."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <p className="text-xl font-bold">{currencySymbol}{selectedApproval.transactionData?.amount?.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/30">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Category</p>
                  <p className="text-lg font-bold">{selectedApproval.transactionData?.category}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Justification</p>
                <p className="text-sm italic font-medium">"{selectedApproval.justification || 'No justification provided.'}"</p>
              </div>

              {isStaff ? (
                <div className="flex flex-col gap-2 pt-4">
                  {selectedApproval.requesterId === user?.uid ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                      <p className="text-xs font-bold text-amber-900">Self-Review Restricted</p>
                      <p className="text-[10px] text-amber-700">You cannot approve your own request. Another lead must review this.</p>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
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
