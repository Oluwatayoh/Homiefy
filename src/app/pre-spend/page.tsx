
"use client";

import { useState } from 'react';
import { purchaseImpactAnalysis, type PurchaseImpactAnalysisOutput } from '@/ai/flows/purchase-impact-analysis-flow';
import { alternativePurchaseRecommendations, type AlternativePurchaseRecommendationsOutput } from '@/ai/flows/alternative-purchase-recommendations';
import { FAMILY_DATA } from '@/app/lib/mock-data';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, AlertTriangle, ArrowRightCircle, Target, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function PreSpendTool() {
  const [purchaseName, setPurchaseName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PurchaseImpactAnalysisOutput | null>(null);
  const [alts, setAlts] = useState<AlternativePurchaseRecommendationsOutput | null>(null);

  async function handleAnalyze() {
    if (!purchaseName || !amount) return;
    setLoading(true);
    try {
      const numericAmount = parseFloat(amount);
      const analysis = await purchaseImpactAnalysis({
        purchaseName,
        purchaseAmount: numericAmount,
        currentBudget: FAMILY_DATA.currentBudget,
        currentSavings: FAMILY_DATA.currentSavings,
        safeToSpendDaily: FAMILY_DATA.safeToSpendDaily,
        familyGoals: FAMILY_DATA.goals,
      });
      setResult(analysis);

      const recommendations = await alternativePurchaseRecommendations({
        purchaseDescription: purchaseName,
        purchaseCost: numericAmount,
        impactAnalysis: analysis.impactSummary,
        familyGoals: FAMILY_DATA.goals.map(g => g.name),
      });
      setAlts(recommendations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold font-headline">Decision Intelligence</h1>
        <p className="text-muted-foreground text-sm">Analyze impact before you spend.</p>
      </header>

      {!result ? (
        <Card className="border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-primary text-white">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" /> New Purchase Check
            </CardTitle>
            <CardDescription className="text-white/80">
              Check how this purchase affects your family's future.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">What are you buying?</label>
              <Input 
                placeholder="e.g. New Wireless Headphones" 
                value={purchaseName}
                onChange={(e) => setPurchaseName(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Price ($)</label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12"
              />
            </div>
            <Button 
              className="w-full h-14 rounded-xl font-bold text-lg shadow-lg" 
              onClick={handleAnalyze}
              disabled={loading || !purchaseName || !amount}
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-5 w-5" />}
              Analyze Impact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-xl overflow-hidden">
            <div className={`p-4 text-white flex justify-between items-center ${result.regretScore > 6 ? 'bg-destructive' : 'bg-primary'}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-bold">KINETY Guidance</span>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-none">
                Regret Score: {result.regretScore}/10
              </Badge>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-lg">Impact Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{result.impactSummary}</p>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Goal Delays</h3>
                {result.goalImpacts.map((gi, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <Target className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">{gi.goalName}</p>
                      <p className="text-[10px] text-muted-foreground">{gi.impactDescription}</p>
                      {gi.delayEstimateInDays && (
                        <p className="text-[10px] text-destructive font-bold mt-1">
                          +{gi.delayEstimateInDays} days delay
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border-l-4 border-primary">
                <h3 className="font-bold text-sm mb-1">Decision Guidance</h3>
                <p className="text-sm text-primary-foreground font-medium text-black">{result.decisionGuidance}</p>
              </div>

              {alts && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Smart Alternatives</h3>
                  <div className="grid gap-2">
                    {alts.recommendations.slice(0, 3).map((rec, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-medium bg-white border p-3 rounded-lg">
                        <ArrowRightCircle className="h-4 w-4 text-accent" />
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {setResult(null); setPurchaseName(''); setAmount('');}}
              >
                Check Another Purchase
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
