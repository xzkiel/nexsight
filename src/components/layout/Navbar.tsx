'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { cn } from '@/lib/cn';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from '@/components/ui/Icons';

const navigation = [
    { name: 'Markets', href: '/markets' },
    { name: 'Leaderboard', href: '/leaderboard' },
    { name: 'Portfolio', href: '/portfolio' },
];

export function Navbar() {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-bg-base/60 backdrop-blur-xl">
            <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                        <defs>
                            <linearGradient id="nav-prism" x1="0" y1="0" x2="64" y2="64">
                                <stop offset="0%" stopColor="#55D292"/>
                                <stop offset="100%" stopColor="#9945FF"/>
                            </linearGradient>
                        </defs>
                        <path d="M32 8L56 52H8L32 8Z" stroke="url(#nav-prism)" strokeWidth="2.5" fill="none"/>
                        <line x1="46" y1="28" x2="56" y2="22" stroke="#55D292" strokeWidth="1.5" opacity="0.8"/>
                        <line x1="46" y1="32" x2="58" y2="32" stroke="#6FFFB0" strokeWidth="1.5" opacity="0.6"/>
                        <line x1="46" y1="36" x2="56" y2="42" stroke="#9945FF" strokeWidth="1.5" opacity="0.8"/>
                    </svg>
                    <span className="font-heading text-xl font-bold tracking-tight text-text-primary group-hover:text-white transition-colors">
                        Nex<span className="text-text-secondary font-normal">sight</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navigation.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "text-sm font-medium transition-all relative py-1",
                                pathname === item.href
                                    ? "text-accent-emerald"
                                    : "text-text-secondary hover:text-text-primary"
                            )}
                        >
                            {item.name}
                            {pathname === item.href && (
                                <motion.div
                                    layoutId="navbar-indicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-emerald shadow-[0_0_10px_rgba(0,255,136,0.5)]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            )}
                        </Link>
                    ))}
                </div>

                {/* Wallet & Mobile Toggle */}
                <div className="flex items-center gap-4">
                    {isMounted ? (
                        <WalletMultiButton />
                    ) : (
                        <div className="h-9 w-[120px] bg-white/5 rounded-xl animate-pulse" />
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-b border-white/10 bg-bg-base/90 backdrop-blur-xl overflow-hidden"
                    >
                        <div className="flex flex-col p-4 gap-2">
                            {navigation.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                        pathname === item.href
                                            ? "bg-white/10 text-accent-emerald"
                                            : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                                    )}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
