
"use client";

import { useState } from 'react';
import { impulseSpendingDetection, type ImpulseSpendingDetectionOutput } from '@/ai/flows/impulse-spending-detection';
import { FAMILY_DATA } from '@/app/lib/mock-data';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Smile, Meh, Frown, Sparkles, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ["Groceries", "Dining", "Shopping", "Entertainment", "Transport", "Bills", "Health"];

export default function RapidLog() {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Shopping');
  const [sentiment, setSentiment] = useState<'happy' | 'neutral' | 'unhappy' | null>(null);
  const [loading, setLoading] = useState(false);
  const [impulseResult, setImpulseResult] = useState<ImpulseSpendingDetectionOutput | null>(null);
  const { toast } = useToast();

  async function handleSubmit() {
    if (!desc || !amount) return;
    setLoading(true);
    try {
      const result = await impulseSpendingDetection({
        transactionDetails: desc,
        amount: parseFloat(amount),
        category,
        timestamp: new Date().toISOString(),
        previousSpendingPatterns: "Frequent dining out and subscription renewals.",
        familyGoals: FAMILY_DATA.goals.map(g => g.name),
      });
      setImpulseResult(result);
      
      toast({
        title: "Transaction Logged",
        description: `$${amount} recorded for ${category}.`,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold font-headline">Log Spend</h1>
        <p className="text-muted-foreground text-sm">Lightning fast record keeping.</p>
      </header>

      <Card className="border-none shadow-xl bg-white p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-lg">$</span>
              <Input 
                type="number" 
                placeholder="0.00" 
                className="pl-8 h-14 text-xl font-bold rounded-xl"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-14 rounded-xl font-medium">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Description</label>
          <Input 
            placeholder="What did you buy?" 
            className="h-12 rounded-xl"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">How do you feel about this?</label>
          <div className="flex justify-between gap-2">
            {[
              { id: 'happy', icon: Smile, color: 'text-green-500' },
              { id: 'neutral', icon: Meh, color: 'text-yellow-500' },
              { id: 'unhappy', icon: Frown, color: 'text-red-500' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSentiment(s.id as any)}
                className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  sentiment === s.id ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary/50'
                }`}
              >
                <s.icon className={`h-8 w-8 ${s.color}`} />
              </button>
            ))}
          </div>
        </div>

        <Button 
          className="w-full h-14 rounded-xl text-lg font-bold shadow-lg mt-4"
          onClick={handleSubmit}
          disabled={loading || !desc || !amount}
        >
          {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-5 w-5" />}
          Log Transaction
        </Button>
      </Card>

      {impulseResult && (
        <Card className={`border-none shadow-lg animate-in fade-in zoom-in duration-300 overflow-hidden ${impulseResult.isImpulsePurchase ? 'bg-amber-50' : 'bg-green-50'}`}>
          <div className="p-4 flex items-center gap-3">
            <Brain className={`h-6 w-6 ${impulseResult.isImpulsePurchase ? 'text-amber-600' : 'text-green-600'}`} />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Behavioral Insight</p>
              <p className="text-sm font-semibold">{impulseResult.insight}</p>
            </div>
          </div>
          {impulseResult.isImpulsePurchase && (
            <div className="bg-amber-100 p-3 text-[10px] font-bold flex justify-between items-center">
              <span>IMPULSE TRIGGER DETECTED: {impulseResult.spendingTrigger}</span>
              <Badge variant="outline" className="text-[8px] border-amber-500 text-amber-600">HIGH RISK</Badge>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
