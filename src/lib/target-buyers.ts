export const targetBuyerRoleOptions = [
  { value: 'TARGET_BUYER', label: 'Target buyer' },
  { value: 'TARGET_BUYER_PITCH_TARGET', label: 'Pitch target' },
  { value: 'TARGET_BUYER_ACTIVE_CONVERSATION', label: 'Active conversation' },
  { value: 'TARGET_BUYER_DEVELOPING', label: 'Developing it' },
  { value: 'TARGET_BUYER_GREENLIGHT_TARGET', label: 'Greenlight target' },
  { value: 'TARGET_BUYER_POSSIBLE_FIT', label: 'Possible fit' },
] as const

export type TargetBuyerRole = (typeof targetBuyerRoleOptions)[number]['value']

const targetBuyerRoleLabels = Object.fromEntries(
  targetBuyerRoleOptions.map((option) => [option.value, option.label])
) as Record<TargetBuyerRole, string>

export function isTargetBuyerRole(role: string | null | undefined): boolean {
  return Boolean(role?.startsWith('TARGET_BUYER'))
}

export function normalizeTargetBuyerRole(role: string | null | undefined): TargetBuyerRole {
  if (role && role in targetBuyerRoleLabels) {
    return role as TargetBuyerRole
  }

  return 'TARGET_BUYER'
}

export function targetBuyerRoleLabel(role: string | null | undefined): string {
  return targetBuyerRoleLabels[normalizeTargetBuyerRole(role)]
}
