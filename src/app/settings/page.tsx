'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Settings, Mail, Lock, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [uploaderEmail, setUploaderEmail] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [credentialMessage, setCredentialMessage] = useState('');
  const [updatingCredentials, setUpdatingCredentials] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    fetch('/api/settings/reviewer-email')
      .then(res => res.json())
      .then(data => {
        if (data.uploaderEmail) setUploaderEmail(data.uploaderEmail);
        if (data.reviewerEmail) setReviewerEmail(data.reviewerEmail);
      })
      .catch(console.error);

    if (session?.user?.email) setNewEmail(session.user.email);
  }, [session]);

  const handleSave = async () => {
    if (!uploaderEmail?.includes('@')) { setMessage('error:Ongeldig uploader e-mailadres'); return; }
    if (!reviewerEmail?.includes('@')) { setMessage('error:Ongeldig reviewer e-mailadres'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/reviewer-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploaderEmail, reviewerEmail }),
      });
      setMessage(res.ok ? 'success:E-mailadressen opgeslagen' : 'error:Opslaan mislukt');
    } catch {
      setMessage('error:Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleCredentialUpdate = async () => {
    setCredentialMessage('');
    if (newPassword && newPassword !== confirmPassword) {
      setCredentialMessage('error:Wachtwoorden komen niet overeen');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setCredentialMessage('error:Minimaal 6 tekens vereist');
      return;
    }
    if (!newEmail?.includes('@')) {
      setCredentialMessage('error:Ongeldig e-mailadres');
      return;
    }

    setUpdatingCredentials(true);
    try {
      const res = await fetch('/api/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail !== session?.user?.email ? newEmail : undefined,
          password: newPassword || undefined,
          currentPassword: currentPassword || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCredentialMessage('success:Gegevens bijgewerkt. Log opnieuw in.');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        if (newEmail !== session?.user?.email || newPassword) {
          setTimeout(() => { window.location.href = '/api/auth/signout'; }, 2000);
        }
      } else {
        setCredentialMessage('error:' + (data.error || 'Bijwerken mislukt'));
      }
    } catch {
      setCredentialMessage('error:Bijwerken mislukt');
    } finally {
      setUpdatingCredentials(false);
    }
  };

  const msgType = (msg: string) => msg.startsWith('success:') ? 'success' : msg.startsWith('error:') ? 'error' : '';
  const msgText = (msg: string) => msg.replace(/^(success|error):/, '');

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 transition-all outline-none text-sm";
  const pwInputClass = inputClass + " pr-12";

  const MessageBanner = ({ msg }: { msg: string }) => {
    if (!msg) return null;
    const t = msgType(msg);
    return (
      <div className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm ${
        t === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-400'
          : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-400'
      }`}>
        {t === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
        <span className="font-medium">{msgText(msg)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1e]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-12 slide-up">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Instellingen</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-13">
            Beheer je account en e-mailnotificaties
          </p>
        </div>

        <div className="space-y-5">
          {/* Login credentials */}
          <div className="card-modern p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <Lock className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" size={18} />
              <h2 className="font-bold text-slate-900 dark:text-white">Inloggegevens</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="newEmail" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  E-mailadres
                </label>
                <input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="jouw@email.nl"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="currentPw" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Huidig wachtwoord
                  </label>
                  <div className="relative">
                    <input
                      id="currentPw"
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className={pwInputClass}
                    />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPw" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Nieuw wachtwoord
                  </label>
                  <div className="relative">
                    <input
                      id="newPw"
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Leeg = niet wijzigen"
                      className={pwInputClass}
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {newPassword && (
                <div>
                  <label htmlFor="confirmPw" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Bevestig nieuw wachtwoord
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPw"
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${pwInputClass} ${confirmPassword && confirmPassword !== newPassword ? 'border-red-300 dark:border-red-700' : ''}`}
                    />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="mt-1.5 text-xs text-red-500">Wachtwoorden komen niet overeen</p>
                  )}
                </div>
              )}

              <MessageBanner msg={credentialMessage} />

              <button
                onClick={handleCredentialUpdate}
                disabled={updatingCredentials}
                className="btn-primary py-2.5 px-5 disabled:opacity-50"
              >
                {updatingCredentials ? 'Bijwerken...' : 'Gegevens bijwerken'}
              </button>
            </div>
          </div>

          {/* Email notifications */}
          <div className="card-modern p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <Mail className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" size={18} />
              <h2 className="font-bold text-slate-900 dark:text-white">E-mailnotificaties</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="uploaderEmail" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Uploader e-mail
                </label>
                <p className="text-xs text-slate-400 dark:text-slate-600 mb-2">Ontvangt melding wanneer de review klaar is</p>
                <input
                  id="uploaderEmail"
                  type="email"
                  value={uploaderEmail}
                  onChange={e => setUploaderEmail(e.target.value)}
                  placeholder="anissa@bedrijf.nl"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="reviewerEmail" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Reviewer e-mail
                </label>
                <p className="text-xs text-slate-400 dark:text-slate-600 mb-2">Ontvangt melding bij nieuwe uploads</p>
                <input
                  id="reviewerEmail"
                  type="email"
                  value={reviewerEmail}
                  onChange={e => setReviewerEmail(e.target.value)}
                  placeholder="reviewer@bedrijf.nl"
                  className={inputClass}
                />
              </div>

              <MessageBanner msg={message} />

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary py-2.5 px-5 disabled:opacity-50"
                >
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
                <Link href="/dashboard" className="btn-secondary py-2.5 px-5">
                  Annuleren
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
