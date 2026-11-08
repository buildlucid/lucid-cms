/** Slots that plugins can render into for a field: in place of its input, or before or after it. */
export const fieldSlotPolicies = {
	"field.input": { surface: "field", multiple: false, group: "field.input" },
	"field.before": { surface: "field", multiple: true, group: "field.before" },
	"field.after": { surface: "field", multiple: true, group: "field.after" },
} as const;
