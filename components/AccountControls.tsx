import React, { useState } from 'react';
import { cloudConfigured, cloudDeleteAccount, exportLearnerData } from '../services/cloud';
import { publicName, supportEmail } from '../services/publicIdentity';

export default function AccountControls({ onDeleted }: { onDeleted: () => void }) {
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const remove = async () => {
    if (confirm !== 'DELETE') return;
    setBusy(true); setMessage('');
    try { await cloudDeleteAccount(password); onDeleted(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete your account.'); }
    finally { setBusy(false); }
  };
  return <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4">
    <h2 className="text-xl font-bold">Your data and privacy</h2>
    <p className="text-sm text-slate-600">Your profile and learning progress {cloudConfigured ? 'are saved to your account' : 'stay on this device'}. AI requests send the relevant lesson text or uploaded excerpts to the provider you choose. Your provider key is not included in the export.</p>
    <p className="text-sm text-slate-600">{publicName} is the name shown for this service.{supportEmail && <> For account or privacy help, contact <a className="font-semibold text-indigo-700 underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</>}</p>
    <a href="#/privacy" className="inline-block text-sm font-semibold text-indigo-700 underline">Read the Privacy Policy</a>
    <button type="button" onClick={exportLearnerData} className="rounded-xl border border-slate-300 px-4 py-2 font-semibold">Download my data</button>
    {cloudConfigured && <div className="border-t border-slate-200 pt-5 space-y-3">
      {!showDelete ? <button type="button" className="text-rose-700 font-semibold" onClick={() => setShowDelete(true)}>Delete my account and saved data</button> : <>
        <p className="text-sm text-rose-800">This permanently deletes your account and synced learning data. Download a copy first if you want one. Type DELETE and enter your current password to confirm.</p>
        <label className="profile-field"><span>Confirmation</span><input value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="off" /></label>
        <label className="profile-field"><span>Current password</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" /></label>
        <div className="flex gap-3"><button type="button" disabled={busy || confirm !== 'DELETE' || !password} onClick={remove} className="rounded-xl bg-rose-700 text-white px-4 py-2 disabled:opacity-50">{busy ? 'Deleting…' : 'Permanently delete'}</button><button type="button" onClick={() => { setShowDelete(false); setConfirm(''); setPassword(''); }} className="px-4 py-2">Cancel</button></div>
      </>}
      {message && <p role="alert" className="text-sm text-rose-700">{message}</p>}
    </div>}
  </section>;
}
