/** Slots that plugins can render into before or after a field. */
export const fieldSlotPolicies = {
	"field.before": { surface: "field", multiple: true, group: "field.before" },
	"field.after": { surface: "field", multiple: true, group: "field.after" },
} as const;
