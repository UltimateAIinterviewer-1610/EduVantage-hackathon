import React from 'react';
import { createRoot } from 'react-dom/client';
import StudyLab from '../../components/StudyLab';
import { UiProvider } from '../../uiText';
import '../../styles.css';

if (new URLSearchParams(location.search).get('theme') === 'dark') document.documentElement.dataset.theme = 'dark';

createRoot(document.getElementById('root')!).render(
  <UiProvider language="en">
    <div className="app-shell flex h-screen">
      <aside className="w-20 shrink-0">EduVantage</aside>
      <main className="flex-1 overflow-y-auto"><StudyLab profileId="study-layout-preview" connection={{provider:'openai',key:'',source:'session'}} language="en" onOpenProvider={()=>{}}/></main>
    </div>
  </UiProvider>
);
