import type { AiModelSelection } from "@types";
import { untrack } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import {
	BUILDER_STATE_MAX_AGE,
	type BuilderDocumentState,
	type BuilderPreferenceScope,
	type BuilderStateItem,
	createEmptyStoredState,
	ensureBuilderDocumentState,
	ensureCollectionPreferenceState,
	type HomeView,
	type HomeWidgetPreference,
	parseStoredState,
	type SectionPreferenceKey,
	type StoredUserPreferences,
	USER_PREFERENCES_STORAGE_KEY,
	type UserPreferenceState,
} from "./utils/persistence";

export type {
	BuilderPreferenceScope,
	HomeView,
	HomeWidgetPreference,
	SectionPreferenceKey,
};
export { USER_PREFERENCES_STORAGE_KEY };

type UserPreferencesStoreOptions = {
	storage?: Storage;
};

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

	const updatePreferences = (
		update: (preferenceState: UserPreferenceState) => void,
	) => {
		const next = untrack(
			() => structuredClone(unwrap(state)) as StoredUserPreferences,
		);
		update(next);
		commit(next);
	};

	const getBuilderDocumentState = (
		scope: Pick<BuilderPreferenceScope, "collectionKey" | "documentId">,
	) => {
		return state.workspace.collections[scope.collectionKey]?.documents[
			String(scope.documentId)
		];
	};

	const updateBuilderDocumentState = (
		scope: Pick<BuilderPreferenceScope, "collectionKey" | "documentId">,
		update: (documentState: BuilderDocumentState) => void,
	) => {
		updatePreferences((preferenceState) => {
			const documentState = ensureBuilderDocumentState(
				preferenceState,
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
			const hasExpiredEntries = Object.values(state.workspace.collections).some(
				(collectionState) =>
					Object.values(collectionState.documents).some((documentState) =>
						Object.values(documentState.bricks).some(
							(item) => item.lastUpdated <= threshold,
						),
					),
			);
			if (!hasExpiredEntries) return;

			updatePreferences((nextState) => {
				for (const [collectionKey, collectionState] of Object.entries(
					nextState.workspace.collections,
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
						delete nextState.workspace.collections[collectionKey];
					}
				}
			});
		},

		getAgentKey() {
			return state.preferences.agentKey;
		},

		/** Returns the last model and effort explicitly chosen for an agent. */
		getAgentModelSelection(agentKey: string) {
			return state.preferences.agentModels[agentKey];
		},

		getAutoSaveEnabled() {
			return state.preferences.autoSaveEnabled;
		},

		getBuilderActiveTab(scope: BuilderPreferenceScope) {
			return getBuilderDocumentState(scope)?.bricks[scope.brickRef]?.activeTab;
		},

		getBuilderCollapsibleOpen(
			scope: BuilderPreferenceScope,
			collapsibleKey: string,
		) {
			const open =
				getBuilderDocumentState(scope)?.bricks[scope.brickRef]
					?.collapsibleOpenByKey?.[collapsibleKey];
			return typeof open === "boolean" ? open : undefined;
		},

		getCollectionPreviewOpen(collectionKey: string) {
			return state.preferences.collections[collectionKey]?.previewOpen;
		},

		getHomeView() {
			return state.preferences.home.view;
		},

		/** The customised overview layout, or undefined to use the defaults. */
		getHomeWidgets() {
			return state.preferences.home.widgets;
		},

		getHiddenTableColumns(tableKey: string) {
			return state.preferences.tables[tableKey];
		},

		getNavigationGroupOpen(groupKey: string) {
			return state.preferences.navigationGroups[groupKey];
		},

		getReleaseActivityFilters() {
			return state.preferences.releaseActivityFilters;
		},

		getSectionOpen(section: SectionPreferenceKey) {
			return state.preferences.sections[section];
		},

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

		setAgentKey(agentKey: string) {
			if (state.preferences.agentKey === agentKey) return;
			updatePreferences((preferenceState) => {
				preferenceState.preferences.agentKey = agentKey;
			});
		},

		/** Remembers a model choice for new chats with this agent. */
		setAgentModelSelection(agentKey: string, selection: AiModelSelection) {
			const current = state.preferences.agentModels[agentKey];
			if (
				current?.modelId === selection.modelId &&
				current.reasoningEffort === selection.reasoningEffort
			) {
				return;
			}
			updatePreferences((preferenceState) => {
				preferenceState.preferences.agentModels[agentKey] = selection;
			});
		},

		setAutoSaveEnabled(enabled: boolean) {
			if (state.preferences.autoSaveEnabled === enabled) return;
			updatePreferences((preferenceState) => {
				preferenceState.preferences.autoSaveEnabled = enabled;
			});
		},

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

		setHomeView(view: HomeView) {
			if (state.preferences.home.view === view) return;
			updatePreferences((preferenceState) => {
				preferenceState.preferences.home.view = view;
			});
		},

		/** Saves the overview layout. Undefined goes back to the defaults. */
		setHomeWidgets(widgets: HomeWidgetPreference[] | undefined) {
			updatePreferences((preferenceState) => {
				preferenceState.preferences.home.widgets = widgets;
			});
		},

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

		setNavigationGroupOpen(groupKey: string, open: boolean) {
			if (state.preferences.navigationGroups[groupKey] === open) return;
			updatePreferences((preferenceState) => {
				preferenceState.preferences.navigationGroups[groupKey] = open;
			});
		},

		setReleaseActivityFilters(filters: string[]) {
			updatePreferences((preferenceState) => {
				preferenceState.preferences.releaseActivityFilters = filters;
			});
		},

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
