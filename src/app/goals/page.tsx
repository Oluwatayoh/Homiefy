
import { FAMILY_DATA } from '@/app/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Calendar, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoalsPage() {
  const { goals } = FAMILY_DATA;

  return (
    <div className="p-6 flex flex-col gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-headline">Family Goals</h1>
          <p className="text-muted-foreground text-sm">Aligning for the future.</p>
        </div>
        <Button size="sm" className="h-10 w-10 rounded-full bg-accent shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </header>

      <div className="space-y-6">
        {goals.map((goal) => {
          const percent = Math.round((goal.currentAmount / goal.targetAmount) * 100);
          return (
            <Card key={goal.name} className="border-none shadow-xl bg-white overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6 pb-0">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Target className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="border-accent text-accent">
                      {percent}% Complete
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold">{goal.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    Target: {new Date(goal.deadline).toLocaleDateString()}
                  </div>
                  
                  <div className="mt-8 mb-2">
                    <div className="flex justify-between text-sm font-bold mb-2">
                      <span>${goal.currentAmount.toLocaleString()}</span>
                      <span className="text-muted-foreground">${goal.targetAmount.toLocaleString()}</span>
                    </div>
                    <Progress value={percent} className="h-3 bg-secondary" />
                  </div>
                </div>
                
                <div className="bg-secondary/30 p-4 mt-6 flex justify-around">
                   <div className="text-center">
                     <p className="text-[10px] uppercase font-bold text-muted-foreground">Monthly Contribution</p>
                     <p className="font-bold text-primary">$250.00</p>
                   </div>
                   <div className="w-px bg-border h-full" />
                   <div className="text-center">
                     <p className="text-[10px] uppercase font-bold text-muted-foreground">Remaining</p>
                     <p className="font-bold text-primary">${(goal.targetAmount - goal.currentAmount).toLocaleString()}</p>
                   </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="mt-4">
         <h3 className="font-semibold mb-3">Goal Insights</h3>
         <div className="p-4 rounded-2xl bg-white shadow-sm flex items-start gap-4">
           <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
             <TrendingUp className="text-green-600 h-5 w-5" />
           </div>
           <div>
             <p className="text-sm font-bold">On track for Summer Vacation!</p>
             <p className="text-xs text-muted-foreground">Based on your current savings rate, you will reach this goal 12 days early.</p>
           </div>
         </div>
      </section>
    </div>
  );
}
