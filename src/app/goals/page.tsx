'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, doc, where } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Target, Calendar, TrendingUp, Plus, Loader2, Sparkles, Goal as GoalIcon, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GoalsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
    priority: 'Medium'
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: userData } = useDoc(useMemoFirebase(() => {
    return user ? doc(db, 'userProfiles', user.uid) : null;
  }, [user, db]));

  const familyDocRef = useMemoFirebase(() => {
    return userData?.familyId ? doc(db, 'families', userData.familyId) : null;
  }, [userData?.familyId, db]);

  const { data: familyData } = useDoc(familyDocRef);

  const goalsQuery = useMemoFirebase(() => {
    if (!userData?.familyId || !user) return null;
    return query(
      collection(db, 'families', userData.familyId, 'goals'),
      where(`members.${user.uid}`, '!=', null),
      orderBy('createdAt', 'desc')
    );
  }, [userData?.familyId, user, db]);

  const { data: goals, isLoading } = useCollection(goalsQuery);

  const handleAddGoal = async () => {
    if (!userData?.familyId || !newGoal.name || !newGoal.targetAmount || !familyData) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'families', userData.familyId, 'goals'), {
        ...newGoal,
        targetAmount: parseFloat(newGoal.targetAmount),
        currentAmount: 0,
        members: familyData.members,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Goal Created", description: "Successfully added your family financial goal." });
      setShowAddGoal(false);
      setNewGoal({ name: '', targetAmount: '', deadline: '', priority: 'Medium' });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="p-6 flex flex-col gap-6 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-headline">Family Goals</h1>
          <p className="text-muted-foreground text-sm">Aligning for the future.</p>
        </div>
        <Button onClick={() => setShowAddGoal(true)} size="sm" className="h-10 w-10 rounded-full bg-accent shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </header>

      <div className="space-y-6">
        {isLoading ? (
          <>
            <Skeleton className="h-[200px] w-full rounded-2xl" />
            <Skeleton className="h-[200px] w-full rounded-2xl" />
          </>
        ) : goals && goals.length > 0 ? (
          goals.map((goal) => {
            const percent = Math.round((goal.currentAmount / goal.targetAmount) * 100);
            return (
              <Card key={goal.id} className="border-none shadow-xl bg-white overflow-hidden">
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
                      Target: {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No deadline'}
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
                       <p className="text-[10px] uppercase font-bold text-muted-foreground">Priority</p>
                       <p className="font-bold text-primary">{goal.priority}</p>
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
          })
        ) : (
          <Card className="border-dashed border-2 bg-secondary/10 p-12 flex flex-col items-center justify-center text-center gap-4 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <GoalIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg">No Financial Goals</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Start setting shared family goals to build your wealth together.
              </p>
            </div>
            <Button onClick={() => setShowAddGoal(true)} className="rounded-xl font-bold gap-2">
              <PlusCircle className="h-5 w-5" /> Add Your First Goal
            </Button>
          </Card>
        )}
      </div>

      {!isLoading && goals && goals.length > 0 && (
        <section className="mt-4">
           <h3 className="font-semibold mb-3">Goal Insights</h3>
           <div className="p-4 rounded-2xl bg-white shadow-sm flex items-start gap-4">
             <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
               <TrendingUp className="text-green-600 h-5 w-5" />
             </div>
             <div>
               <p className="text-sm font-bold">Stay disciplined!</p>
               <p className="text-xs text-muted-foreground">Contributing consistently each month is the fastest way to reach your family dreams.</p>
             </div>
           </div>
        </section>
      )}

      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>New Family Goal</DialogTitle>
            <DialogDescription>
              Set a target for your family's financial future.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Goal Name</label>
              <Input 
                placeholder="e.g. Summer Vacation" 
                value={newGoal.name}
                onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Target Amount</label>
              <Input 
                type="number"
                placeholder="0.00" 
                value={newGoal.targetAmount}
                onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Deadline (Optional)</label>
              <Input 
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGoal(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAddGoal} disabled={isSubmitting || !newGoal.name || !newGoal.targetAmount} className="rounded-xl bg-accent">
              {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
