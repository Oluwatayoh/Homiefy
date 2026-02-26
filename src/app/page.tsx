
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Zap, HeartHandshake } from 'lucide-react';
import Image from 'next/image';

export default function LandingPage() {
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

      <Button asChild size="lg" className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl">
        <Link href="/dashboard" className="flex items-center justify-center gap-2">
          Enter Dashboard <ArrowRight className="h-5 w-5" />
        </Link>
      </Button>

      <p className="mt-8 text-xs text-muted-foreground">
        Secure. Collaborative. Emotionally Intelligent.
      </p>
    </div>
  );
}
