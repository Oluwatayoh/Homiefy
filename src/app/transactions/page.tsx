"use client";

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, deleteDoc, where } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Search, Filter, ArrowUpDown, Trash2, Edit3, User, Tag, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function TransactionHistory() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'userProfiles', user.uid) : null;
  }, [user, db]);

  const { data: userData } = useDoc(userDocRef);

  const txQuery = useMemoFirebase(() => {
    if (!userData?.familyId || !user) return null;
    return query(
      collection(db, 'families', userData.familyId, 'transactions'),
      where(`members.${user.uid}`, '!=', null),
      orderBy(`members.${user.uid}`),
      orderBy('date', sortOrder)
    );
  }, [userData?.familyId, user, db, sortOrder]);

  const { data: transactions, isLoading } = useCollection(txQuery);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(tx => {
      const matchesSearch = tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           tx.userName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchTerm, categoryFilter]);

  const categories = useMemo(() => {
    if (!transactions) return [];
    return Array.from(new Set(transactions.map(t => t.category)));
  }, [transactions]);

  const handleDelete = async (tx: any) => {
    if (!confirm("Are you sure you want to delete this transaction? This will not automatically reverse budget balances.")) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'families', userData.familyId!, 'transactions', tx.id));
      toast({ title: "Transaction Deleted" });
      setSelectedTx(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isUserLoading || isLoading || !mounted) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-6 pb-24 flex flex-col gap-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-headline">History</h1>
          <p className="text-muted-foreground text-sm">Family transaction records.</p>
        </div>
        <Button variant="outline" size="icon" className="rounded-full">
          <Download className="h-4 w-4" />
        </Button>
      </header>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search description or member..." 
            className="pl-10 h-11 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="flex-1 rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="rounded-xl px-3"
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredTransactions.map((tx) => (
          <Card 
            key={tx.id} 
            className="border-none shadow-sm cursor-pointer hover:bg-secondary/20 transition-colors"
            onClick={() => setSelectedTx(tx)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold truncate max-w-[150px]">{tx.description || tx.category}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> {tx.userName} • {new Date(tx.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">${tx.amount.toFixed(2)}</p>
                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">
                  {tx.category}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p>No transactions found matching your criteria.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Logged on {selectedTx && new Date(selectedTx.date).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTx && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-secondary/30">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold">${selectedTx.amount.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/30">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Category</p>
                  <p className="text-lg font-bold">{selectedTx.category}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Description</p>
                <p className="text-sm font-medium">{selectedTx.description || 'No description'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Member</p>
                <p className="text-sm font-medium">{selectedTx.userName}</p>
              </div>

              {selectedTx.receiptPhoto && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Receipt Photo</p>
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-md">
                    <img src={selectedTx.receiptPhoto} alt="Receipt" className="object-cover w-full h-full" />
                  </div>
                </div>
              )}

              <DialogFooter className="flex-row gap-2 pt-4">
                {(userData?.role === 'Admin' || userData?.role === 'Co-Manager' || selectedTx.userId === user?.uid) && (
                  <>
                    <Button 
                      variant="destructive" 
                      className="flex-1 rounded-xl"
                      onClick={() => handleDelete(selectedTx)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl"
                      onClick={() => toast({ title: "Edit mode coming soon" })}
                    >
                      <Edit3 className="h-4 w-4 mr-2" /> Edit
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
