'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, actualTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-xl text-slate-500 dark:text-slate-400" title="Thema wisselen">
        <Monitor size={17} />
      </button>
    );
  }

  const getIcon = () => {
    if (theme === 'system') return <Monitor size={17} />;
    return actualTheme === 'dark' ? <Moon size={17} /> : <Sun size={17} />;
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
      title={`Thema: ${theme === 'system' ? 'Systeem' : actualTheme === 'dark' ? 'Donker' : 'Licht'}`}
      suppressHydrationWarning
    >
      {getIcon()}
    </button>
  );
}
