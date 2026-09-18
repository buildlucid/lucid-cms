export const brickSlotKeys = {
	header: "brick.header",
	left: "brick.left",
	right: "brick.right",
	beforeFields: "brick.beforeFields",
	afterFields: "brick.afterFields",
} as const;

export const brickSlotPolicies = {
	[brickSlotKeys.header]: { multiple: true, group: brickSlotKeys.header },
	[brickSlotKeys.left]: { multiple: false, group: "brick.side" },
	[brickSlotKeys.right]: { multiple: false, group: "brick.side" },
	[brickSlotKeys.beforeFields]: {
		multiple: true,
		group: brickSlotKeys.beforeFields,
	},
	[brickSlotKeys.afterFields]: {
		multiple: true,
		group: brickSlotKeys.afterFields,
	},
} as const;
