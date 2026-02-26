"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { impulseSpendingDetection, type ImpulseSpendingDetectionOutput } from '@/ai/flows/impulse-spending-detection';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Smile, Meh, Frown, Sparkles, Brain, Camera, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function RapidLog() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [sentiment, setSentiment] = useState<'happy' | 'neutral' | 'unhappy' | null>(null);
  const [loading, setLoading] = useState(false);
  const [impulseResult, setImpulseResult] = useState<ImpulseSpendingDetectionOutput | null>(null);
  
  const [showCamera, setShowCamera] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentMonthId = useMemo(() => {
    if (!mounted) return '';
    return new Date().toISOString().slice(0, 7);
  }, [mounted]);

  const userDocRef = useMemoFirebase(() => {
    return user ? doc(db, 'users', user.uid) : null;
  }, [user, db]);

  const { data: userData } = useDoc(userDocRef);

  const budgetDocRef = useMemoFirebase(() => {
    return userData?.familyId && currentMonthId ? doc(db, 'families', userData.familyId, 'budgets', currentMonthId) : null;
  }, [userData?.familyId, db, currentMonthId]);

  const { data: budgetData } = useDoc(budgetDocRef);

  const envelopes = budgetData?.envelopes || [];

  useEffect(() => {
    if (showCamera) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions to capture receipts.',
          });
        }
      };
      getCameraPermission();
    } else if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  }, [showCamera, toast]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setReceiptPhoto(dataUrl);
        setShowCamera(false);
      }
    }
  };

  async function handleSubmit() {
    if (!desc || !amount || !category || !userData?.familyId) return;
    setLoading(true);
    
    const numericAmount = parseFloat(amount);
    const familyId = userData.familyId;

    try {
      const result = await impulseSpendingDetection({
        transactionDetails: desc,
        amount: numericAmount,
        category,
        timestamp: new Date().toISOString(),
        previousSpendingPatterns: "Frequent dining and shopping entries.",
        familyGoals: [],
      });
      setImpulseResult(result);

      const transactionsRef = collection(db, 'families', familyId, 'transactions');
      const transactionData = {
        familyId,
        userId: user!.uid,
        userName: user!.displayName || 'User',
        amount: numericAmount,
        category,
        description: desc,
        receiptPhoto: receiptPhoto || null,
        sentiment: sentiment || 'neutral',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      addDocumentNonBlocking(transactionsRef, transactionData);

      if (budgetDocRef && budgetData) {
        const updatedEnvelopes = budgetData.envelopes.map((e: any) => 
          e.name === category ? { ...e, spent: (e.spent || 0) + numericAmount } : e
        );
        updateDoc(budgetDocRef, { envelopes: updatedEnvelopes });
      }
      
      toast({
        title: "Transaction Logged",
        description: `$${amount} recorded for ${category}.`,
      });

      setTimeout(() => router.push('/dashboard'), 2000);

    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  }

  if (isUserLoading || !mounted) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-6 pb-24 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold font-headline">Rapid Log</h1>
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
                {envelopes.map(e => (
                  <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                ))}
                {envelopes.length === 0 && <SelectItem value="Uncategorized" disabled>Setup budget first</SelectItem>}
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
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Receipt</label>
          {!receiptPhoto ? (
            <Button 
              variant="outline" 
              className="w-full h-12 border-dashed rounded-xl gap-2"
              onClick={() => setShowCamera(true)}
            >
              <Camera className="h-5 w-5" /> Add Receipt Photo
            </Button>
          ) : (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden group">
              <Image src={receiptPhoto} alt="Receipt" fill className="object-cover" />
              <button 
                onClick={() => setReceiptPhoto(null)}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Mood Check</label>
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
          disabled={loading || !desc || !amount || !category}
        >
          {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-5 w-5" />}
          Log Transaction
        </Button>
      </Card>

      {showCamera && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          <div className="p-4 flex justify-between items-center text-white">
            <h2 className="font-bold">Capture Receipt</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowCamera(false)}><X className="h-6 w-6" /></Button>
          </div>
          <div className="flex-1 relative bg-neutral-900 flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-contain" autoPlay muted playsInline />
            {hasCameraPermission === false && (
              <Alert variant="destructive" className="absolute mx-6">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>Please allow camera access in settings.</AlertDescription>
              </Alert>
            )}
          </div>
          <div className="p-8 bg-black flex justify-center">
            <button 
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {impulseResult && (
        <Card className={`border-none shadow-lg animate-in fade-in zoom-in duration-300 overflow-hidden ${impulseResult.isImpulsePurchase ? 'bg-amber-50' : 'bg-green-50'}`}>
          <div className="p-4 flex items-center gap-3">
            <Brain className={`h-6 w-6 ${impulseResult.isImpulsePurchase ? 'text-amber-600' : 'text-green-600'}`} />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Behavioral Insight</p>
              <p className="text-sm font-semibold">{impulseResult.insight}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
