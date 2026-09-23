/** Slots that plugins can render into on each brick. */
export const brickSlotPolicies = {
	"brick.header": {
		surface: "brick",
		multiple: true,
		group: "brick.header",
	},
	"brick.start": { surface: "brick", multiple: false, group: "brick.side" },
	"brick.end": { surface: "brick", multiple: false, group: "brick.side" },
	"brick.beforeFields": {
		surface: "brick",
		multiple: true,
		group: "brick.beforeFields",
	},
	"brick.afterFields": {
		surface: "brick",
		multiple: true,
		group: "brick.afterFields",
	},
} as const;
