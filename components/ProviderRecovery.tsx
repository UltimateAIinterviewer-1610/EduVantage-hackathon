import React, { useEffect, useState } from 'react';
import type { AIConnection } from '../services/aiConnection';
import { limitMessage, readProviderWait } from '../services/providerLimits';

export function useProviderWait(connection: AIConnection): boolean {
  const [waiting,setWaiting]=useState(()=>Boolean(readProviderWait(connection)));
  useEffect(()=>{
    const update=()=>setWaiting(Boolean(readProviderWait(connection)));
    update();
    const timer=window.setInterval(update,1000);
    return()=>window.clearInterval(timer);
  },[connection.provider,connection.model,connection.baseUrl]);
  return waiting;
}
export default function ProviderRecovery({connection,error,onOpenProvider,practice}:{
  connection:AIConnection;error:string;onOpenProvider:()=>void;practice:string
}) {
  const [,tick]=useState(0);
  useEffect(()=>{const timer=window.setInterval(()=>tick(value=>value+1),1000);return()=>window.clearInterval(timer);},[]);
  const wait=readProviderWait(connection);
  if(!wait&&!/(?:provider.*(?:rate|quota|limit|credit|billing)|api credits|HTTP 429)/i.test(error))return null;
  return <div className="rounded-xl border border-amber-500 bg-amber-50 p-4 text-amber-950" role="status">
    {wait&&<p className="font-bold">{limitMessage(wait.kind,wait.retryAt)} Retry available {new Date(wait.retryAt).toLocaleString()}.</p>}
    <p>Your completed work remains here. {practice}</p>
    <p>To use a different connected provider, choose it yourself below. Your next request will send the relevant lesson or practice content to that provider. The failed request will not be resent automatically.</p>
    <button type="button" className="mt-2 underline font-bold" onClick={onOpenProvider}>Choose a connected provider</button>
  </div>;
}
