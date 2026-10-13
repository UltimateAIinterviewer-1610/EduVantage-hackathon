import { expect, test } from 'vitest';
import { providerFailure } from '../services/providerFailure';

test('quota, rate and billing failures give specific guidance without promising a bypass',()=>{
  const quota=providerFailure({code:429,message:'RESOURCE_EXHAUSTED: secret diagnostic'},'Connection interrupted');
  const billing=providerFailure({message:'Billing account requires payment'},'Connection interrupted');
  expect(quota).toContain('quota');
  expect(quota).not.toContain('secret diagnostic');
  expect(billing).toContain('billing');
  expect(quota).not.toMatch(/switch provider|bypass/i);
});
