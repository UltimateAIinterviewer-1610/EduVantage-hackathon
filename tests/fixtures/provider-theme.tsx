// Visual test fixture uses an empty profile and never calls an AI service.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import AIProviderDialog from '../../components/AIProviderDialog';
import ThemeSelector from '../../components/ThemeSelector';
import '../../styles.css';
function Preview() {
 const [open,setOpen]=useState(false);
 return <div className="app-shell min-h-screen"><main className="p-8"><ThemeSelector/><button className="primary-button ml-4" onClick={()=>setOpen(true)}>Open provider theme check</button></main>{open&&<AIProviderDialog profileId="provider-theme-visual-test" onClose={()=>setOpen(false)} onChanged={()=>{}}/>}</div>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
