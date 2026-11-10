const STORAGE_KEY = "lucid_table_row_heights";
/** Fallback height for unmeasured single-line rows. */
export const DEFAULT_ROW_HEIGHT = 44;

const heights = new Map<string, number>();
let restored = false;

//* storage can be blocked or hold something unexpected, and the heights are only a hint
const restore = () => {
	if (restored) return;
	restored = true;

	try {
		const stored: unknown = JSON.parse(
			localStorage.getItem(STORAGE_KEY) ?? "{}",
		);
		if (typeof stored !== "object" || stored === null) return;

		for (const [id, height] of Object.entries(stored)) {
			if (typeof height === "number" && height > 0) heights.set(id, height);
		}
	} catch {}
};

/** Last measured row height, used for matching skeletons. */
export const readRowHeight = (tableId: string): number => {
	restore();
	return heights.get(tableId) ?? DEFAULT_ROW_HEIGHT;
};

/** Remembers a table's row height on this device. */
export const rememberRowHeight = (tableId: string, height: number) => {
	restore();
	if (heights.get(tableId) === height) return;
	heights.set(tableId, height);

	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(Object.fromEntries(heights)),
		);
	} catch {}
};
