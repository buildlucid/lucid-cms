type TabStateItem = {
	activeTab: string;
	brickKey: string;
	brickOrder: number;
	documentId: number;
	lastUpdated: number;
};

type TabStateStorage = {
	[collectionKey: string]: TabStateItem[];
};

const TAB_STATE_KEY = "lucid_tab_state";

export const tabStateHelpers = {
	/**
	 * Get the stored tab state for a specific brick
	 * If exact order match isn't found, tries to find the closest matching order
	 */
	getTabState(
		collectionKey: string,
		documentId: number,
		brickKey: string,
		brickOrder: number,
	): string | null {
		try {
			const stored = localStorage.getItem(TAB_STATE_KEY);
			if (!stored) return null;

			const data: TabStateStorage = JSON.parse(stored);
			const collectionData = data[collectionKey];
			if (!collectionData) return null;

			//* try exact match
			const exactMatch = collectionData.find(
				(item) =>
					item.documentId === documentId &&
					item.brickKey === brickKey &&
					item.brickOrder === brickOrder,
			);
			if (exactMatch) return exactMatch.activeTab;

			//* if no exact match, find the most recent entry for this document and brick key
			const brickItems = collectionData
				.filter(
					(item) =>
						item.documentId === documentId && item.brickKey === brickKey,
				)
				.sort((a, b) => b.lastUpdated - a.lastUpdated);

			return brickItems.length > 0 ? brickItems[0].activeTab : null;
		} catch (error) {
			console.warn("Failed to get tab state from localStorage:", error);
			return null;
		}
	},

	/**
	 * Save the tab state for a specific brick
	 */
	setTabState(
		collectionKey: string,
		documentId: number,
		brickKey: string,
		brickOrder: number,
		activeTab: string,
	): void {
		try {
			const stored = localStorage.getItem(TAB_STATE_KEY);
			const data: TabStateStorage = stored ? JSON.parse(stored) : {};

			if (!data[collectionKey]) {
				data[collectionKey] = [];
			}

			const existingIndex = data[collectionKey].findIndex(
				(item) =>
					item.documentId === documentId &&
					item.brickKey === brickKey &&
					item.brickOrder === brickOrder,
			);

			const newItem: TabStateItem = {
				activeTab,
				brickKey,
				brickOrder,
				documentId,
				lastUpdated: Date.now(),
			};

			if (existingIndex >= 0) {
				data[collectionKey][existingIndex] = newItem;
			} else {
				data[collectionKey].push(newItem);
			}

			localStorage.setItem(TAB_STATE_KEY, JSON.stringify(data));
		} catch (error) {
			console.warn("Failed to save tab state to localStorage:", error);
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
			const stored = localStorage.getItem(TAB_STATE_KEY);
			if (!stored) return;

			const data: TabStateStorage = JSON.parse(stored);
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
			const uniqueItems = new Map<string, TabStateItem>();
			for (const item of collectionData) {
				const key = `${item.documentId}-${item.brickKey}-${item.brickOrder}`;
				const existingItem = uniqueItems.get(key);
				if (!existingItem || existingItem.lastUpdated < item.lastUpdated) {
					uniqueItems.set(key, item);
				}
			}

			data[collectionKey] = Array.from(uniqueItems.values());

			localStorage.setItem(TAB_STATE_KEY, JSON.stringify(data));
		} catch (error) {
			console.warn("Failed to update brick orders in localStorage:", error);
		}
	},

	/**
	 * Clean up old tab state entries (older than 30 days)
	 */
	cleanupOldEntries(): void {
		try {
			const stored = localStorage.getItem(TAB_STATE_KEY);
			if (!stored) return;

			const data: TabStateStorage = JSON.parse(stored);
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

			localStorage.setItem(TAB_STATE_KEY, JSON.stringify(data));
		} catch (error) {
			console.warn("Failed to cleanup old tab state entries:", error);
		}
	},

	/**
	 * Remove all tab state for a specific collection
	 */
	clearCollectionTabState(collectionKey: string): void {
		try {
			const stored = localStorage.getItem(TAB_STATE_KEY);
			if (!stored) return;

			const data: TabStateStorage = JSON.parse(stored);
			delete data[collectionKey];

			localStorage.setItem(TAB_STATE_KEY, JSON.stringify(data));
		} catch (error) {
			console.warn("Failed to clear collection tab state:", error);
		}
	},

	/**
	 * Remove all tab state for a specific document
	 */
	clearDocumentTabState(collectionKey: string, documentId: number): void {
		try {
			const stored = localStorage.getItem(TAB_STATE_KEY);
			if (!stored) return;

			const data: TabStateStorage = JSON.parse(stored);
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

			localStorage.setItem(TAB_STATE_KEY, JSON.stringify(data));
		} catch (error) {
			console.warn("Failed to clear document tab state:", error);
		}
	},
};
