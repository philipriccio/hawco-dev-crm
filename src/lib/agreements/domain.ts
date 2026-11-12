// Shared, pure domain rules. No sources or private records are bundled in the client.
export const TYPES = [
  'ASSIGNMENT',
  'PITCH_SERVICES',
  'SHOWRUNNER',
  'CONCEPT_OPTION',
  'PILOT_OPTION',
  'LITERARY_OPTION',
  'SHOPPING',
  'OFFER',
] as const
export type DealType = (typeof TYPES)[number]
export const TYPE_LABELS: Record<DealType, string> = {
  ASSIGNMENT: 'Rights assignment',
  PITCH_SERVICES: 'Bible / pitch services',
  SHOWRUNNER: 'Senior writer / showrunner',
  CONCEPT_OPTION: 'Concept option',
  PILOT_OPTION: 'Pilot option & purchase',
  LITERARY_OPTION: 'Literary option & purchase',
  SHOPPING: 'Shopping',
  OFFER: 'Offer / deal memo',
}
export const STAGES = [
  'DISCUSSION',
  'EMAIL_TERMS_AGREED',
  'INTERNAL_APPROVAL',
  'TEMPLATE_DRAFT',
  'LAWYER_REVIEW',
  'OUT_TO_COUNTERPARTY',
  'REDLINES',
  'COUNTERPARTY_SIGNED',
  'COUNTERSIGNED',
  'EXECUTED_COPY_FILED',
] as const
export const COMMON_FIELDS = [
  'legal_entity',
  'materials_version_scope',
  'currency_tax',
  'effective_date',
  'signature_dates',
  'conditions_precedent',
]
export const TYPE_FIELDS: Record<DealType, string[]> = {
  ASSIGNMENT: [
    'assignor_assignee',
    'covered_contributions',
    'consideration',
    'grant_territory_duration',
    'moral_rights',
    'employment_loanout_basis',
    'signatures_capacity',
    'supporting_title_documents',
  ],
  PITCH_SERVICES: [
    'union_ipa_edition_article',
    'format_length',
    'materials',
    'deliverables_drafts_polish',
    'delivery_dates',
    'fees_installments',
    'development_production_bonuses_offsets',
    'rofr_rofn_scope_windows',
    'services_approvals',
    'credit',
    'availability_exclusivity',
    'delivered_work_rights_reversion',
  ],
  SHOWRUNNER: [
    'services_season_episodes',
    'prep_production_post_term',
    'priority',
    'weekly_episodic_flat_fees',
    'options_escalators',
    'credit',
    'backend',
    'approval_suspension',
  ],
  CONCEPT_OPTION: [
    'exercise_events',
    'purchase',
    'future_engagements_conditions',
    'credits',
    'royalty_proration_offsets',
    'backend_accounting',
    'reserved_rights',
    'reversion',
    'automatic_extensions_limits',
  ],
  PILOT_OPTION: [
    'shopping_period',
    'pitched_buyer_protections',
    'purchase_formula_ipa_floor_cap',
    'coowner_shares_allocations',
    'development_ownership_services',
    'short_forms',
  ],
  LITERARY_OPTION: [
    'author_owner_publisher',
    'works_publication',
    'release_conditions',
    'purchase_budget_exclusions_currency',
    'episodic_derivative_royalties',
    'backend_accounting',
    'consulting_ep_source_credit',
    'reservations',
    'exercise_reversion_rolling_clocks',
    'short_forms_author_loanout_assignments',
  ],
  SHOPPING: [
    'scope_exclusivity',
    'period',
    'fee_or_no_fee',
    'buyers',
    'development_trigger',
    'buyer_extensions_tail',
    'later_option_services',
    'reversion',
  ],
  OFFER: [
    'sender_recipient',
    'offer_date_expiry',
    'offers_counters',
    'reservations_approval',
    'acceptance_binding_characterization',
    'eventual_agreement_supersession',
  ],
}
export type Source = { reference: string; locator: string }
export type Money = {
  amount: string
  currency: string
  tax: string
  basis: string
  exclusions: string
  floor: string
  cap: string
  credits: string
  formula: string
  inputs: string
  currencyRule: string
}
export type Term = {
  id: string
  field: string
  state: 'UNKNOWN' | 'ZERO' | 'NOT_APPLICABLE' | 'NOT_AGREED' | 'KNOWN'
  status: 'PROPOSED' | 'AGREED' | 'EXECUTED'
  text: string
  money?: Money
  percentage?: { rate: string; basis: string; definition: string }
  allocations?: {
    partyId: string
    share: string
    basis: string
    source: Source
  }[]
  source: Source
  supersedes?: string
  createdAt: string
  actorId: string
}
export type Party = {
  id: string
  name: string
  role: string
  contactId: string
  loanOut: string
  agent: string
  lawyer: string
  payee: string
  requiredSignature: boolean
}
export type Period = {
  id: string
  label: string
  anchor: string
  duration: string
  fee: Money
  creditable: 'UNKNOWN' | 'YES' | 'NO'
  prerequisites: string
  automaticExtension: string
  source: Source
}
export type DateRule = {
  id: string
  label: string
  absolute: string
  anchorId: string
  offset: number
  unit?: 'DAY' | 'MONTH' | 'YEAR'
  monthEnd?: 'CLAMP' | 'PRESERVE_END' | 'REJECT'
  rule: 'CALENDAR' | 'BUSINESS'
  timezone: string
  holidays: string[]
  notice: string
  owner: string
  source: Source
  reviewed: boolean
}
export type Payment = {
  id: string
  label: string
  money: Money
  payee: string
  trigger: 'AND' | 'OR'
  conditions: {
    label: string
    state: 'UNKNOWN' | 'MET' | 'NOT_MET'
    source: Source
  }[]
  exclusions: string
  offsets: string
  dueDateId: string
  state: 'CONTINGENT' | 'NEEDS_REVIEW' | 'DUE' | 'PAID'
  paidEvidence: Source
  source: Source
}
export type Issue = {
  id: string
  title: string
  ask: string
  counter: string
  current: string
  outcome: string
  state: 'OPEN' | 'RESOLVED'
  source: Source
  history: { at: string; actorId: string; state: string; outcome: string }[]
}
export type Check = {
  id: string
  label: string
  state: 'UNKNOWN' | 'OPEN' | 'CONFIRMED'
  source: Source
}
export type Workspace = {
  type: DealType
  stage: (typeof STAGES)[number]
  templateVersion: string | null
  templateStatus: 'UNAVAILABLE' | 'APPROVED'
  templateLineage?: {
    id: string
    versionLabel: string
    hash: string
    selectedAt: string
  }[]
  ballHolder: string
  ballSince: string
  nextAction: string
  businessNotes: string
  ipIds: string[]
  parties: Party[]
  terms: Term[]
  periods: Period[]
  dates: DateRule[]
  payments: Payment[]
  issues: Issue[]
  checks: Check[]
  approval: {
    decision: 'UNKNOWN' | 'APPROVED' | 'DECLINED'
    actorId: string
    at: string
    source: Source
  }
  execution: {
    documentId: string
    signatures: { partyId: string; source: Source }[]
    effectiveBasis: Source
    conditions: 'UNKNOWN' | 'OPEN' | 'SATISFIED'
    conditionEvidence: Source
  } | null
  leadDays: number[]
}
export class DealError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DealError(400, message)
}
function strings(obj: object, keys: string[]) {
  for (const key of keys)
    assert(
      typeof (obj as Record<string, unknown>)[key] === 'string',
      `Text required for ${key}`,
    )
}
export function sourceValid(s: Source | undefined) {
  return Boolean(
    s &&
      typeof s.reference === 'string' &&
      s.reference.trim() &&
      typeof s.locator === 'string' &&
      s.locator.trim(),
  )
}
export function emptyMoney(): Money {
  return {
    amount: '',
    currency: '',
    tax: '',
    basis: '',
    exclusions: '',
    floor: '',
    cap: '',
    credits: '',
    formula: '',
    inputs: '',
    currencyRule: '',
  }
}
export function fresh(type: DealType): Workspace {
  assert(TYPES.includes(type), 'Invalid agreement type')
  return {
    type,
    stage: 'DISCUSSION',
    templateVersion: null,
    templateStatus: 'UNAVAILABLE',
    templateLineage: [],
    ballHolder: '',
    ballSince: '',
    nextAction: '',
    businessNotes: '',
    ipIds: [],
    parties: [],
    terms: [],
    periods: [],
    dates: [],
    payments: [],
    issues: [],
    checks: [],
    approval: {
      decision: 'UNKNOWN',
      actorId: '',
      at: '',
      source: { reference: '', locator: '' },
    },
    execution: null,
    leadDays: [90, 60, 30, 7],
  }
}
export function validateMoney(m: Money, zero = false) {
  assert(m && typeof m === 'object', 'Structured money required')
  strings(m, Object.keys(emptyMoney()))
  assert(
    m.amount === '' || /^\d+(\.\d{1,4})?$/.test(m.amount),
    'Amount must be a nonnegative decimal, not a formula',
  )
  if (m.amount !== '' || m.formula) {
    assert(
      /^[A-Z]{3}$/.test(m.currency),
      'Explicit three-letter currency required',
    )
    assert(Boolean(m.tax.trim()), 'Explicit tax treatment required')
    assert(Boolean(m.basis.trim()), 'Money / percentage basis required')
  }
  if (zero)
    assert(
      m.amount === '0' || /^0\.0+$/.test(m.amount),
      'Zero must be explicit zero',
    )
  if (m.formula)
    assert(Boolean(m.inputs && m.basis), 'Formula requires inputs and basis')
}
export function validateTerm(t: Term, type: DealType) {
  strings(t, ['field', 'state', 'status', 'text'])
  assert(
    t && [...COMMON_FIELDS, ...TYPE_FIELDS[type]].includes(t.field),
    'Field is not valid for agreement type',
  )
  assert(
    ['UNKNOWN', 'ZERO', 'NOT_APPLICABLE', 'NOT_AGREED', 'KNOWN'].includes(
      t.state,
    ),
    'Invalid value state',
  )
  assert(
    ['PROPOSED', 'AGREED', 'EXECUTED'].includes(t.status),
    'Invalid term status',
  )
  if (t.state !== 'UNKNOWN')
    assert(
      sourceValid(t.source),
      'Every asserted term requires reference and page/clause/message locator',
    )
  if (t.state === 'KNOWN')
    assert(
      Boolean(t.text.trim() || t.money?.amount || t.money?.formula),
      'Known value required',
    )
  if (
    t.percentage ||
    t.allocations ||
    (t.money && Object.values(t.money).some(Boolean))
  )
    assert(
      sourceValid(t.source),
      'Structured money/percentage/allocation assertions require evidence even when the amount is unknown',
    )
  if (t.percentage) {
    assert(
      /^\d+(\.\d+)?$/.test(t.percentage.rate) &&
        Number(t.percentage.rate) <= 100,
      'Percentage must be 0–100',
    )
    assert(
      t.percentage.basis && t.percentage.definition,
      'Percentage basis and definition required',
    )
  }
  if (t.allocations) {
    assert(t.allocations.length <= 100, 'Too many allocations')
    for (const a of t.allocations) {
      assert(
        a.partyId &&
          /^\d+(\.\d+)?$/.test(a.share) &&
          Number(a.share) <= 100 &&
          a.basis &&
          sourceValid(a.source),
        'Each allocation needs party, share, basis and source',
      )
    }
    assert(
      t.allocations.reduce((n, a) => n + Number(a.share), 0) <= 100.000001,
      'Allocations exceed 100%',
    )
  }
  if (t.money) validateMoney(t.money, t.state === 'ZERO')
  else if (t.state === 'ZERO')
    assert(t.text.trim() === '0', 'Zero must be stored explicitly')
  if (t.status === 'EXECUTED')
    assert(sourceValid(t.source), 'Executed term needs evidence')
}
export function operativeTerms(w: Workspace) {
  const replaced = new Set(
    w.terms.filter((t) => t.status === 'EXECUTED').map((t) => t.supersedes),
  )
  return w.terms.filter((t) => t.status === 'EXECUTED' && !replaced.has(t.id))
}
export function executionBlockers(w: Workspace) {
  const e = w.execution
  const out: string[] = []
  if (!e?.documentId) out.push('Choose the immutable executed document')
  if (!w.parties.some((p) => p.requiredSignature))
    out.push('Identify required signatories')
  for (const p of w.parties.filter((p) => p.requiredSignature))
    if (!e?.signatures.some((s) => s.partyId === p.id && sourceValid(s.source)))
      out.push(`Signature evidence missing: ${p.name}`)
  if (!sourceValid(e?.effectiveBasis)) out.push('Effective-date basis missing')
  if (e?.conditions !== 'SATISFIED' || !sourceValid(e?.conditionEvidence))
    out.push('Conditions precedent not reviewed and satisfied')
  return out
}
export function resolveDate(
  id: string,
  dates: DateRule[],
  seen = new Set<string>(),
): string | null {
  if (seen.has(id)) return null
  seen.add(id)
  const d = dates.find((x) => x.id === id)
  if (!d || !d.reviewed) return null
  const base = d.absolute || resolveDate(d.anchorId, dates, seen)
  if (!base || !/^\d{4}-\d{2}-\d{2}$/.test(base)) return null
  const date = new Date(base + 'T12:00:00Z')
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== base
  )
    return null
  if (d.unit === 'MONTH' || d.unit === 'YEAR') {
    if (!d.monthEnd || d.rule !== 'CALENDAR') return null
    const day = date.getUTCDate()
    const oldLast = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12),
    ).getUTCDate()
    const targetMonth =
      date.getUTCMonth() + d.offset * (d.unit === 'YEAR' ? 12 : 1)
    date.setUTCDate(1)
    date.setUTCMonth(targetMonth)
    const last = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12),
    ).getUTCDate()
    if (d.monthEnd === 'REJECT' && day > last) return null
    date.setUTCDate(
      d.monthEnd === 'PRESERVE_END' && day === oldLast
        ? last
        : Math.min(day, last),
    )
  } else {
    let left = Math.abs(d.offset)
    const sign = d.offset < 0 ? -1 : 1
    while (left) {
      date.setUTCDate(date.getUTCDate() + sign)
      if (
        d.rule === 'CALENDAR' ||
        (![0, 6].includes(date.getUTCDay()) &&
          !d.holidays.includes(date.toISOString().slice(0, 10)))
      )
        left--
    }
  }
  return date.toISOString().slice(0, 10)
}
export function paymentStatus(p: Payment) {
  if (p.state === 'PAID')
    return sourceValid(p.paidEvidence) ? 'PAID' : 'NEEDS_REVIEW'
  if (!p.conditions.length) return 'NEEDS_REVIEW'
  const states = p.conditions.map((c) =>
    sourceValid(c.source) ? c.state : 'UNKNOWN',
  )
  const met =
    p.trigger === 'AND'
      ? states.every((s) => s === 'MET')
      : states.some((s) => s === 'MET')
  if (!met) return states.includes('UNKNOWN') ? 'NEEDS_REVIEW' : 'CONTINGENT'
  if (
    p.money.currencyRule ||
    p.money.amount === '' ||
    p.money.formula ||
    p.exclusions
  )
    return 'NEEDS_REVIEW'
  return p.state === 'DUE' ? 'DUE' : 'CONTINGENT'
}
export function validateWorkspace(w: Workspace) {
  strings(w, [
    'type',
    'stage',
    'ballHolder',
    'ballSince',
    'nextAction',
    'businessNotes',
  ])
  assert(
    Array.isArray(w.ipIds) &&
      Array.isArray(w.parties) &&
      Array.isArray(w.terms) &&
      Array.isArray(w.periods) &&
      Array.isArray(w.dates) &&
      Array.isArray(w.payments) &&
      Array.isArray(w.issues) &&
      Array.isArray(w.checks) &&
      Array.isArray(w.leadDays),
    'Invalid workspace collections',
  )
  for (const p of w.parties)
    strings(p, [
      'id',
      'name',
      'role',
      'contactId',
      'loanOut',
      'agent',
      'lawyer',
      'payee',
    ])
  for (const i of w.issues) {
    strings(i, ['id', 'title', 'ask', 'counter', 'current', 'outcome'])
    assert(sourceValid(i.source), 'Issue evidence required')
  }
  assert(TYPES.includes(w.type), 'Invalid type')
  assert(STAGES.includes(w.stage), 'Invalid stage')
  assert(
    (w.templateVersion === null && w.templateStatus === 'UNAVAILABLE') ||
      (typeof w.templateVersion === 'string' &&
        w.templateStatus === 'APPROVED' &&
        w.templateLineage?.some((t) => t.id === w.templateVersion)),
    'Valid selected template lineage or explicit unavailable state required',
  )
  assert(
    w.parties.every(
      (p) =>
        typeof p.requiredSignature === 'boolean' && p.name && p.role && p.id,
    ),
    'Invalid party',
  )
  assert(
    new Set(w.parties.map((p) => p.id)).size === w.parties.length,
    'Duplicate party IDs',
  )
  assert(
    w.terms.every(
      (t) =>
        !t.allocations ||
        t.allocations.every((a) => w.parties.some((p) => p.id === a.partyId)),
    ),
    'Allocation party is not linked',
  )
  assert(
    w.terms.length <= 500 &&
      w.parties.length <= 100 &&
      w.periods.length <= 100 &&
      w.dates.length <= 200,
    'Record limit exceeded',
  )
  w.terms.forEach((t) => validateTerm(t, w.type))
  for (const p of w.periods) {
    strings(p, [
      'id',
      'label',
      'anchor',
      'duration',
      'prerequisites',
      'automaticExtension',
    ])
    assert(
      ['UNKNOWN', 'YES', 'NO'].includes(p.creditable),
      'Invalid creditability',
    )
    validateMoney(p.fee)
    assert(sourceValid(p.source), 'Period evidence required')
  }
  for (const d of w.dates) {
    strings(d, [
      'id',
      'label',
      'absolute',
      'anchorId',
      'timezone',
      'notice',
      'owner',
    ])
    assert(
      typeof d.reviewed === 'boolean' && Array.isArray(d.holidays),
      'Date review/calendar required',
    )
    assert(
      Number.isInteger(d.offset) && Math.abs(d.offset) <= 36500,
      'Invalid date offset',
    )
    assert(['CALENDAR', 'BUSINESS'].includes(d.rule), 'Invalid day rule')
    assert(
      d.unit === undefined || ['DAY', 'MONTH', 'YEAR'].includes(d.unit),
      'Invalid date unit',
    )
    if (d.unit === 'MONTH' || d.unit === 'YEAR') {
      assert(
        ['CLAMP', 'PRESERVE_END', 'REJECT'].includes(d.monthEnd || ''),
        'Explicit month-end policy required',
      )
      assert(
        d.rule === 'CALENDAR',
        'Month/year arithmetic uses calendar rules; add a separate business-day offset if needed',
      )
      assert(
        Math.abs(d.offset) <= (d.unit === 'YEAR' ? 100 : 1200),
        'Month/year offset exceeds 100 years',
      )
    }
    try {
      new Intl.DateTimeFormat('en', { timeZone: d.timezone })
    } catch {
      throw new DealError(400, 'Valid timezone required')
    }
    assert(
      d.holidays.every((h) => /^\d{4}-\d{2}-\d{2}$/.test(h)),
      'Holiday dates must be YYYY-MM-DD',
    )
    assert(
      !(d.absolute && d.anchorId),
      'Choose either absolute or relative anchor',
    )
    assert(sourceValid(d.source), 'Date source required')
  }
  for (const p of w.payments) {
    strings(p, ['id', 'label', 'payee', 'exclusions', 'offsets', 'dueDateId'])
    assert(Array.isArray(p.conditions), 'Trigger conditions required')
    for (const c of p.conditions) strings(c, ['label', 'state'])
    assert(
      ['CONTINGENT', 'NEEDS_REVIEW', 'DUE', 'PAID'].includes(p.state),
      'Invalid payment state',
    )
    assert(
      p.conditions.every((c) =>
        ['UNKNOWN', 'MET', 'NOT_MET'].includes(c.state),
      ),
      'Invalid condition state',
    )
    validateMoney(p.money)
    assert(['AND', 'OR'].includes(p.trigger), 'Invalid trigger')
    assert(sourceValid(p.source), 'Payment source required')
    if (p.state === 'PAID')
      assert(sourceValid(p.paidEvidence), 'Paid evidence required')
    if (p.state === 'DUE')
      assert(
        paymentStatus(p) === 'DUE',
        'Unresolved payment cannot be marked due',
      )
  }
  for (const c of w.checks) {
    strings(c, ['id', 'label'])
    assert(
      ['UNKNOWN', 'OPEN', 'CONFIRMED'].includes(c.state),
      'Invalid rights check state',
    )
    if (c.state === 'CONFIRMED')
      assert(sourceValid(c.source), 'Confirmed rights check needs evidence')
  }
  assert(
    w.leadDays.length <= 12 &&
      w.leadDays.every((n) => Number.isInteger(n) && n >= 0 && n <= 365),
    'Invalid reminder lead times',
  )
  if (w.stage === 'EXECUTED_COPY_FILED')
    assert(executionBlockers(w).length === 0, executionBlockers(w).join('; '))
}
export function mayReadLegal(
  id: string,
  env: Record<string, string | undefined> = process.env,
) {
  const ids = [
    env.AGREEMENTS_PHILIP_USER_ID,
    env.AGREEMENTS_MILDRED_USER_ID,
  ].filter(Boolean)
  return Boolean(id && ids.includes(id))
}
