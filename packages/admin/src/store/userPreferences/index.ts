import { untrack } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import tenantStore from "@/store/tenantStore";
import {
	BUILDER_STATE_MAX_AGE,
	type BuilderDocumentState,
	type BuilderPreferenceScope,
	type BuilderStateItem,
	createEmptyStoredState,
	ensureBuilderDocumentState,
	ensureCollectionPreferenceState,
	parseStoredState,
	type SectionPreferenceKey,
	type StoredUserPreferences,
	USER_PREFERENCES_STORAGE_KEY,
	type UserPreferenceState,
} from "./persistence";

export type { BuilderPreferenceScope, SectionPreferenceKey };
export { USER_PREFERENCES_STORAGE_KEY };

type UserPreferencesStoreOptions = {
	getTenantKey: () => string | undefined;
	storage?: Storage;
};

/** Creates a reactive user-preferences store backed by the provided storage. */
export const createUserPreferencesStore = (
	options: UserPreferencesStoreOptions,
) => {
	const initialState = (() => {
		try {
			return parseStoredState(
				options.storage?.getItem(USER_PREFERENCES_STORAGE_KEY) ?? null,
			);
		} catch {
			return createEmptyStoredState();
		}
	})();
	const [state, setState] = createStore<StoredUserPreferences>(initialState);
	let builderEntriesCleaned = false;

	/** Updates reactive state and persists the same snapshot when possible. */
	const commit = (next: StoredUserPreferences) => {
		setState(reconcile(next));
		try {
			options.storage?.setItem(
				USER_PREFERENCES_STORAGE_KEY,
				JSON.stringify(next),
			);
		} catch {
			// Preferences remain available in memory when storage is unavailable.
		}
	};

	/** Applies an immutable preference update and persists the result. */
	const updatePreferences = (
		update: (preferenceState: UserPreferenceState) => void,
	) => {
		const next = untrack(
			() => structuredClone(unwrap(state)) as StoredUserPreferences,
		);
		update(next);
		commit(next);
	};

	/** Returns tenant-scoped builder state for a document. */
	const getBuilderDocumentState = (
		scope: Pick<BuilderPreferenceScope, "collectionKey" | "documentId">,
	) => {
		const tenantKey = options.getTenantKey();
		if (!tenantKey) return undefined;

		return state.workspace.tenants[tenantKey]?.collections[scope.collectionKey]
			?.documents[String(scope.documentId)];
	};

	/** Updates tenant-scoped builder state for a document. */
	const updateBuilderDocumentState = (
		scope: Pick<BuilderPreferenceScope, "collectionKey" | "documentId">,
		update: (documentState: BuilderDocumentState) => void,
	) => {
		const tenantKey = options.getTenantKey();
		if (!tenantKey) return;

		updatePreferences((preferenceState) => {
			const documentState = ensureBuilderDocumentState(
				preferenceState,
				tenantKey,
				scope.collectionKey,
				scope.documentId,
			);
			update(documentState);
		});
	};

	/** Updates one brick preference and refreshes its expiry timestamp. */
	const updateBuilderItem = (
		documentState: BuilderDocumentState,
		scope: BuilderPreferenceScope,
		update: (item: BuilderStateItem) => void,
	) => {
		const nextItem: BuilderStateItem = {
			...documentState.bricks[scope.brickRef],
			lastUpdated: Date.now(),
		};
		update(nextItem);
		documentState.bricks[scope.brickRef] = nextItem;
	};

	return {
		/** Removes builder preferences that have exceeded their maximum age. */
		cleanupBuilderEntries() {
			if (builderEntriesCleaned) return;
			builderEntriesCleaned = true;

			const threshold = Date.now() - BUILDER_STATE_MAX_AGE;
			const hasExpiredEntries = Object.values(state.workspace.tenants).some(
				(tenantState) =>
					Object.values(tenantState.collections).some((collectionState) =>
						Object.values(collectionState.documents).some((documentState) =>
							Object.values(documentState.bricks).some(
								(item) => item.lastUpdated <= threshold,
							),
						),
					),
			);
			if (!hasExpiredEntries) return;

			updatePreferences((nextState) => {
				for (const [tenantKey, tenantState] of Object.entries(
					nextState.workspace.tenants,
				)) {
					for (const [collectionKey, collectionState] of Object.entries(
						tenantState.collections,
					)) {
						for (const [documentId, documentState] of Object.entries(
							collectionState.documents,
						)) {
							for (const [brickRef, item] of Object.entries(
								documentState.bricks,
							)) {
								if (item.lastUpdated <= threshold) {
									delete documentState.bricks[brickRef];
								}
							}
							if (Object.keys(documentState.bricks).length === 0) {
								delete collectionState.documents[documentId];
							}
						}
						if (Object.keys(collectionState.documents).length === 0) {
							delete tenantState.collections[collectionKey];
						}
					}
					if (Object.keys(tenantState.collections).length === 0) {
						delete nextState.workspace.tenants[tenantKey];
					}
				}
			});
		},

		/** Returns the saved auto-save preference. */
		getAutoSaveEnabled() {
			return state.preferences.autoSaveEnabled;
		},

		/** Returns the saved active tab for a builder brick. */
		getBuilderActiveTab(scope: BuilderPreferenceScope) {
			return getBuilderDocumentState(scope)?.bricks[scope.brickRef]?.activeTab;
		},

		/** Returns the saved open state for a builder collapsible. */
		getBuilderCollapsibleOpen(
			scope: BuilderPreferenceScope,
			collapsibleKey: string,
		) {
			const open =
				getBuilderDocumentState(scope)?.bricks[scope.brickRef]
					?.collapsibleOpenByKey?.[collapsibleKey];
			return typeof open === "boolean" ? open : undefined;
		},

		/** Returns the saved preview state for a collection. */
		getCollectionPreviewOpen(collectionKey: string) {
			return state.preferences.collections[collectionKey]?.previewOpen;
		},

		/** Returns the hidden columns saved for a table. */
		getHiddenTableColumns(tableKey: string) {
			return state.preferences.tables[tableKey];
		},

		/** Returns the saved open state for a named section. */
		getSectionOpen(section: SectionPreferenceKey) {
			return state.preferences.sections[section];
		},

		/** Reloads preferences from storage into reactive state. */
		reload() {
			try {
				builderEntriesCleaned = false;
				setState(
					reconcile(
						parseStoredState(
							options.storage?.getItem(USER_PREFERENCES_STORAGE_KEY) ?? null,
						),
					),
				);
			} catch {
				// Keep the current in-memory preferences when storage is unavailable.
			}
		},

		/** Saves whether document auto-save is enabled. */
		setAutoSaveEnabled(enabled: boolean) {
			if (state.preferences.autoSaveEnabled === enabled) return;
			updatePreferences((preferenceState) => {
				preferenceState.preferences.autoSaveEnabled = enabled;
			});
		},

		/** Saves the active tab for a builder brick. */
		setBuilderActiveTab(scope: BuilderPreferenceScope, activeTab: string) {
			if (
				untrack(
					() =>
						getBuilderDocumentState(scope)?.bricks[scope.brickRef]?.activeTab,
				) === activeTab
			) {
				return;
			}
			updateBuilderDocumentState(scope, (documentState) => {
				updateBuilderItem(documentState, scope, (item) => {
					item.activeTab = activeTab;
				});
			});
		},

		/** Saves the open state for a builder collapsible. */
		setBuilderCollapsibleOpen(
			scope: BuilderPreferenceScope,
			collapsibleKey: string,
			open: boolean,
		) {
			if (
				untrack(
					() =>
						getBuilderDocumentState(scope)?.bricks[scope.brickRef]
							?.collapsibleOpenByKey?.[collapsibleKey],
				) === open
			) {
				return;
			}
			updateBuilderDocumentState(scope, (documentState) => {
				updateBuilderItem(documentState, scope, (item) => {
					item.collapsibleOpenByKey = {
						...(item.collapsibleOpenByKey ?? {}),
						[collapsibleKey]: open,
					};
				});
			});
		},

		/** Saves whether previews are open for a collection. */
		setCollectionPreviewOpen(collectionKey: string, open: boolean) {
			if (state.preferences.collections[collectionKey]?.previewOpen === open) {
				return;
			}
			updatePreferences((preferenceState) => {
				const collectionState = ensureCollectionPreferenceState(
					preferenceState,
					collectionKey,
				);
				collectionState.previewOpen = open;
			});
		},

		/** Saves the hidden columns for a table. */
		setHiddenTableColumns(tableKey: string, hiddenColumns: string[]) {
			const current = state.preferences.tables[tableKey];
			if (
				current?.length === hiddenColumns.length &&
				current.every((column, index) => column === hiddenColumns[index])
			) {
				return;
			}
			updatePreferences((preferenceState) => {
				preferenceState.preferences.tables[tableKey] = hiddenColumns;
			});
		},

		/** Saves the open state for a named section. */
		setSectionOpen(section: SectionPreferenceKey, open: boolean) {
			if (state.preferences.sections[section] === open) return;
			updatePreferences((preferenceState) => {
				preferenceState.preferences.sections[section] = open;
			});
		},

		/** Toggles document auto-save, treating an unset preference as enabled. */
		toggleAutoSaveEnabled() {
			const enabled = state.preferences.autoSaveEnabled ?? true;
			updatePreferences((preferenceState) => {
				preferenceState.preferences.autoSaveEnabled = !enabled;
			});
		},
	};
};

const userPreferencesStore = createUserPreferencesStore({
	getTenantKey: () => tenantStore.get.tenant,
	storage: typeof localStorage === "undefined" ? undefined : localStorage,
});

if (typeof window !== "undefined") {
	window.addEventListener("storage", (event) => {
		if (event.key === USER_PREFERENCES_STORAGE_KEY) {
			userPreferencesStore.reload();
		}
	});
}

export default userPreferencesStore;
