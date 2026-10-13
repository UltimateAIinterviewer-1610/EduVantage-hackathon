import React, { useState } from 'react';
import { cloudConfigured, cloudRecover, cloudSignIn, cloudSignInWithGoogle, cloudSignUp, cloudUpdatePassword, hasDeviceProgress } from '../services/cloud';
import { publicName, supportEmail } from '../services/publicIdentity';

export default function CloudGate({ onReady, onBack, recovering = false, initialMode = 'sign-in' }: { onReady: (importDevice?: boolean) => Promise<void>; onBack?: () => void; recovering?: boolean; initialMode?: 'sign-in' | 'sign-up' }) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'recover' | 'reset'>(recovering ? 'reset' : initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [importDevice,setImportDevice]=useState(false);
  const [accountOwnerConfirmed,setAccountOwnerConfirmed]=useState(false);
  const googleSignIn = () => {
    if (!accountOwnerConfirmed) { setMessage('Please confirm that you are the adult learner or the parent or guardian who will own and manage this account.'); return; }
    try { setMessage(''); cloudSignInWithGoogle(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not start Google sign-in.'); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cloudConfigured) return;
    setBusy(true); setMessage('');
    try {
      if (mode === 'recover') { await cloudRecover(email.trim()); setMessage('If this email has an account, a reset link is on its way.'); }
      else if (mode === 'reset') { await cloudUpdatePassword(password); setMessage('Password updated.'); await onReady(false); }
      else if (mode === 'sign-up') {
        if (!accountOwnerConfirmed) { setMessage('Please confirm that you are the adult learner or the parent or guardian who will own and manage this account.'); return; }
        const active = await cloudSignUp(email.trim(), password);
        if (active) await onReady(importDevice);
        else setMessage('Check your email to confirm your account, then sign in.');
      } else { await cloudSignIn(email.trim(), password); await onReady(importDevice); }
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Could not connect. Try again.';
      setMessage(/email rate limit exceeded/i.test(detail)
        ? 'Confirmation emails are temporarily unavailable. Please try again later, or continue with Google.'
        : detail);
    }
    finally { setBusy(false); }
  };
  if (!cloudConfigured) return <div className="min-h-screen grid place-items-center bg-slate-50 p-5"><main className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 space-y-5">
    <h1 className="text-3xl font-black">{initialMode === 'sign-up' ? 'Sign up' : 'Log in'} is not configured</h1>
    <p>Online accounts require Supabase. This local installation is missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. Add both settings to .env.local and restart the server. See DEPLOYMENT.md for account setup.</p>
    <p>The local demo saves only on this device. It does not create an account or sign you in to an online account.</p>
    <button type="button" onClick={onBack} className="primary-button">← Public home</button>
    <a href="#/privacy" className="block underline">Privacy Policy</a>
  </main></div>;
  return <div className="cloud-gate min-h-screen flex items-center justify-center bg-slate-50 p-5"><main className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
    {onBack && <div className="border-b border-slate-200 px-8 py-3"><button type="button" onClick={onBack} className="text-sm font-semibold text-indigo-700 hover:underline">← Public home</button></div>}
    <div className="bg-slate-900 text-white p-8"><p className="text-xs font-bold uppercase tracking-widest text-emerald-300">{publicName} · Your learning studio</p><h1 className="text-3xl font-black mt-3">{mode === 'sign-up' ? 'Create your account' : mode === 'recover' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'Welcome back'}</h1><p className="text-slate-300 mt-3">Your classes and progress stay with your account across devices.</p></div>
    <form onSubmit={submit} className="p-8 space-y-5">
      {mode !== 'reset' && <label className="profile-field"><span>Email address</span><input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>}
      {mode !== 'recover' && <label className="profile-field"><span>{mode === 'reset' ? 'New password' : 'Password'}</span><input type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label>}
      {mode !== 'recover' && mode !== 'reset' && hasDeviceProgress() && <label className="flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={importDevice} onChange={event => setImportDevice(event.target.checked)} /><span>Import learning progress from this device if this account is empty.</span></label>}
      {(mode === 'sign-in' || mode === 'sign-up') && <label className="account-owner-notice flex gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-slate-800"><input type="checkbox" checked={accountOwnerConfirmed} onChange={event => setAccountOwnerConfirmed(event.target.checked)} /><span>I am the adult learner, or the parent or guardian who owns and manages this account for a child. Children must not create their own accounts.</span></label>}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
      <button className="primary-button w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : mode === 'recover' ? 'Send reset link' : mode === 'reset' ? 'Save new password' : 'Sign in'}</button>
      {(mode === 'sign-in' || mode === 'sign-up') && <><div className="text-center text-sm text-slate-500">or</div><button type="button" onClick={googleSignIn} disabled={busy} className="google-sign-in w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800 hover:bg-slate-50"><span aria-hidden="true" className="google-mark">G</span> Continue with Google</button></>}
      <div className="flex flex-wrap gap-4 text-sm text-indigo-700 font-semibold">
        {mode !== 'sign-in' && <button type="button" onClick={() => { setMode('sign-in'); setMessage(''); }}>Sign in</button>}
        {mode !== 'sign-up' && mode !== 'reset' && <button type="button" onClick={() => { setMode('sign-up'); setMessage(''); }}>Create account</button>}
        {mode === 'sign-in' && <button type="button" onClick={() => { setMode('recover'); setMessage(''); }}>Forgot password?</button>}
      </div>
      <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-4 text-sm"><a href="#/privacy" className="font-semibold text-indigo-700 underline">Privacy Policy</a>{supportEmail && <a className="font-semibold text-indigo-700 underline" href={`mailto:${supportEmail}`}>Contact support</a>}</div>
    </form>
  </main></div>;
}
