import test from 'node:test';
import assert from 'node:assert/strict';
import { isEmailSyntaxValid, normalizeEmail } from '../src/lib/email.js';

test('normalizes email addresses', () => {
  assert.equal(normalizeEmail('  Chad@Example.COM  '), 'chad@example.com');
});

test('validates email syntax', () => {
  assert.equal(isEmailSyntaxValid('player@example.com'), true);
  assert.equal(isEmailSyntaxValid('not-an-email'), false);
});
