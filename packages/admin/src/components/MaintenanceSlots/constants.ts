/** Slot that plugins use to add maintenance actions to System → Operations, such as rebuilding a search index. */
export const maintenanceSlotPolicies = {
	"maintenance.action": {
		surface: "maintenance",
		multiple: true,
		group: "maintenance.action",
	},
} as const;
