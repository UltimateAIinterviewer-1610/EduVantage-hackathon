// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { extractPresentationFile, PRESENTATION_MAX_BYTES } from '../services/presentationUpload';
import PresentationCoach from '../components/PresentationCoach';
import { UiProvider } from '../uiText';
import { AIConnection } from '../services/aiConnection';
import { readPresentationAttempts } from '../services/presentationCoach';

// jsdom has no DOMMatrix, which pdfjs needs even for text extraction. Browser PDF
// parsing is exercised separately; this models its page text for UI-flow tests.
vi.mock('pdfjs-dist',()=>({
  GlobalWorkerOptions:{workerSrc:''},
  getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[
    {str:'Solar Energy',hasEOL:true},{str:'Panels turn sunlight into electricity',hasEOL:true},{str:'Storage supports use after dark',hasEOL:true},
  ]})})}),destroy:async()=>{}}),
}));

const noConnection:AIConnection={provider:'gemini',key:'',source:'none'};
const file=(name:string,bytes:Uint8Array|string)=>new File([typeof bytes==='string'?bytes:bytes as Uint8Array<ArrayBuffer>],name);
const fixture=(name:string)=>new Uint8Array(readFileSync(`tests/fixtures/coach.${name}`));
const examples=[['PDF','presentation.pdf',()=>fixture('pdf')],['PPTX','presentation.pptx',()=>fixture('pptx')],['DOCX','presentation.docx',()=>fixture('docx')]] as const;

beforeEach(()=>{localStorage.clear();vi.stubGlobal('fetch',vi.fn());});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

it.each(examples)('extracts editable title and key points from a %s file',async(_,name,create)=>{
  const extracted=await extractPresentationFile(file(name,create()));
  expect(extracted.title).toBe('Solar Energy');
  expect(extracted.keyPoints).toContain('Panels');
  expect(extracted.keyPoints).toContain('Storage');
  expect(fetch).not.toHaveBeenCalled();
});

it.each(examples)('uploads %s, allows editing, builds a plan, and saves a rehearsal without uploading document bytes',async(_,name,create)=>{
  const requests=vi.fn();vi.stubGlobal('fetch',requests);
  render(<UiProvider language="en"><PresentationCoach profileId="student" connection={noConnection} language="en" onOpenProvider={()=>{}}/></UiProvider>);
  expect(screen.getByLabelText('Presentation topic or title *')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Upload presentation'),{target:{files:[file(name,create())]}});
  await waitFor(()=>expect((screen.getByLabelText('Presentation topic or title *') as HTMLInputElement).value).toBe('Solar Energy'));
  expect((screen.getByLabelText('Key points or assignment requirements') as HTMLTextAreaElement).value).toContain('Panels');
  fireEvent.change(screen.getByLabelText('Key points or assignment requirements'),{target:{value:'Edited point\nStorage after dark'}});
  fireEvent.click(screen.getByRole('button',{name:/Build my practice plan/}));
  expect(screen.getByText('Edited point')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/Start rehearsal/}));
  fireEvent.change(screen.getByLabelText('Your rehearsal words'),{target:{value:'Hello, I will explain solar energy.'}});
  fireEvent.click(screen.getByRole('button',{name:/Next part/}));
  fireEvent.change(screen.getByLabelText('Your rehearsal words'),{target:{value:'Edited point, then storage after dark.'}});
  fireEvent.click(screen.getByRole('button',{name:/Next part/}));
  fireEvent.click(screen.getByRole('button',{name:/Next part/}));
  fireEvent.click(screen.getByRole('button',{name:/Finish & get feedback/}));
  expect(screen.getByText('One rehearsal closer to ready.')).toBeTruthy();
  expect(readPresentationAttempts('student')[0].brief.keyPoints).toBe('Edited point\nStorage after dark');
  expect(requests).not.toHaveBeenCalled();
});

it('keeps manual entry available when no file is chosen',()=>{
  render(<UiProvider language="en"><PresentationCoach profileId="student" connection={noConnection} language="en" onOpenProvider={()=>{}}/></UiProvider>);
  fireEvent.change(screen.getByLabelText('Presentation topic or title *'),{target:{value:'Manual topic'}});
  fireEvent.change(screen.getByLabelText('Key points or assignment requirements'),{target:{value:'My own point'}});
  fireEvent.click(screen.getByRole('button',{name:/Build my practice plan/}));
  expect(screen.getAllByText('My own point').length).toBeGreaterThan(0);
});

it('reports unsupported, zero-byte, oversized, and corrupt files without overwriting manual work',async()=>{
  const invalid=[
    [file('notes.txt','hello'),/PDF, PPTX or DOCX/],
    [file('empty.docx',''),/empty/],
    [file('large.pdf',new Uint8Array(PRESENTATION_MAX_BYTES+1)),/over 12 MB/],
    [file('broken.docx','not a zip'),/Could not extract text/],
  ] as const;
  render(<UiProvider language="en"><PresentationCoach profileId="student" connection={noConnection} language="en" onOpenProvider={()=>{}}/></UiProvider>);
  fireEvent.change(screen.getByLabelText('Presentation topic or title *'),{target:{value:'Manual topic'}});
  for(const [candidate,pattern] of invalid){
    fireEvent.change(screen.getByLabelText('Upload presentation'),{target:{files:[candidate]}});
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toMatch(pattern));
    expect((screen.getByLabelText('Presentation topic or title *') as HTMLInputElement).value).toBe('Manual topic');
  }
});

it('reports readable-text failure for a slides file with no text',async()=>{
  await expect(extractPresentationFile(file('image-only.pptx',fixture('image-only-pptx')))).rejects.toThrow(/No readable text/);
});
