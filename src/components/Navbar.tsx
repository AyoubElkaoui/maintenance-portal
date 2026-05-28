'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Home, Upload, LayoutDashboard, Settings, LogOut, Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Navbar() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isUploader = session?.user?.role === 'uploader';
  const isReviewer = session?.user?.role === 'reviewer';
  const isAuthenticated = status === 'authenticated';

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await signOut({ callbackUrl: '/signin' });
  };

  const closeMobile = () => setMobileMenuOpen(false);

  const navLink = (href: string, icon: React.ReactNode, label: string) => {
    const active = pathname === href || pathname.startsWith(href + '/') && href !== '/';
    return (
      <Link
        href={href}
        className={`px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 text-sm transition-all duration-150 ${
          active
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {icon}
        {label}
      </Link>
    );
  };

  const mobileLink = (href: string, icon: React.ReactNode, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        onClick={closeMobile}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 ${
          active
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
        }`}
      >
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <header className="glass dark:bg-[#0a0f1e]/85 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0" onClick={closeMobile}>
            <Image
              src="/elmar-logo.png"
              alt="Elmar Services"
              width={200}
              height={60}
              className="h-8 w-auto"
              priority
            />
            <div className="hidden sm:block border-l border-slate-200 dark:border-slate-700 pl-3">
              <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">CSV Portal</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wider">Factuurbeheer</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLink('/', <Home size={15} />, 'Home')}
            {isUploader && navLink('/upload', <Upload size={15} />, 'Upload')}
            {isAuthenticated && navLink('/dashboard', <LayoutDashboard size={15} />, 'Dashboard')}
            {isUploader && navLink('/settings', <Settings size={15} />, 'Instellingen')}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    {session?.user?.name || session?.user?.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-500 capitalize">
                    {isReviewer ? 'Reviewer' : 'Uploader'}
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isReviewer ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                }`}>
                  {(session?.user?.name || session?.user?.email || '?')[0].toUpperCase()}
                </div>
              </div>
            )}

            <ThemeToggle />

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150"
                title="Uitloggen"
              >
                <LogOut size={17} />
              </button>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0a0f1e]/95 backdrop-blur-xl">
          <div className="px-3 py-3 space-y-1">
            {isAuthenticated && (
              <div className="flex items-center gap-3 px-4 py-3 mb-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isReviewer ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                }`}>
                  {(session?.user?.name || session?.user?.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {session?.user?.name || session?.user?.email}
                  </div>
                  <div className="text-xs text-slate-500 capitalize">{isReviewer ? 'Reviewer' : 'Uploader'}</div>
                </div>
              </div>
            )}

            {mobileLink('/', <Home size={18} />, 'Home')}
            {isUploader && mobileLink('/upload', <Upload size={18} />, 'Upload Bestand')}
            {isAuthenticated && mobileLink('/dashboard', <LayoutDashboard size={18} />, 'Dashboard')}
            {isUploader && mobileLink('/settings', <Settings size={18} />, 'Instellingen')}

            {isAuthenticated && (
              <>
                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-all"
                >
                  <LogOut size={18} />
                  Uitloggen
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
