/** Slots that plugins can use to add or replace document table columns. */
export const documentSlotKeys = {
	columnAddition: "document.columnAddition",
	columnOverride: "document.columnOverride",
} as const;

export const documentSlotPolicies = {
	[documentSlotKeys.columnAddition]: {
		multiple: true,
		group: documentSlotKeys.columnAddition,
	},
	[documentSlotKeys.columnOverride]: {
		multiple: false,
		group: documentSlotKeys.columnOverride,
	},
} as const;
