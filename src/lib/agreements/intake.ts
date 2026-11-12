import {
  TYPE_LABELS,
  paymentStatus,
  resolveDate,
  type Workspace,
  type Money,
  type Source,
} from './domain'
export type BusinessIntake = {
  notice: string
  agreement: { title: string; project: { title: string } }
  workspace: Workspace | null
  documents: { name: string; hash: string; source: string }[]
}
const label = (s: string) =>
  s.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
const cite = (s: Source) =>
  `Source: ${s.reference || 'unknown'} / ${s.locator || 'no locator'}`
const money = (m: Money) =>
  Object.entries(m)
    .filter(([, v]) => v)
    .map(([k, v]) => `${label(k)}: ${v}`)
    .join('; ') || 'Amount / currency / basis unknown'
// Intentionally selects business fields; it cannot traverse Legal or arbitrary extras.
export function intakeText(d: BusinessIntake): string {
  const lines = [
    d.agreement.title,
    `Project: ${d.agreement.project.title}`,
    'BUSINESS-ONLY LAWYER INTAKE',
    d.notice,
    '',
  ]
  const w = d.workspace
  if (!w)
    return lines
      .concat(
        'Legacy workspace has not been reviewed. No operative terms inferred.',
      )
      .join('\n')
  lines.push(
    `Type: ${TYPE_LABELS[w.type]}`,
    `Stage: ${label(w.stage)}`,
    `Ball holder: ${w.ballHolder || 'unassigned'}; since ${w.ballSince || 'unknown'}`,
    `Next action: ${w.nextAction || 'not set'}`,
    `Internal approval: ${w.approval.decision}; ${w.approval.actorId || 'no reviewer'}; ${w.approval.at || 'no date'}`,
    cite(w.approval.source),
    '',
    'TEMPLATE LINEAGE',
    ...(w.templateLineage?.map(
      (t) => `${t.versionLabel}; SHA-256 ${t.hash}; selected ${t.selectedAt}`,
    ) || []),
    ...(!w.templateVersion
      ? ['No approved template selected; manual record.']
      : []),
    '',
    'PARTIES',
  )
  for (const p of w.parties)
    lines.push(
      `${p.name} — ${p.role}; ${p.requiredSignature ? 'signature required' : 'signature requirement not recorded'}`,
      `Loan-out: ${p.loanOut || 'not recorded'}; agent: ${p.agent || 'not recorded'}; lawyer: ${p.lawyer || 'not recorded'}; payee: ${p.payee || 'not recorded'}`,
    )
  lines.push('', 'TERMS — proposals are not operative terms')
  for (const t of w.terms) {
    lines.push(
      `${label(t.field)} — ${t.state}; ${t.status}`,
      t.text || 'Value not recorded',
    )
    if (t.money) lines.push(money(t.money))
    if (t.percentage)
      lines.push(
        `${t.percentage.rate}% of ${t.percentage.basis}; definition: ${t.percentage.definition}`,
      )
    for (const a of t.allocations || [])
      lines.push(
        `${w.parties.find((p) => p.id === a.partyId)?.name || 'Linked party'}: ${a.share}% of ${a.basis}; ${cite(a.source)}`,
      )
    if (t.supersedes)
      lines.push(
        'Amends the cited prior term; prior version retained in agreement history.',
      )
    lines.push(cite(t.source), '')
  }
  lines.push('OPTION / EXTENSION PERIODS')
  for (const p of w.periods)
    lines.push(
      `${p.label}: anchor ${p.anchor || 'unknown'}; duration ${p.duration || 'unknown'}`,
      money(p.fee),
      `Creditable: ${p.creditable}; notice/payment prerequisites: ${p.prerequisites || 'unknown'}; automatic extensions/limits: ${p.automaticExtension || 'unknown'}`,
      cite(p.source),
      '',
    )
  lines.push('NEGOTIATION ISSUES')
  for (const i of w.issues)
    lines.push(
      `${i.title} — ${i.state}`,
      `Ask: ${i.ask}; counter: ${i.counter}; current: ${i.current}; outcome: ${i.outcome || 'unresolved'}`,
      cite(i.source),
      '',
    )
  lines.push('RIGHTS CHECKS — not an automatic title clearance')
  for (const c of w.checks)
    lines.push(`${c.label}: ${c.state}; ${cite(c.source)}`)
  lines.push('', 'DATED OBLIGATIONS')
  for (const date of w.dates)
    lines.push(
      `${date.label}: ${resolveDate(date.id, w.dates) || 'unresolved; no fabricated due date'}; timezone ${date.timezone}; offset ${date.offset} ${date.unit || 'DAY'}; ${date.rule}; month-end policy ${date.monthEnd || 'not applicable'}`,
      `Owner: ${date.owner || 'unknown'}; notice mechanics: ${date.notice || 'unknown'}; holidays: ${date.holidays.join(', ') || 'none entered'}`,
      cite(date.source),
      '',
    )
  lines.push('PAYMENTS — no transfers; projected until paid evidence')
  for (const p of w.payments)
    lines.push(
      `${p.label}: ${paymentStatus(p)}; payee ${p.payee || 'unknown'}`,
      money(p.money),
      `${p.trigger} triggers: ${p.conditions.map((c) => `${c.label} [${c.state}]; ${cite(c.source)}`).join(' / ')}`,
      `Exclusions: ${p.exclusions || 'none stated'}; offsets: ${p.offsets || 'none stated'}`,
      cite(p.source),
      ...(p.state === 'PAID' ? [`Paid evidence: ${cite(p.paidEvidence)}`] : []),
      '',
    )
  lines.push(
    'BUSINESS NOTES',
    w.businessNotes || 'None recorded',
    '',
    'BUSINESS DOCUMENTS',
  )
  for (const file of d.documents)
    lines.push(`${file.name}; SHA-256 ${file.hash}; source ${file.source}`)
  lines.push(
    '',
    'Restricted advice, legal notes/files, sensitive identifiers and unclassified legacy attachments are excluded. No email or external notice was sent.',
  )
  return lines.join('\n')
}
