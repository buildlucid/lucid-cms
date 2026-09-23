/** Slots that plugins can use to add document list columns or replace field cells. */
export const documentListSlotPolicies = {
	"documentList.column": {
		surface: "documentList",
		multiple: true,
		group: "documentList.column",
	},
	"field.cell": {
		surface: "documentList",
		multiple: false,
		group: "field.cell",
	},
} as const;
