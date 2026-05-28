'use client';

import Link from 'next/link';
import { Upload, LayoutDashboard, Settings, ArrowRight, Shield, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Hero */}
        <div className="text-center mb-20 slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Factuur Review Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-5 text-slate-900 dark:text-white tracking-tight leading-[1.1]">
            Elmar Services
            <span className="block text-blue-600 dark:text-blue-400">Portal</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Upload, review en beheer factuurbestanden eenvoudig en professioneel in één centraal platform.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-20">
          {[
            {
              href: '/upload',
              icon: <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
              iconBg: 'bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30',
              border: 'hover:border-blue-300 dark:hover:border-blue-700',
              title: 'Upload',
              description: 'Upload factuurbestanden voor review',
              cta: 'Bestand uploaden',
              ctaColor: 'text-blue-600 dark:text-blue-400',
              delay: '0ms',
            },
            {
              href: '/dashboard',
              icon: <LayoutDashboard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
              iconBg: 'bg-emerald-50 dark:bg-emerald-900/20 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30',
              border: 'hover:border-emerald-300 dark:hover:border-emerald-700',
              title: 'Dashboard',
              description: 'Bekijk uploads en reviews',
              cta: 'Openen',
              ctaColor: 'text-emerald-600 dark:text-emerald-400',
              delay: '60ms',
            },
            {
              href: '/settings',
              icon: <Settings className="w-6 h-6 text-violet-600 dark:text-violet-400" />,
              iconBg: 'bg-violet-50 dark:bg-violet-900/20 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30',
              border: 'hover:border-violet-300 dark:hover:border-violet-700',
              title: 'Instellingen',
              description: 'Configureer email en account',
              cta: 'Configureren',
              ctaColor: 'text-violet-600 dark:text-violet-400',
              delay: '120ms',
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`group card-modern p-8 hover:shadow-lg transition-all duration-200 ${card.border} fade-in`}
              style={{ animationDelay: card.delay }}
            >
              <div className={`w-12 h-12 ${card.iconBg} rounded-2xl flex items-center justify-center mb-6 transition-colors duration-150`}>
                {card.icon}
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{card.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                {card.description}
              </p>
              <span className={`text-sm font-semibold ${card.ctaColor} flex items-center gap-1 group-hover:gap-2 transition-all duration-150`}>
                {card.cta} <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>

        {/* How it works */}
        <div className="card-modern p-10 fade-in" style={{ animationDelay: '180ms' }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Hoe werkt het?</h2>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <FileText className="w-5 h-5 text-white" />,
                bg: 'bg-blue-600',
                step: '01',
                title: 'Upload',
                desc: 'Upload CSV of Excel bestanden. Maximaal 5 bestanden tegelijk in de wachtrij.',
              },
              {
                icon: <Shield className="w-5 h-5 text-white" />,
                bg: 'bg-violet-600',
                step: '02',
                title: 'Review',
                desc: 'De reviewer beoordeelt elke factuur, markeert problemen en voegt opmerkingen toe.',
              },
              {
                icon: <CheckCircle2 className="w-5 h-5 text-white" />,
                bg: 'bg-emerald-600',
                step: '03',
                title: 'Download',
                desc: 'Download het gereviewde bestand als Excel en PDF. Automatische opschoning na download.',
              },
            ].map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="shrink-0">
                  <div className={`w-10 h-10 ${step.bg} rounded-xl flex items-center justify-center shadow-sm`}>
                    {step.icon}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">{step.step}</div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1.5">{step.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            &copy; {new Date().getFullYear()} Elmar Services &mdash; Factuurbeheer Systeem
          </p>
        </div>
      </footer>
    </div>
  );
}
