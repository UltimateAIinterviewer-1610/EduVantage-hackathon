import { expect, test } from 'vitest';
import { diagnosticSuffix, providerDiagnostics } from '../services/providerDiagnostics';
import { classifyLimit } from '../services/providerLimits';

test('only structured safe provider identifiers reach a learner',()=>{
 const details=providerDiagnostics({error:{type:'internal_error',message:'secret-key and lesson'}},new Headers({'x-request-id':'req_abcdef123456'}));
 expect(diagnosticSuffix(details)).toBe(' Error type: internal_error. Request ID: req_abcdef123456.');
 expect(diagnosticSuffix(providerDiagnostics({error:{type:'sk-secret-key',request_id:'private lesson'}},new Headers({'x-request-id':'private lesson'})))).toBe('');
});

test('an upstream 500 is not mislabeled as a billing error because of incidental wording',()=>{
 expect(classifyLimit(500,'billing worker unavailable')).toBeNull();
});
