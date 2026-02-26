
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Zap, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const db = getFirestore();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  async function handleLogin() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore, if not create
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          name: user.displayName,
          photoUrl: user.photoURL,
          role: 'Member', // Default role until family is joined/created
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          preferences: {
            currency: 'USD',
            alertThreshold: 80,
            pushNotifications: true
          }
        });
      } else {
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen px-6 py-12 text-center bg-white">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Zap className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-primary tracking-tight font-headline">KINETY</h1>
        <p className="text-muted-foreground text-sm font-medium mt-1">Family Financial Behavior OS</p>
      </div>

      <div className="relative w-full aspect-[4/3] mb-12 rounded-3xl overflow-hidden shadow-2xl">
        <Image 
          src="https://picsum.photos/seed/kinety-hero/800/600"
          alt="Family Finance"
          fill
          className="object-cover"
          data-ai-hint="family finance"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 text-left">
          <p className="text-white font-semibold text-lg">Decide before you spend.</p>
          <p className="text-white/80 text-sm">Real-time coaching for shared households.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 w-full mb-12">
        <div className="flex items-center gap-4 text-left p-4 rounded-xl bg-secondary/30">
          <ShieldCheck className="text-accent h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground">Governance</h3>
            <p className="text-sm text-muted-foreground">Shared accountability for every dollar.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-left p-4 rounded-xl bg-secondary/30">
          <Zap className="text-accent h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground">Pre-Spend Intel</h3>
            <p className="text-sm text-muted-foreground">See how purchases impact your goals.</p>
          </div>
        </div>
      </div>

      <Button onClick={handleLogin} size="lg" className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl">
        Sign in with Google <ArrowRight className="ml-2 h-5 w-5" />
      </Button>

      <p className="mt-8 text-xs text-muted-foreground">
        Secure. Collaborative. Emotionally Intelligent.
      </p>
    </div>
  );
}
