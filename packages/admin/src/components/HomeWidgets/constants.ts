/** Slots that plugins can use to add widgets to the Home overview. */
export const homeWidgetSlotPolicies = {
	"home.widget": {
		surface: "home",
		multiple: true,
		group: "home.widget",
	},
} as const;

/** Widths in ascending order across the 12-column grid on wide screens. */
export const homeWidgetSizes = ["sm", "md", "lg", "full"] as const;
