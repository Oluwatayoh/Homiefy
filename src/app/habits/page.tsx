import { FAMILY_DATA } from '@/app/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, Sparkles, TrendingDown, History, Info } from 'lucide-react';
import { personalizedCoachingNudges } from '@/ai/flows/personalized-coaching-nudges';

export const dynamic = 'force-dynamic';

export default async function HabitIntelligence() {
  let nudgeMessage = "Your behavioral patterns are being analyzed. Check back soon for personalized insights!";

  try {
    const nudge = await personalizedCoachingNudges({
      userName: "The Smith Family",
      pastSpendingBehavior: "Frequent small dining transactions and recurring subscription overhead.",
      familyFinancialGoals: FAMILY_DATA.goals.map(g => g.name).join(", "),
    });
    if (nudge?.nudgeMessage) {
      nudgeMessage = nudge.nudgeMessage;
    }
  } catch (error) {
    console.error("Failed to generate AI nudge:", error);
    // Keep default message on error
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold font-headline">Habit Intelligence</h1>
        <p className="text-muted-foreground text-sm">AI-powered behavioral tracking.</p>
      </header>

      {/* AI Nudge Hero */}
      <Card className="bg-accent text-white border-none shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-24 h-24" />
        </div>
        <CardContent className="pt-8 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight">AI Financial Coach</span>
          </div>
          <p className="text-lg font-medium leading-relaxed italic">
            "{nudgeMessage}"
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-white/80">
             <span className="inline-block p-1 bg-white/10 rounded-full"><Info className="h-3 w-3" /></span> Based on your last 30 days
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h3 className="font-semibold px-1">Spending Volatility</h3>
        <Card className="border-none shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stability Score</p>
              <h4 className="text-2xl font-bold">84/100</h4>
            </div>
            <TrendingDown className="text-green-500 h-8 w-8" />
          </div>
          <p className="text-xs text-muted-foreground">Your spending is 12% more stable than last month. Great job keeping the variations low!</p>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold">Impulse Triggers</h3>
          <Badge variant="outline" className="text-[10px]">RECENT</Badge>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Weekend Evenings', value: 'Social pressure', icon: History, color: 'text-amber-500' },
            { label: 'Late Night Apps', value: 'Boredom', icon: History, color: 'text-blue-500' },
          ].map((trigger, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-card shadow-sm border">
              <div className="flex items-center gap-3">
                <History className={`h-5 w-5 ${trigger.color}`} />
                <div>
                  <p className="font-medium text-sm">{trigger.label}</p>
                  <p className="text-[10px] text-muted-foreground">Identified Trigger: {trigger.value}</p>
                </div>
              </div>
              <Badge className="bg-secondary text-primary border-none text-[10px]">COACHING</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
