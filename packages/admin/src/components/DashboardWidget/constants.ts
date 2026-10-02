/** Slots that plugins can use to add widgets to the Home overview. */
export const dashboardWidgetSlotPolicies = {
	"dashboard.widget": {
		surface: "dashboard",
		multiple: true,
		group: "dashboard.widget",
	},
} as const;

/** Widget widths, smallest first. Each spans part of a 12-column grid on wide screens. */
export const dashboardWidgetSizes = ["sm", "md", "lg", "full"] as const;
