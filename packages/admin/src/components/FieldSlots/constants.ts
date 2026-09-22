/** Slots that plugins can render into before or after a field. */
export const fieldSlotKeys = {
	before: "field.before",
	after: "field.after",
} as const;

export const fieldSlotPolicies = {
	[fieldSlotKeys.before]: { multiple: true, group: fieldSlotKeys.before },
	[fieldSlotKeys.after]: { multiple: true, group: fieldSlotKeys.after },
} as const;
