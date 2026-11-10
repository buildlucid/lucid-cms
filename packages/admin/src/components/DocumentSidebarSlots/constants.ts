/** The document sidebar's built-in sections, top to bottom. Plugin sections go before or after one. */
export const documentSidebarSections = [
	"workflow",
	"requests",
	"details",
] as const;

/** Slot that plugins use to add sections to the document sidebar. */
export const documentSidebarSlotPolicies = {
	"document.sidebar": {
		surface: "documentSidebar",
		multiple: true,
		group: "document.sidebar",
	},
} as const;
