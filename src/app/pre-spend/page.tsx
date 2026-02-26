'use client';

import { useState, useMemo, useEffect } from 'react';
import { purchaseImpactAnalysis, type PurchaseImpactAnalysisOutput } from '@/ai/flows/purchase-impact-analysis-flow';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, setDoc, query, where } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, ArrowRightCircle, Target, Sparkles, Brain, Clock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { getCurrencySymbol } from '@/lib/currency';

export default function PreSpendTool() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [purchaseName, setPurchaseName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'Need' | 'Want' | 'Luxury'>('Want');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PurchaseImpactAnalysisOutput | null>(null);
  const [decisionId, setDecisionId] = useState<string | null>(null);

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'userProfiles', user.uid) : null;
  }, [user, db]);

  const { data: userData } = useDoc(userDocRef);

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

  const { data: budgetData } = useDoc(budgetDocRef);

  const goalsQuery = useMemoFirebase(() => {
    if (!userData?.familyId || !user?.uid) return null;
    return query(
      collection(db, 'families', userData.familyId, 'goals'),
      where(`members.${user.uid}`, '!=', null)
    );
  }, [userData?.familyId, user?.uid, db]);

  const { data: goalsData } = useCollection(goalsQuery);

  const stsData = useMemo(() => {
    if (!budgetData || !mounted) return { amount: 0 };
    const totalAllocated = budgetData.totalIncome || 0;
    const totalSpent = budgetData.envelopes?.reduce((sum: number, e: any) => sum + (e.spent || 0), 0) || 0;
    const remainingBudget = totalAllocated - totalSpent;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = (daysInMonth - now.getDate()) + 1;
    return { amount: Math.max(0, remainingBudget / daysLeft) };
  }, [budgetData, mounted]);

  async function handleAnalyze() {
    if (!budgetData || !familyData) {
      toast({ variant: "destructive", title: "Active Family Required", description: "You must be part of a family to use the Decision Intel engine." });
      return;
    }

    if (!purchaseName || !amount || !category || !userData?.familyId) return;
    setLoading(true);
    try {
      const numericAmount = parseFloat(amount);
      const selectedEnvelope = budgetData?.envelopes.find((e: any) => e.name === category);
      
      const analysis = await purchaseImpactAnalysis({
        purchaseName,
        purchaseAmount: numericAmount,
        category,
        priority,
        currentBudget: budgetData?.totalIncome || 0,
        envelopeBalance: selectedEnvelope ? (selectedEnvelope.allocated - selectedEnvelope.spent) : 0,
        envelopeTotal: selectedEnvelope?.allocated || 0,
        currentSavings: 15000,
        safeToSpendDaily: stsData.amount,
        familyGoals: goalsData?.map(g => ({
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline
        })) || [],
      });

      setResult(analysis);

      const decisionRef = doc(collection(db, 'families', userData.familyId, 'decisions'));
      const decisionData = {
        id: decisionRef.id,
        familyId: userData.familyId,
        userId: user!.uid,
        amount: numericAmount,
        category,
        description: purchaseName,
        priority,
        members: familyData.members,
        aiAnalysis: {
          impactSummary: analysis.impactSummary,
          regretScore: analysis.regretScore,
          recommendation: analysis.decisionGuidance,
          recommendationType: analysis.recommendationType
        },
        userAction: 'pending',
        timestamp: new Date().toISOString()
      };
      
      await setDoc(decisionRef, decisionData);
      setDecisionId(decisionRef.id);

    } catch (e: any) {
      toast({ variant: "destructive", title: "Analysis Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: 'proceeded' | 'canceled') {
    if (!decisionId || !userData?.familyId) return;
    try {
      await setDoc(doc(db, 'families', userData.familyId, 'decisions', decisionId), {
        userAction: action
      }, { merge: true });
      
      toast({ title: "Action Saved", description: `You chose to ${action}.` });
      setResult(null);
      setPurchaseName('');
      setAmount('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  }

  if (isUserLoading || !mounted) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="p-6 pb-24 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold font-headline">Decision Intel</h1>
        <p className="text-muted-foreground text-sm">Pre-spending behavioral coaching.</p>
      </header>

      {!budgetData && (
        <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto" />
          <h2 className="font-bold">Active Budget Required</h2>
          <p className="text-sm text-amber-700 dark:text-amber-400">We need your current monthly budget to analyze spending impact.</p>
          <Button onClick={() => router.push('/budget')}>Create Budget</Button>
        </div>
      )}

      {budgetData && !result ? (
        <Card className="border-none shadow-xl bg-white dark:bg-card overflow-hidden">
          <CardHeader className="bg-primary text-white">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" /> Spending Analysis
            </CardTitle>
            <CardDescription className="text-white/80">
              Check impact before you spend.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-lg">{currencySymbol}</span>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 h-12 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Envelope" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetData?.envelopes.map((e: any) => (
                      <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Item Description</label>
              <Input 
                placeholder="What are you considering?" 
                value={purchaseName}
                onChange={(e) => setPurchaseName(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Priority Level</label>
              <div className="flex gap-2">
                {['Need', 'Want', 'Luxury'].map((p) => (
                  <Button
                    key={p}
                    variant={priority === p ? 'default' : 'secondary'}
                    onClick={() => setPriority(p as any)}
                    className="flex-1 h-10 rounded-xl text-xs font-bold"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              className="w-full h-14 rounded-xl font-bold text-lg shadow-lg mt-4" 
              onClick={handleAnalyze}
              disabled={loading || !purchaseName || !amount || !category}
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-5 w-5" />}
              Analyze Impact
            </Button>
          </CardContent>
        </Card>
      ) : result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-xl overflow-hidden">
            <div className={cn(
              "p-4 text-white flex justify-between items-center",
              result.recommendationType === 'Proceed Confidently' ? 'bg-emerald-600' :
              result.recommendationType === 'Consider Carefully' ? 'bg-amber-500' :
              result.recommendationType === 'Reconsider' ? 'bg-orange-600' : 'bg-destructive'
            )}>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <span className="font-bold">{result.recommendationType}</span>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-none text-[10px]">
                Regret Score: {result.regretScore}%
              </Badge>
            </div>
            
            <CardContent className="p-6 space-y-6">
              <div className="p-4 rounded-xl bg-secondary/30">
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-1">Guidance</h3>
                <p className="text-sm font-medium leading-relaxed">{result.decisionGuidance}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Impact on Envelope</p>
                  <p className="text-lg font-bold text-primary">{result.budgetImpactDetails.percentOfEnvelopeConsumed}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Daily STS After</p>
                  <p className="text-lg font-bold text-primary">{currencySymbol}{result.budgetImpactDetails.newSafeToSpendDaily.toFixed(2)}</p>
                </div>
              </div>

              {result.goalImpacts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Goal Analysis</h3>
                  <div className="space-y-2">
                    {result.goalImpacts.map((gi, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-white dark:bg-card shadow-sm">
                        <Target className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold">{gi.goalName}</p>
                          <p className="text-[10px] text-muted-foreground">{gi.impactDescription}</p>
                          {gi.delayEstimateInDays && (
                            <Badge variant="outline" className="mt-1 h-5 text-[9px] border-destructive text-destructive font-bold">
                              +{gi.delayEstimateInDays} days delay
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Smart Alternatives</h3>
                <div className="grid gap-2">
                  {result.alternativeRecommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-medium bg-secondary/10 p-3 rounded-lg border-l-4 border-primary">
                      <ArrowRightCircle className="h-4 w-4 text-primary" />
                      {rec}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button 
                  className="h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleAction('proceeded')}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Proceed with Purchase
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12 rounded-xl font-bold border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => handleAction('canceled')}
                >
                  Cancel & Save instead
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
