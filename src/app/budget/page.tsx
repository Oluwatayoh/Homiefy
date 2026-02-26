
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, Trash2, PieChart, Info, CheckCircle2, AlertTriangle, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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

  const [income, setIncome] = useState<string>('');
  const [envelopes, setEnvelopes] = useState(DEFAULT_ENVELOPES.map(e => ({ ...e, spent: 0 })));
  const [isUpdating, setIsUpdating] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'users', user.uid) : null;
  }, [user, db]);

  const { data: userData } = useDoc(userDocRef);

  const currentMonthId = new Date().toISOString().slice(0, 7); // YYYY-MM
  const budgetDocRef = useMemoFirebase(() => {
    return userData?.familyId ? doc(db, 'families', userData.familyId, 'budgets', currentMonthId) : null;
  }, [userData?.familyId, db, currentMonthId]);

  const { data: budgetData, isLoading: isBudgetLoading } = useDoc(budgetDocRef);

  useEffect(() => {
    if (budgetData) {
      setIncome(budgetData.totalIncome.toString());
      setEnvelopes(budgetData.envelopes || []);
    }
  }, [budgetData]);

  const totalAllocated = envelopes.reduce((sum, e) => sum + e.allocated, 0);
  const remainingIncome = parseFloat(income || '0') - totalAllocated;
  const isAdmin = userData?.role === 'Admin';

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
    if (!budgetDocRef || !isAdmin) return;
    if (remainingIncome < 0) {
      toast({ variant: "destructive", title: "Over Budget", description: "Allocations exceed monthly income." });
      return;
    }

    setIsUpdating(true);
    try {
      const data = {
        id: currentMonthId,
        totalIncome: parseFloat(income),
        envelopes: envelopes,
        status: 'Active',
        updatedAt: new Date().toISOString()
      };

      await setDoc(budgetDocRef, data, { merge: true });
      toast({ title: "Budget Saved", description: `Active budget for ${currentMonthId} updated.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed", description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isUserLoading || isBudgetLoading) {
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
      <header>
        <h1 className="text-2xl font-bold font-headline">{currentMonthId} Budget</h1>
        <p className="text-muted-foreground text-sm">Allocate resources for your household.</p>
      </header>

      {/* Income Section */}
      <Card className="border-none shadow-xl bg-primary text-white">
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
                disabled={!isAdmin}
                className="pl-8 h-12 text-xl font-bold rounded-xl bg-white/10 border-none text-white placeholder:text-white/50"
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div>
              <p className="text-[10px] font-bold uppercase text-white/70">Remaining to Allocate</p>
              <p className={cn("text-lg font-bold", remainingIncome < 0 ? "text-red-300" : "text-white")}>
                ${remainingIncome.toFixed(2)}
              </p>
            </div>
            {isAdmin && (
              <Button variant="secondary" size="sm" onClick={apply503020} className="rounded-lg font-bold gap-2">
                <Wand2 className="h-4 w-4" /> 50/30/20
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {remainingIncome < 0 && (
        <div className="p-3 rounded-lg bg-red-100 border border-red-200 flex items-center gap-2 text-red-600 text-xs font-bold animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          ALLOCATIONS EXCEED INCOME! REDUCE SPENDING.
        </div>
      )}

      {remainingIncome > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-center gap-2 text-amber-700 text-xs">
          <Info className="h-4 w-4" />
          You have ${remainingIncome.toFixed(2)} unallocated. Every dollar needs a home!
        </div>
      )}

      {/* Envelope Management */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold">Budget Envelopes</h3>
          <Badge variant="outline" className="text-[10px] font-bold">{envelopes.length} CATEGORIES</Badge>
        </div>

        <div className="space-y-3">
          {envelopes.map((env) => (
            <Card key={env.id} className="border-none shadow-sm overflow-hidden bg-white">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
                    <PieChart className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{env.name}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                      Spent: ${env.spent.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="w-24">
                  <Input 
                    type="number" 
                    value={env.allocated || ''} 
                    onChange={(e) => handleUpdateEnvelope(env.id, e.target.value)}
                    disabled={!isAdmin}
                    className="h-10 font-bold text-right pr-3 rounded-lg border-primary/10"
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {isAdmin && (
        <Button 
          className="w-full h-14 rounded-xl text-lg font-bold shadow-xl mt-4"
          onClick={handleSaveBudget}
          disabled={isUpdating || remainingIncome < 0}
        >
          {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
          Save Monthly Budget
        </Button>
      )}

      {!isAdmin && (
        <p className="text-center text-xs text-muted-foreground bg-secondary/30 p-4 rounded-xl">
          Only Admins can modify the family budget.
        </p>
      )}
    </div>
  );
}
