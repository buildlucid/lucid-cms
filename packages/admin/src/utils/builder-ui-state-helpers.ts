type CollapsibleStateTarget = {
	fieldKey: string;
	groupPath?: string;
	groupRef?: string;
	repeaterKey?: string;
};

type BuilderUIStateItem = {
	activeTab?: string;
	brickKey: string;
	brickOrder: number;
	collapsibleOpenByKey?: Record<string, boolean>;
	documentId: number;
	lastUpdated: number;
};

type BuilderUIStateStorage = {
	[collectionKey: string]: BuilderUIStateItem[];
};

const BUILDER_UI_STATE_KEY = "lucid_builder_ui_state";

const buildCollapsibleStateKey = (target: CollapsibleStateTarget): string => {
	const scope = target.groupRef
		? `group:${target.groupRef}`
		: target.groupPath
			? `path:${target.groupPath}`
			: "root";

	return [scope, target.repeaterKey, target.fieldKey].filter(Boolean).join(":");
};

const getStoredState = (): BuilderUIStateStorage => {
	const stored = localStorage.getItem(BUILDER_UI_STATE_KEY);
	return stored ? JSON.parse(stored) : {};
};

const setStoredState = (data: BuilderUIStateStorage) => {
	localStorage.setItem(BUILDER_UI_STATE_KEY, JSON.stringify(data));
};

const findStateItem = (
	collectionData: BuilderUIStateItem[],
	documentId: number,
	brickKey: string,
	brickOrder: number,
): BuilderUIStateItem | null => {
	const exactMatch = collectionData.find(
		(item) =>
			item.documentId === documentId &&
			item.brickKey === brickKey &&
			item.brickOrder === brickOrder,
	);
	if (exactMatch) return exactMatch;

	const brickItems = collectionData
		.filter(
			(item) => item.documentId === documentId && item.brickKey === brickKey,
		)
		.sort((a, b) => b.lastUpdated - a.lastUpdated);

	return brickItems[0] ?? null;
};

const upsertStateItem = (
	collectionData: BuilderUIStateItem[],
	nextItem: BuilderUIStateItem,
) => {
	const existingIndex = collectionData.findIndex(
		(item) =>
			item.documentId === nextItem.documentId &&
			item.brickKey === nextItem.brickKey &&
			item.brickOrder === nextItem.brickOrder,
	);

	if (existingIndex >= 0) {
		collectionData[existingIndex] = nextItem;
		return;
	}

	collectionData.push(nextItem);
};

export const builderUiStateHelpers = {
	/**
	 * Get the stored tab state for a specific brick
	 * If exact order match isn't found, tries to find the closest matching order
	 */
	getActiveTab(
		collectionKey: string,
		documentId: number,
		brickKey: string,
		brickOrder: number,
	): string | null {
		try {
			const data = getStoredState();
			const collectionData = data[collectionKey];
			if (!collectionData) return null;

			return (
				findStateItem(collectionData, documentId, brickKey, brickOrder)
					?.activeTab ?? null
			);
		} catch (error) {
			console.warn("Failed to get builder tab state from localStorage:", error);
			return null;
		}
	},

	/**
	 * Save the tab state for a specific brick
	 */
	setActiveTab(
		collectionKey: string,
		documentId: number,
		brickKey: string,
		brickOrder: number,
		activeTab: string,
	): void {
		try {
			const data = getStoredState();

			if (!data[collectionKey]) {
				data[collectionKey] = [];
			}

			const existingItem = findStateItem(
				data[collectionKey],
				documentId,
				brickKey,
				brickOrder,
			);

			const newItem: BuilderUIStateItem = {
				...existingItem,
				activeTab,
				brickKey,
				brickOrder,
				documentId,
				lastUpdated: Date.now(),
			};

			upsertStateItem(data[collectionKey], newItem);

			setStoredState(data);
		} catch (error) {
			console.warn("Failed to save builder tab state to localStorage:", error);
		}
	},

	getCollapsibleOpen(
		collectionKey: string,
		documentId: number,
		brickKey: string,
		brickOrder: number,
		target: CollapsibleStateTarget,
	): boolean | null {
		try {
			const data = getStoredState();
			const collectionData = data[collectionKey];
			if (!collectionData) return null;

			const item = findStateItem(
				collectionData,
				documentId,
				brickKey,
				brickOrder,
			);
			if (!item?.collapsibleOpenByKey) return null;

			const open = item.collapsibleOpenByKey[buildCollapsibleStateKey(target)];
			return typeof open === "boolean" ? open : null;
		} catch (error) {
			console.warn(
				"Failed to get builder collapsible state from localStorage:",
				error,
			);
			return null;
		}
	},

	setCollapsibleOpen(
		collectionKey: string,
		documentId: number,
		brickKey: string,
		brickOrder: number,
		target: CollapsibleStateTarget,
		open: boolean,
	): void {
		try {
			const data = getStoredState();

			if (!data[collectionKey]) {
				data[collectionKey] = [];
			}

			const existingItem = findStateItem(
				data[collectionKey],
				documentId,
				brickKey,
				brickOrder,
			);

			const newItem: BuilderUIStateItem = {
				...existingItem,
				brickKey,
				brickOrder,
				collapsibleOpenByKey: {
					...(existingItem?.collapsibleOpenByKey ?? {}),
					[buildCollapsibleStateKey(target)]: open,
				},
				documentId,
				lastUpdated: Date.now(),
			};

			upsertStateItem(data[collectionKey], newItem);
			setStoredState(data);
		} catch (error) {
			console.warn(
				"Failed to save builder collapsible state to localStorage:",
				error,
			);
		}
	},

	/**
	 * Update brick orders when they change (e.g., during drag and drop)
	 */
	updateBrickOrders(
		collectionKey: string,
		documentId: number,
		brickOrderMap: Record<string, number>,
	): void {
		try {
			const data = getStoredState();
			const collectionData = data[collectionKey];
			if (!collectionData) return;

			//* update orders for existing bricks in this document
			for (const item of collectionData) {
				if (item.documentId === documentId) {
					const newOrder = brickOrderMap[item.brickKey];
					if (newOrder !== undefined) {
						item.brickOrder = newOrder;
						item.lastUpdated = Date.now();
					}
				}
			}

			//* remove duplicate entries for the same document, brick key and order
			const uniqueItems = new Map<string, BuilderUIStateItem>();
			for (const item of collectionData) {
				const key = `${item.documentId}-${item.brickKey}-${item.brickOrder}`;
				const existingItem = uniqueItems.get(key);
				if (!existingItem || existingItem.lastUpdated < item.lastUpdated) {
					uniqueItems.set(key, item);
				}
			}

			data[collectionKey] = Array.from(uniqueItems.values());

			setStoredState(data);
		} catch (error) {
			console.warn(
				"Failed to update builder UI state brick orders in localStorage:",
				error,
			);
		}
	},

	/**
	 * Clean up old builder UI state entries (older than 30 days)
	 */
	cleanupOldEntries(): void {
		try {
			const data = getStoredState();
			const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

			for (const collectionKey in data) {
				data[collectionKey] = data[collectionKey].filter(
					(item) => item.lastUpdated > thirtyDaysAgo,
				);

				//* remove empty collection arrays
				if (data[collectionKey].length === 0) {
					delete data[collectionKey];
				}
			}

			setStoredState(data);
		} catch (error) {
			console.warn("Failed to cleanup old builder UI state entries:", error);
		}
	},

	/**
	 * Remove all builder UI state for a specific collection
	 */
	clearCollectionState(collectionKey: string): void {
		try {
			const data = getStoredState();
			delete data[collectionKey];

			setStoredState(data);
		} catch (error) {
			console.warn("Failed to clear collection builder UI state:", error);
		}
	},

	/**
	 * Remove all builder UI state for a specific document
	 */
	clearDocumentState(collectionKey: string, documentId: number): void {
		try {
			const data = getStoredState();
			const collectionData = data[collectionKey];
			if (!collectionData) return;

			//* remove all entries for this document
			data[collectionKey] = collectionData.filter(
				(item) => item.documentId !== documentId,
			);

			//* remove empty collection arrays
			if (data[collectionKey].length === 0) {
				delete data[collectionKey];
			}

			setStoredState(data);
		} catch (error) {
			console.warn("Failed to clear document builder UI state:", error);
		}
	},
};
