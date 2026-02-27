'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, setDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Loader2, CheckCircle2, AlertTriangle, 
  ChevronLeft, ChevronRight, Calendar, PieChart, Plus, 
  Settings2, Home, Zap, ShoppingBasket, Car, Utensils, 
  Film, Stethoscope, User, PiggyBank, ShieldAlert, Heart, Gift, Briefcase, Globe, RefreshCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currency';

const PRESET_CATEGORIES = [
  { id: 'housing', name: 'Housing', icon: 'Home' },
  { id: 'utilities', name: 'Utilities', icon: 'Zap' },
  { id: 'groceries', name: 'Groceries', icon: 'ShoppingBasket' },
  { id: 'transport', name: 'Transportation', icon: 'Car' },
  { id: 'dining', name: 'Dining Out', icon: 'Utensils' },
  { id: 'entertainment', name: 'Entertainment', icon: 'Film' },
  { id: 'healthcare', name: 'Healthcare', icon: 'Stethoscope' },
  { id: 'personal', name: 'Personal Care', icon: 'User' },
  { id: 'savings', name: 'Savings', icon: 'PiggyBank' },
  { id: 'emergency', name: 'Emergency Fund', icon: 'ShieldAlert' },
  { id: 'education', name: 'Education', icon: 'Briefcase' },
  { id: 'charity', name: 'Charity', icon: 'Heart' },
  { id: 'gifts', name: 'Gifts', icon: 'Gift' },
  { id: 'travel', name: 'Travel', icon: 'Globe' },
];

const ICON_MAP: Record<string, any> = {
  Home, Zap, ShoppingBasket, Car, Utensils, Film, Stethoscope, User, PiggyBank, ShieldAlert, Heart, Gift, Briefcase, Globe, PieChart
};

export default function BudgetManagement() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRollingOver, setIsRollingOver] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date());
  }, []);

  const monthId = useMemo(() => {
    if (!currentDate) return '';
    return currentDate.toISOString().slice(0, 7);
  }, [currentDate]);

  const formattedMonth = useMemo(() => {
    if (!currentDate) return '';
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const prevMonthId = useMemo(() => {
    if (!currentDate) return '';
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  }, [currentDate]);

  const formattedPrevMonth = useMemo(() => {
    if (!currentDate) return '';
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const isCurrentMonth = useMemo(() => {
    if (!mounted || !monthId) return false;
    return monthId === new Date().toISOString().slice(0, 7);
  }, [mounted, monthId]);

  const isFutureMonth = useMemo(() => {
    if (!mounted || !monthId) return false;
    return monthId > new Date().toISOString().slice(0, 7);
  }, [mounted, monthId]);

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

  const [income, setIncome] = useState<string>('');
  const [envelopes, setEnvelopes] = useState<any[]>([]);

  useEffect(() => {
    if (budgetData) {
      setIncome(budgetData.totalIncome?.toString() || '');
      setEnvelopes(budgetData.envelopes || []);
    } else {
      setIncome('');
      setEnvelopes([]);
    }
  }, [budgetData]);

  const currencyCode = userData?.preferences?.currency || familyData?.currencyCode || 'NGN';
  const currencySymbol = getCurrencySymbol(currencyCode);

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
        totalIncome: parseFloat(income) || 0,
        envelopes: envelopes,
        status: 'Active',
        members: familyData.members,
        updatedAt: new Date().toISOString()
      };

      await setDoc(budgetDocRef, data, { merge: true });
      toast({ title: "Budget Saved", description: `Active budget for ${formattedMonth} updated.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed", description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRollover = async () => {
    if (!userData?.familyId || !isAdmin) return;
    setIsRollingOver(true);
    try {
      const prevBudgetRef = doc(db, 'families', userData.familyId, 'budgets', prevMonthId);
      const prevSnap = await getDoc(prevBudgetRef);
      
      if (!prevSnap.exists()) {
        toast({ variant: "destructive", title: "No Data", description: `No budget found for ${formattedPrevMonth} to rollover.` });
        return;
      }

      const prevData = prevSnap.data();
      setIncome(prevData.totalIncome?.toString() || '');
      const newEnvelopes = (prevData.envelopes || []).map((e: any) => ({
        ...e,
        spent: 0
      }));
      setEnvelopes(newEnvelopes);
      
      toast({ title: "Rollover Successful", description: `Imported setup from ${formattedPrevMonth}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Rollover Failed", description: e.message });
    } finally {
      setIsRollingOver(false);
    }
  };

  const toggleCategory = (cat: any) => {
    const exists = envelopes.find(e => e.id === cat.id);
    if (exists) {
      setEnvelopes(prev => prev.filter(e => e.id !== cat.id));
    } else {
      setEnvelopes(prev => [...prev, { ...cat, allocated: 0, spent: 0 }]);
    }
  };

  const addCustomCategoryToFamily = async () => {
    if (!familyDocRef || !isAdmin || !customCategoryName.trim()) return;
    
    setIsUpdating(true);
    try {
      const newCat = {
        id: `custom_${Date.now()}`,
        name: customCategoryName.trim(),
        icon: 'PieChart',
        isCustom: true
      };
      
      await updateDoc(familyDocRef, {
        customCategories: arrayUnion(newCat)
      });
      
      setCustomCategoryName('');
      toast({ title: "Category Created", description: `"${newCat.name}" is now available for your family.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to add", description: e.message });
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
        <div className="flex items-center gap-2">
          {isAdmin && isCurrentMonth && envelopes.length === 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRollover} 
              disabled={isRollingOver}
              className="rounded-xl gap-2 text-[10px] font-bold h-9"
            >
              {isRollingOver ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
              Rollover
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setShowManageCategories(true)} 
            className="rounded-xl h-9 w-9"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 bg-card border rounded-xl p-1 shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} className="h-7 w-7 rounded-lg">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-2 text-[10px] font-bold flex items-center gap-1 min-w-[100px] justify-center">
              <Calendar className="h-3 w-3 text-primary" />
              {formattedMonth}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigateMonth(1)} 
              disabled={isCurrentMonth}
              className="h-7 w-7 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {isFutureMonth ? (
        <div className="p-8 text-center bg-card rounded-2xl border shadow-sm space-y-4">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="font-bold">Future Budget Restricted</h2>
          <p className="text-sm text-muted-foreground">You cannot view or edit budgets for future months.</p>
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xl">{currencySymbol}</span>
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
                  <p className="text-lg font-bold">{currencySymbol}{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-white/70">Remaining</p>
                  <p className={cn("text-lg font-bold", remainingIncome < 0 ? "text-red-300" : "text-white")}>
                    {currencySymbol}{remainingIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isCurrentMonth && remainingIncome < 0 && (
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              ALLOCATIONS EXCEED INCOME!
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
                const Icon = ICON_MAP[env.icon] || PieChart;
                
                return (
                  <Card key={env.id} className="border-none shadow-sm overflow-hidden group">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            isOver ? "bg-red-100 dark:bg-red-900/40 text-red-600" : isWarning ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600" : "bg-secondary text-primary"
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold flex items-center gap-2">
                              {env.name}
                              {env.isCustom && <Badge variant="secondary" className="h-4 text-[8px] px-1 font-bold">CUSTOM</Badge>}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                {currencySymbol}{env.spent.toLocaleString()} spent
                              </span>
                              <span className="text-[10px] text-muted-foreground/30">•</span>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                {currencySymbol}{(env.allocated - env.spent).toLocaleString()} left
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
                            <p className="text-sm font-bold">{currencySymbol}{env.allocated.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Budget</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
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
              
              {envelopes.length === 0 && (
                <div className="p-12 text-center bg-secondary/10 border-dashed border-2 rounded-2xl">
                  <PieChart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">No active categories for {formattedMonth}.</p>
                  {isAdmin && (
                    <div className="flex flex-col gap-2 mt-4">
                       <Button variant="link" onClick={() => setShowManageCategories(true)} className="text-primary font-bold">Manage Categories</Button>
                       <Button variant="outline" size="sm" onClick={handleRollover} disabled={isRollingOver} className="rounded-xl mx-auto">Rollover from {formattedPrevMonth}</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {isAdmin && isCurrentMonth && (
            <Button 
              className="w-full h-14 rounded-xl text-lg font-bold shadow-xl mt-4"
              onClick={handleSaveBudget}
              disabled={isUpdating || remainingIncome < 0}
            >
              {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
              Save Budget Plan
            </Button>
          )}
        </>
      )}

      {/* Manage Categories Dialog */}
      <Dialog open={showManageCategories} onOpenChange={setShowManageCategories}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle>Budget Envelopes</DialogTitle>
            <DialogDescription>Select active categories for {formattedMonth}.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">Presets</h4>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_CATEGORIES.map(cat => {
                  const isEnabled = !!envelopes.find(e => e.id === cat.id);
                  const Icon = ICON_MAP[cat.icon];
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat)}
                      disabled={!isAdmin}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        isEnabled ? "border-primary bg-primary/5" : "border-transparent bg-secondary/20"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", isEnabled ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={cn("text-xs font-bold", isEnabled ? "text-primary" : "text-muted-foreground")}>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">Family Custom Categories</h4>
              <div className="space-y-2">
                {familyData?.customCategories?.map((cat: any) => {
                  const isEnabled = !!envelopes.find(e => e.id === cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat)}
                      disabled={!isAdmin}
                      className={cn(
                        "flex w-full items-center justify-between p-3 rounded-xl border-2 transition-all",
                        isEnabled ? "border-primary bg-primary/5" : "border-secondary bg-secondary/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <PieChart className={cn("h-4 w-4", isEnabled ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-sm font-bold", isEnabled ? "text-primary" : "text-muted-foreground")}>{cat.name}</span>
                      </div>
                      {isEnabled && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
                
                {isAdmin && (
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Create New Custom Category</p>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="e.g. Pet Care, Hobbies" 
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        className="rounded-xl h-10 text-xs"
                      />
                      <Button 
                        size="icon" 
                        onClick={addCustomCategoryToFamily} 
                        disabled={isUpdating || !customCategoryName.trim()}
                        className="rounded-xl shrink-0 h-10 w-10"
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button className="w-full rounded-xl" onClick={() => setShowManageCategories(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
