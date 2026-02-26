"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, PlusCircle, Users, UserCircle, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

export default function MobileNav() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();

  if (isUserLoading || !user) {
    return null;
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Home', href: '/dashboard' },
    { icon: PieChart, label: 'Budget', href: '/budget' },
    { icon: PlusCircle, label: 'Pre-Spend', href: '/pre-spend', highlight: true },
    { icon: Users, label: 'Family', href: '/family' },
    { icon: UserCircle, label: 'Profile', href: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border flex justify-around items-center h-16 px-2 z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-colors",
              item.highlight ? "text-accent" : (isActive ? "text-primary" : "text-muted-foreground")
            )}
          >
            <item.icon className={cn("h-6 w-6", item.highlight && "h-8 w-8")} />
            {!item.highlight && <span className="text-[10px] font-medium mt-1">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}