'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Info, CheckCircle2, AlertTriangle, Wand2, ChevronLeft, ChevronRight, Calendar, PieChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const DEFAULT_ENVELOPES = [
  { id: 'housing', name: 'Housing', icon: 'Home', allocated: 0 },
  { id: 'utilities', name: 'Utilities', icon: 'Zap', allocated: 0 },
  { id: 'groceries', name: 'Groceries', icon: 'ShoppingBasket', allocated: 0 },
  { id: 'transport', name: 'Transportation', icon: 'Car', allocated: 0 },
  { id: 'dining', name: 'Dining Out', icon: 'Utensils', allocated: 0 },
  { id: 'entertainment', name: 'Entertainment', icon: 'Film', allocated: 0 },
  { id: 'healthcare', name: 'Healthcare', icon: 'Stethoscope', allocated: 0 },
  { id: 'personal', name: 'Personal Care', icon: 'User', allocated: 0 },
  { id: 'savings', name: 'Savings', icon: 'PiggyBank', allocated: 0 },
  { id: 'emergency', name: 'Emergency Fund', icon: 'ShieldAlert', allocated: 0 },
];

export default function BudgetManagement() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date());
  }, []);

  const monthId = useMemo(() => {
    if (!currentDate) return '';
    return currentDate.toISOString().slice(0, 7);
  }, [currentDate]);

  const isCurrentMonth = useMemo(() => {
    if (!mounted || !monthId) return false;
    return monthId === new Date().toISOString().slice(0, 7);
  }, [mounted, monthId]);

  const isFutureMonth = useMemo(() => {
    if (!mounted || !monthId) return false;
    return monthId > new Date().toISOString().slice(0, 7);
  }, [mounted, monthId]);

  const [income, setIncome] = useState<string>('');
  const [envelopes, setEnvelopes] = useState(DEFAULT_ENVELOPES.map(e => ({ ...e, spent: 0 })));
  const [isUpdating, setIsUpdating] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'userProfiles', user.uid) : null;
  }, [user, db]);

  const { data: userData } = useDoc(userDocRef);

  const familyDocRef = useMemoFirebase(() => {
    return userData?.familyId ? doc(db, 'families', userData.familyId) : null;
  }, [userData?.familyId, db]);

  const { data: familyData } = useDoc(familyDocRef);

  const budgetDocRef = useMemoFirebase(() => {
    return userData?.familyId && monthId ? doc(db, 'families', userData.familyId, 'budgets', monthId) : null;
  }, [userData?.familyId, db, monthId]);

  const { data: budgetData, isLoading: isBudgetLoading } = useDoc(budgetDocRef);

  useEffect(() => {
    if (budgetData) {
      setIncome(budgetData.totalIncome?.toString() || '');
      setEnvelopes(budgetData.envelopes || DEFAULT_ENVELOPES.map(e => ({ ...e, spent: 0 })));
    } else {
      setIncome('');
      setEnvelopes(DEFAULT_ENVELOPES.map(e => ({ ...e, spent: 0 })));
    }
  }, [budgetData]);

  const totalAllocated = envelopes.reduce((sum, e) => sum + (e.allocated || 0), 0);
  const totalSpent = envelopes.reduce((sum, e) => sum + (e.spent || 0), 0);
  const remainingIncome = parseFloat(income || '0') - totalAllocated;
  const isAdmin = userData?.role === 'Admin';

  const navigateMonth = (direction: number) => {
    if (!currentDate) return;
    const nextDate = new Date(currentDate);
    nextDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(nextDate);
  };

  const apply503020 = () => {
    const inc = parseFloat(income);
    if (isNaN(inc) || inc <= 0) {
      toast({ variant: "destructive", title: "Invalid Income", description: "Please enter a valid monthly income first." });
      return;
    }

    const needs = inc * 0.5;
    const wants = inc * 0.3;
    const savings = inc * 0.2;

    const updated = envelopes.map(e => {
      if (['housing', 'utilities', 'groceries', 'transport', 'healthcare'].includes(e.id)) {
        return { ...e, allocated: needs / 5 };
      }
      if (['dining', 'entertainment', 'personal'].includes(e.id)) {
        return { ...e, allocated: wants / 3 };
      }
      if (['savings', 'emergency'].includes(e.id)) {
        return { ...e, allocated: savings / 2 };
      }
      return e;
    });

    setEnvelopes(updated);
    toast({ title: "Rule Applied", description: "50/30/20 split applied to envelopes." });
  };

  const handleUpdateEnvelope = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    setEnvelopes(prev => prev.map(e => e.id === id ? { ...e, allocated: val } : e));
  };

  const handleSaveBudget = async () => {
    if (!budgetDocRef || !isAdmin || !familyData) return;
    if (remainingIncome < 0) {
      toast({ variant: "destructive", title: "Over Budget", description: "Allocations exceed monthly income." });
      return;
    }

    setIsUpdating(true);
    try {
      const data = {
        id: monthId,
        totalIncome: parseFloat(income),
        envelopes: envelopes,
        status: 'Active',
        members: familyData.members, // Denormalize membership for rules
        updatedAt: new Date().toISOString()
      };

      await setDoc(budgetDocRef, data, { merge: true });
      toast({ title: "Budget Saved", description: `Active budget for ${monthId} updated.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed", description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isUserLoading || isBudgetLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userData?.familyId) {
    return (
      <div className="p-6 text-center mt-20">
        <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold">No Family Found</h2>
        <p className="text-muted-foreground text-sm mt-2 mb-6">Join or create a family to manage budgets.</p>
        <Button onClick={() => router.push('/onboarding')}>Get Started</Button>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline">Budget Explorer</h1>
          <p className="text-muted-foreground text-sm">Managing family resources.</p>
        </div>
        <div className="flex items-center gap-1 bg-white border rounded-xl p-1 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} className="h-8 w-8 rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-2 text-xs font-bold flex items-center gap-1">
            <Calendar className="h-3 w-3 text-primary" />
            {monthId}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigateMonth(1)} 
            disabled={isCurrentMonth}
            className="h-8 w-8 rounded-lg"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {isFutureMonth ? (
        <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="font-bold">Future Budget Restricted</h2>
          <p className="text-sm text-muted-foreground">You cannot create or view budgets for future periods according to governance rules.</p>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Return to Present</Button>
        </div>
      ) : (
        <>
          <Card className="border-none shadow-xl bg-primary text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <PieChart className="w-32 h-32" />
            </div>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-white/70 tracking-widest">Monthly Net Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xl">$</span>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    disabled={!isAdmin || !isCurrentMonth}
                    className="pl-8 h-12 text-xl font-bold rounded-xl bg-white/10 border-none text-white placeholder:text-white/50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[10px] font-bold uppercase text-white/70">Total Spent</p>
                  <p className="text-lg font-bold">${totalSpent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-white/70">Remaining</p>
                  <p className={cn("text-lg font-bold", remainingIncome < 0 ? "text-red-300" : "text-white")}>
                    ${remainingIncome.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {isAdmin && isCurrentMonth && (
                <Button variant="secondary" size="sm" onClick={apply503020} className="w-full rounded-lg font-bold gap-2">
                  <Wand2 className="h-4 w-4" /> Suggest 50/30/20 Split
                </Button>
              )}
            </CardContent>
          </Card>

          {isCurrentMonth && remainingIncome < 0 && (
            <div className="p-3 rounded-lg bg-red-100 border border-red-200 flex items-center gap-2 text-red-600 text-xs font-bold animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              ALLOCATIONS EXCEED INCOME!
            </div>
          )}

          {isCurrentMonth && remainingIncome > 0 && parseFloat(income) > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-700 text-xs font-bold">
              <Info className="h-4 w-4" />
              UNALLOCATED FUNDS: ${remainingIncome.toFixed(2)}
            </div>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-semibold">Categories</h3>
              <Badge variant="outline" className="text-[10px] font-bold">{envelopes.length} ACTIVE</Badge>
            </div>

            <div className="space-y-3">
              {envelopes.map((env) => {
                const percent = env.allocated > 0 ? (env.spent / env.allocated) * 100 : 0;
                const isWarning = percent >= 80 && percent < 100;
                const isOver = percent >= 100;
                
                return (
                  <Card key={env.id} className="border-none shadow-sm overflow-hidden bg-white group">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            isOver ? "bg-red-100 text-red-600" : isWarning ? "bg-amber-100 text-amber-600" : "bg-secondary text-primary"
                          )}>
                            <PieChart className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">{env.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                ${env.spent.toFixed(0)} spent
                              </span>
                              <span className="text-[10px] text-muted-foreground/30">•</span>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                ${(env.allocated - env.spent).toFixed(0)} left
                              </span>
                            </div>
                          </div>
                        </div>
                        {isAdmin && isCurrentMonth ? (
                          <div className="w-24">
                            <Input 
                              type="number" 
                              value={env.allocated || ''} 
                              onChange={(e) => handleUpdateEnvelope(env.id, e.target.value)}
                              className="h-10 font-bold text-right pr-3 rounded-lg border-primary/10"
                              placeholder="0"
                            />
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="text-sm font-bold">${env.allocated.toFixed(0)}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Budget</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                          <span>{percent.toFixed(0)}%</span>
                          {isOver && <span className="text-red-500">Alert: Over Budget</span>}
                          {isWarning && <span className="text-amber-500">Approaching Limit</span>}
                        </div>
                        <Progress 
                          value={Math.min(percent, 100)} 
                          className={cn(
                            "h-1.5 bg-secondary",
                            isOver ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-amber-500" : ""
                          )} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {isAdmin && isCurrentMonth && (
            <Button 
              className="w-full h-14 rounded-xl text-lg font-bold shadow-xl mt-4"
              onClick={handleSaveBudget}
              disabled={isUpdating || remainingIncome < 0 || parseFloat(income) <= 0}
            >
              {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
              Update Budget
            </Button>
          )}

          {!isCurrentMonth && mounted && !isFutureMonth && (
            <div className="p-4 rounded-xl bg-secondary/30 flex items-center gap-3 text-sm text-muted-foreground">
              <Info className="h-5 w-5 text-primary" />
              You are viewing a historical budget. It cannot be modified.
            </div>
          )}
        </>
      )}
    </div>
  );
}