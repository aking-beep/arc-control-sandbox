import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompany } from '../src/company.mjs';

test('company fixtures are real mutable objects and can be reset', () => {
  const company=createCompany({executionToken:'secret',getHarness:()=>null,port:0});
  assert.equal(company.state().refunds.length,0);
  company.apply('finance.refund',{customer:'cus-101',amount:120});
  assert.equal(company.state().refunds.length,1);
  assert.equal(company.state().mutationLog.length,1);
  company.resetBusiness();
  assert.equal(company.state().refunds.length,0);
  assert.equal(company.state().mutationLog.length,0);
});

test('backend cannot accept unauthenticated action', async () => {
  const company=createCompany({executionToken:'secret',getHarness:()=>null,port:0});
  const address=await company.listen();
  try {
    const res=await fetch(`http://127.0.0.1:${address.port}/internal/finance/refund`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({customer:'cus-101',amount:120})});
    assert.equal(res.status,403);
    assert.equal(company.state().mutationLog.length,0);
  } finally {await company.close();}
});

test('valid connector credential is accepted only for declared internal operation', async () => {
  const company=createCompany({executionToken:'secret',getHarness:()=>null,port:0});
  const address=await company.listen();
  try {
    const res=await fetch(`http://127.0.0.1:${address.port}/internal/finance/refund`,{method:'POST',headers:{'content-type':'application/json','x-meridian-connector-token':'secret'},body:JSON.stringify({customer:'cus-101',amount:120})});
    assert.equal(res.status,200);
    assert.equal(company.state().refunds.length,1);
  } finally {await company.close();}
});
