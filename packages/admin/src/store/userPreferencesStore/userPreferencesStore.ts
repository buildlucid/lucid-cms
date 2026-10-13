import type {
	AiModelSelection,
	HomeWidgetPreference,
	UserPreferences,
} from "@types";
import { untrack } from "solid-js";
import { createStore, produce, reconcile, unwrap } from "solid-js/store";
import { updatePreferencesReq } from "@/services/api/account/preferences";
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
} from "./utils/persistence";

/** Ask opens Home on the agent's chat box, Overview on its widgets. */
export type HomeView = NonNullable<
	NonNullable<UserPreferences["home"]>["view"]
>;

export type { BuilderPreferenceScope, SectionPreferenceKey };
export { USER_PREFERENCES_STORAGE_KEY };

/** Debounce delay in milliseconds for batching account preference updates. */
export const SYNCED_SAVE_DELAY = 500;

type UserPreferencesStoreOptions = {
	storage?: Storage;
	save?: (preferences: UserPreferences) => Promise<unknown>;
};

/** Creates a preferences store with account-synced choices and device-local UI state. */
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
	const [synced, setSynced] = createStore<UserPreferences>({});
	let builderEntriesCleaned = false;
	let pendingSynced: UserPreferences = {};
	let saveTimeout: ReturnType<typeof setTimeout> | undefined;

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

	const saveSynced = () => {
		const preferences = pendingSynced;
		pendingSynced = {};
		options.save?.(preferences).catch(() => {
			// The default API helper reports errors; failed saves keep the local value.
		});
	};

	/** Applies preference changes immediately and queues a debounced account save. */
	const updateSynced = <K extends keyof UserPreferences>(
		key: K,
		value: UserPreferences[K],
	) => {
		setSynced(
			produce((preferences) => {
				preferences[key] = value;
			}),
		);
		pendingSynced[key] = value;
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(saveSynced, SYNCED_SAVE_DELAY);
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
			return synced.agentKey;
		},

		/** Returns the last model and effort explicitly chosen for an agent. */
		getAgentModelSelection(agentKey: string) {
			return synced.agentModels?.[agentKey];
		},

		getAiHidden() {
			return synced.aiHidden ?? false;
		},

		getAutoSaveEnabled() {
			return synced.autoSaveEnabled;
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
			return synced.home?.view;
		},

		/** The customised overview layout, or undefined to use the defaults. */
		getHomeWidgets() {
			return synced.home?.widgets;
		},

		getHiddenTableColumns(tableKey: string) {
			return synced.tables?.[tableKey];
		},

		getInterfaceLocale() {
			return synced.interfaceLocale;
		},

		getNavigationGroupOpen(groupKey: string) {
			return state.preferences.navigationGroups[groupKey];
		},

		getRequestActivityFilters() {
			return synced.requestActivityFilters;
		},

		getSectionOpen(section: SectionPreferenceKey) {
			return state.preferences.sections[section];
		},

		/** Hydrates account preferences while preserving unsent local changes. */
		hydrate(preferences: UserPreferences) {
			setSynced(reconcile({ ...preferences, ...pendingSynced }));
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
			if (synced.agentKey === agentKey) return;
			updateSynced("agentKey", agentKey);
		},

		/** Remembers a model choice for new chats with this agent. */
		setAgentModelSelection(agentKey: string, selection: AiModelSelection) {
			const current = synced.agentModels?.[agentKey];
			if (
				current?.modelId === selection.modelId &&
				current.reasoningEffort === selection.reasoningEffort
			) {
				return;
			}
			updateSynced("agentModels", {
				...unwrap(synced).agentModels,
				[agentKey]: selection,
			});
		},

		setAiHidden(hidden: boolean) {
			if (synced.aiHidden === hidden) return;
			updateSynced("aiHidden", hidden);
		},

		setAutoSaveEnabled(enabled: boolean) {
			if (synced.autoSaveEnabled === enabled) return;
			updateSynced("autoSaveEnabled", enabled);
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
			if (synced.home?.view === view) return;
			updateSynced("home", { ...unwrap(synced).home, view });
		},

		/** Saves the overview layout. Undefined goes back to the defaults. */
		setHomeWidgets(widgets: HomeWidgetPreference[] | undefined) {
			updateSynced("home", { ...unwrap(synced).home, widgets });
		},

		setHiddenTableColumns(tableKey: string, hiddenColumns: string[]) {
			const current = synced.tables?.[tableKey];
			if (
				current?.length === hiddenColumns.length &&
				current.every((column, index) => column === hiddenColumns[index])
			) {
				return;
			}
			updateSynced("tables", {
				...unwrap(synced).tables,
				[tableKey]: hiddenColumns,
			});
		},

		setInterfaceLocale(locale: string) {
			if (synced.interfaceLocale === locale) return;
			updateSynced("interfaceLocale", locale);
		},

		setNavigationGroupOpen(groupKey: string, open: boolean) {
			if (state.preferences.navigationGroups[groupKey] === open) return;
			updatePreferences((preferenceState) => {
				preferenceState.preferences.navigationGroups[groupKey] = open;
			});
		},

		setRequestActivityFilters(filters: string[]) {
			updateSynced("requestActivityFilters", filters);
		},

		setSectionOpen(section: SectionPreferenceKey, open: boolean) {
			if (state.preferences.sections[section] === open) return;
			updatePreferences((preferenceState) => {
				preferenceState.preferences.sections[section] = open;
			});
		},

		/** Toggles document auto-save, treating an unset preference as enabled. */
		toggleAutoSaveEnabled() {
			updateSynced("autoSaveEnabled", !(synced.autoSaveEnabled ?? true));
		},
	};
};

const userPreferencesStore = createUserPreferencesStore({
	storage: typeof localStorage === "undefined" ? undefined : localStorage,
	save: updatePreferencesReq,
});

if (typeof window !== "undefined") {
	window.addEventListener("storage", (event) => {
		if (event.key === USER_PREFERENCES_STORAGE_KEY) {
			userPreferencesStore.reload();
		}
	});
}

export default userPreferencesStore;
