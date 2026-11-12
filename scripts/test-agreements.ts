import test from 'node:test'
import strict from 'node:assert/strict'
import {
  fresh,
  validateTerm,
  validateWorkspace,
  emptyMoney,
  resolveDate,
  paymentStatus,
  mayReadLegal,
  executionBlockers,
  operativeTerms,
  type Term,
  type DateRule,
  type Payment,
} from '../src/lib/agreements/domain'
const source = { reference: 'SYNTHETIC contract A', locator: 'clause 2' }
const term: Term = {
  id: 't',
  field: 'consideration',
  state: 'UNKNOWN',
  status: 'PROPOSED',
  text: '',
  source: { reference: '', locator: '' },
  actorId: 'synthetic',
  createdAt: '2026-11-12',
}
test('all eight types and unavailable template boundary', () => {
  for (const type of [
    'ASSIGNMENT',
    'PITCH_SERVICES',
    'SHOWRUNNER',
    'CONCEPT_OPTION',
    'PILOT_OPTION',
    'LITERARY_OPTION',
    'SHOPPING',
    'OFFER',
  ] as const) {
    const w = fresh(type)
    validateWorkspace(w)
    strict.equal(w.templateVersion, null)
  }
  strict.throws(() => fresh('INVALID' as never))
  const w = fresh('ASSIGNMENT')
  w.templateVersion = 'invented'
  strict.throws(() => validateWorkspace(w))
})
test('unknown, zero, not-agreed and sourced assertions are distinct', () => {
  validateTerm(term, 'ASSIGNMENT')
  strict.throws(() =>
    validateTerm({ ...term, state: 'KNOWN', text: 'CAD 100' }, 'ASSIGNMENT'),
  )
  validateTerm({ ...term, state: 'ZERO', text: '0', source }, 'ASSIGNMENT')
  strict.throws(() =>
    validateTerm({ ...term, state: 'ZERO', text: '' }, 'ASSIGNMENT'),
  )
  validateTerm({ ...term, state: 'NOT_AGREED', source }, 'ASSIGNMENT')
  strict.throws(() =>
    validateTerm({ ...term, field: 'reserved_rights' }, 'ASSIGNMENT'),
  )
  strict.throws(() =>
    validateTerm(
      {
        ...term,
        state: 'KNOWN',
        text: 'Fee',
        source,
        money: { ...emptyMoney(), amount: '100', currency: 'CAD' },
      },
      'ASSIGNMENT',
    ),
  )
})
test('multi-owner allocations retain basis and cannot exceed 100%', () => {
  const t = {
    ...term,
    state: 'KNOWN' as const,
    text: 'Co-owned',
    source,
    allocations: [
      { partyId: 'one', share: '50', basis: 'purchase price gross', source },
      { partyId: 'two', share: '50', basis: 'purchase price gross', source },
    ],
  }
  validateTerm(t, 'ASSIGNMENT')
  strict.throws(() =>
    validateTerm(
      {
        ...t,
        allocations: [
          ...t.allocations,
          { partyId: 'three', share: '1', basis: 'gross', source },
        ],
      },
      'ASSIGNMENT',
    ),
  )
  strict.throws(() =>
    validateTerm(
      { ...t, percentage: { rate: '5', basis: '', definition: '' } },
      'ASSIGNMENT',
    ),
  )
})
test('execution blocks unsigned/unknown signatures and conditions; no substring inference', () => {
  const w = fresh('ASSIGNMENT')
  w.stage = 'COUNTERPARTY_SIGNED'
  strict.ok(executionBlockers(w).length >= 3)
  w.stage = 'EXECUTED_COPY_FILED'
  strict.throws(() => validateWorkspace(w))
  w.parties = [
    {
      id: 'p',
      name: 'Synthetic Party',
      role: 'Assignor',
      contactId: '',
      loanOut: '',
      agent: '',
      lawyer: '',
      payee: '',
      requiredSignature: true,
    },
  ]
  w.execution = {
    documentId: 'doc',
    signatures: [{ partyId: 'p', source }],
    effectiveBasis: source,
    conditions: 'UNKNOWN',
    conditionEvidence: source,
  }
  strict.ok(executionBlockers(w).some((s) => s.includes('Conditions')))
  w.execution.conditions = 'SATISFIED'
  validateWorkspace(w)
  strict.equal(fresh('ASSIGNMENT').stage, 'DISCUSSION')
})
test('proposed amendments never silently replace operative terms', () => {
  const w = fresh('ASSIGNMENT')
  w.terms = [
    {
      ...term,
      id: 'original',
      state: 'KNOWN',
      status: 'EXECUTED',
      text: '100',
      source,
    },
    {
      ...term,
      id: 'counter',
      supersedes: 'original',
      status: 'PROPOSED',
      state: 'KNOWN',
      text: '200',
      source,
    },
  ]
  strict.equal(operativeTerms(w)[0].text, '100')
  w.terms.push({ ...w.terms[1], id: 'amendment', status: 'EXECUTED' })
  strict.deepEqual(
    operativeTerms(w).map((t) => t.id),
    ['amendment'],
  )
})
const date = (id: string, partial: Partial<DateRule> = {}): DateRule => ({
  id,
  label: id,
  absolute: '',
  anchorId: '',
  offset: 0,
  rule: 'CALENDAR',
  timezone: 'America/Toronto',
  holidays: [],
  notice: 'written',
  owner: 'synthetic',
  source,
  reviewed: true,
  ...partial,
})
test('relative, business days, holidays, leap dates, cycles and unknown anchors', () => {
  const ds = [
    date('base', { absolute: '2026-11-13' }),
    date('biz', {
      anchorId: 'base',
      offset: 1,
      rule: 'BUSINESS',
      holidays: ['2026-11-16'],
    }),
    date('unknown', { anchorId: 'not-known', offset: 30 }),
    date('cycle-a', { anchorId: 'cycle-b' }),
    date('cycle-b', { anchorId: 'cycle-a' }),
  ]
  strict.equal(resolveDate('biz', ds), '2026-11-17')
  strict.equal(resolveDate('unknown', ds), null)
  strict.equal(resolveDate('cycle-a', ds), null)
  strict.equal(
    resolveDate('bad', [date('bad', { absolute: '2026-02-30' })]),
    null,
  )
  strict.equal(
    resolveDate('back', [
      date('back', { absolute: '2026-11-16', offset: -1, rule: 'BUSINESS' }),
    ]),
    '2026-11-13',
  )
})
test('compound conditions and currency rules never fabricate payable money', () => {
  const p: Payment = {
    id: 'p',
    label: 'fee',
    money: {
      ...emptyMoney(),
      amount: '0',
      currency: 'CAD',
      tax: 'exclusive',
      basis: 'flat',
    },
    payee: 'P',
    trigger: 'AND',
    conditions: [
      { label: 'delivery', state: 'MET', source },
      { label: 'approval', state: 'UNKNOWN', source },
    ],
    exclusions: '',
    offsets: 'none',
    dueDateId: '',
    state: 'DUE',
    paidEvidence: { reference: '', locator: '' },
    source,
  }
  strict.equal(paymentStatus(p), 'NEEDS_REVIEW')
  p.trigger = 'OR'
  strict.equal(paymentStatus(p), 'DUE')
  p.money.currencyRule = 'USD if foreign purchaser'
  strict.equal(paymentStatus(p), 'NEEDS_REVIEW')
  p.state = 'PAID'
  strict.equal(paymentStatus(p), 'NEEDS_REVIEW')
  p.paidEvidence = source
  strict.equal(paymentStatus(p), 'PAID')
})
test('exact private principals, empty allowlist and generic admin fail closed', () => {
  strict.equal(mayReadLegal('admin', {}), false)
  strict.equal(
    mayReadLegal('member', { AGREEMENTS_PHILIP_USER_ID: 'philip' }),
    false,
  )
  strict.equal(
    mayReadLegal('philip-agent', { AGREEMENTS_PHILIP_USER_ID: 'philip' }),
    false,
  )
  strict.equal(
    mayReadLegal('philip', { AGREEMENTS_PHILIP_USER_ID: 'philip' }),
    true,
  )
  strict.equal(
    mayReadLegal('mildred', { AGREEMENTS_MILDRED_USER_ID: 'mildred' }),
    true,
  )
})

test('calendar months/years require explicit end-of-month rules: Jan31 and leap anchors', () => {
  strict.equal(
    resolveDate('m', [
      date('m', {
        absolute: '2027-01-31',
        offset: 1,
        unit: 'MONTH',
        monthEnd: 'CLAMP',
      }),
    ]),
    '2027-02-28',
  )
  strict.equal(
    resolveDate('m', [
      date('m', {
        absolute: '2028-01-31',
        offset: 1,
        unit: 'MONTH',
        monthEnd: 'CLAMP',
      }),
    ]),
    '2028-02-29',
  )
  strict.equal(
    resolveDate('m', [
      date('m', {
        absolute: '2027-02-28',
        offset: 1,
        unit: 'MONTH',
        monthEnd: 'PRESERVE_END',
      }),
    ]),
    '2027-03-31',
  )
  strict.equal(
    resolveDate('m', [
      date('m', {
        absolute: '2027-02-28',
        offset: 1,
        unit: 'MONTH',
        monthEnd: 'CLAMP',
      }),
    ]),
    '2027-03-28',
  )
  strict.equal(
    resolveDate('m', [
      date('m', {
        absolute: '2027-01-31',
        offset: 1,
        unit: 'MONTH',
        monthEnd: 'REJECT',
      }),
    ]),
    null,
  )
  strict.equal(
    resolveDate('m', [
      date('m', {
        absolute: '2028-02-29',
        offset: 1,
        unit: 'YEAR',
        monthEnd: 'CLAMP',
      }),
    ]),
    '2029-02-28',
  )
  strict.equal(
    resolveDate('m', [
      date('m', {
        absolute: '2028-02-29',
        offset: 1,
        unit: 'YEAR',
        monthEnd: 'REJECT',
      }),
    ]),
    null,
  )
  strict.equal(
    resolveDate('m', [
      date('m', {
        absolute: '2027-01-31',
        offset: -1,
        unit: 'MONTH',
        monthEnd: 'PRESERVE_END',
      }),
    ]),
    '2026-12-31',
  )
  strict.equal(
    resolveDate('m', [
      date('m', { absolute: '2027-01-31', offset: 1, unit: 'MONTH' }),
    ]),
    null,
  )
  const w = fresh('ASSIGNMENT')
  w.dates = [date('m', { absolute: '2027-01-31', offset: 1, unit: 'MONTH' })]
  strict.throws(() => validateWorkspace(w))
})

import { intakeText } from '../src/lib/agreements/intake'
test('lawyer intake is human-readable and selects business fields only', () => {
  const w = fresh('ASSIGNMENT')
  w.terms = [{ ...term, state: 'ZERO', text: '0', source }]
  const preview = intakeText({
    notice: 'Business only',
    agreement: {
      title: 'Synthetic intake',
      project: { title: 'Synthetic project' },
    },
    workspace: w,
    documents: [],
    legal: { body: 'PRIVATE-CANARY' },
  } as never)
  strict.ok(preview.includes('consideration — ZERO; PROPOSED'))
  strict.ok(preview.includes('No email'))
  strict.ok(!preview.includes('PRIVATE-CANARY'))
  strict.ok(!preview.includes('"workspace"'))
})
