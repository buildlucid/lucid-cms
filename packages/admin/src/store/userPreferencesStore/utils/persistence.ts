import type { AiModelSelection } from "@types";
import { dashboardWidgetSizes } from "@/components/DashboardWidget/constants";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import { isObjectRecord } from "@/utils/type-guards";

export const USER_PREFERENCES_STORAGE_KEY = "lucid_user_preferences";
export const USER_PREFERENCES_VERSION = 1;
export const BUILDER_STATE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export const SECTION_PREFERENCE_KEYS = [
	"history.inspector.contentSummary",
	"history.inspector.documentPayload",
	"history.inspector.requestActivity",
	"history.inspector.revisionRetention",
	"history.inspector.versionDetails",
	"pageBuilder.sidebar.documentDetails",
	"pageBuilder.sidebar.requests",
	"pageBuilder.sidebar.workflow",
	"request.sidebar.details",
	"request.sidebar.reviewers",
	"request.sidebar.schedule",
	"request.sidebar.status",
	"agent.chat.details",
] as const;

export type SectionPreferenceKey = (typeof SECTION_PREFERENCE_KEYS)[number];

export type BuilderStateItem = {
	activeTab?: string;
	collapsibleOpenByKey?: Record<string, boolean>;
	lastUpdated: number;
};

export type BuilderDocumentState = {
	bricks: Record<string, BuilderStateItem>;
};

type BuilderCollectionState = {
	documents: Record<string, BuilderDocumentState>;
};

export type CollectionPreferenceState = {
	previewOpen?: boolean;
};

/** Ask opens Home on the agent's chat box, Overview on the widget dashboard. */
export type HomeView = "ask" | "overview";

/** One widget in a customised Home overview. List order is display order. */
export type HomeWidgetPreference = {
	key: string;
	size?: DashboardWidgetSize;
	hidden?: boolean;
};

export type HomePreferenceState = {
	view?: HomeView;
	/** Unset until the user customises the overview, so it follows the defaults. */
	widgets?: HomeWidgetPreference[];
};

export type UserPreferenceState = {
	preferences: {
		agentKey?: string;
		agentModels: Record<string, AiModelSelection>;
		autoSaveEnabled?: boolean;
		collections: Record<string, CollectionPreferenceState>;
		home: HomePreferenceState;
		/** Open state of navigation groups, keyed by group key. Unset means open. */
		navigationGroups: Record<string, boolean>;
		/** Optional request activity shown, by filter key. Unset shows none. */
		requestActivityFilters?: string[];
		sections: Partial<Record<SectionPreferenceKey, boolean>>;
		tables: Record<string, string[]>;
	};
	workspace: {
		collections: Record<string, BuilderCollectionState>;
	};
};

export type StoredUserPreferences = {
	preferences: UserPreferenceState["preferences"];
	version: typeof USER_PREFERENCES_VERSION;
	workspace: UserPreferenceState["workspace"];
};

export type BuilderPreferenceScope = {
	brickRef: string;
	collectionKey: string;
	documentId: number;
};

export const createEmptyPreferenceState = (): UserPreferenceState => ({
	preferences: {
		agentModels: {},
		collections: {},
		home: {},
		navigationGroups: {},
		sections: {},
		tables: {},
	},
	workspace: {
		collections: {},
	},
});

export const createEmptyStoredState = (): StoredUserPreferences => ({
	...createEmptyPreferenceState(),
	version: USER_PREFERENCES_VERSION,
});

/** Returns a document's builder state, creating its scope when absent. */
export const ensureBuilderDocumentState = (
	preferenceState: UserPreferenceState,
	collectionKey: string,
	documentId: number,
): BuilderDocumentState => {
	let collectionState = preferenceState.workspace.collections[collectionKey];
	if (!collectionState) {
		collectionState = { documents: {} };
		preferenceState.workspace.collections[collectionKey] = collectionState;
	}

	const documentKey = String(documentId);
	let documentState = collectionState.documents[documentKey];
	if (!documentState) {
		documentState = { bricks: {} };
		collectionState.documents[documentKey] = documentState;
	}

	return documentState;
};

/** Returns collection preferences, creating them when absent. */
export const ensureCollectionPreferenceState = (
	preferenceState: UserPreferenceState,
	collectionKey: string,
): CollectionPreferenceState => {
	let collectionState = preferenceState.preferences.collections[collectionKey];
	if (!collectionState) {
		collectionState = {};
		preferenceState.preferences.collections[collectionKey] = collectionState;
	}

	return collectionState;
};

const sectionPreferenceKeys = new Set<string>(SECTION_PREFERENCE_KEYS);

const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === "string");

/** Reads a model preference from storage; availability is checked against the catalogue. */
const parseModelSelection = (value: unknown): AiModelSelection | undefined => {
	if (
		!isObjectRecord(value) ||
		typeof value.modelId !== "string" ||
		value.modelId.length === 0 ||
		value.modelId.length > 200
	) {
		return undefined;
	}

	switch (value.reasoningEffort) {
		case undefined:
		case null:
		case "minimal":
		case "low":
		case "medium":
		case "high":
		case "xhigh":
			return { modelId: value.modelId, reasoningEffort: value.reasoningEffort };
		default:
			return undefined;
	}
};

const isDashboardWidgetSize = (value: unknown): value is DashboardWidgetSize =>
	dashboardWidgetSizes.some((size) => size === value);

/** Keeps valid widget entries, dropping repeats and unknown sizes. */
const parseHomeWidgets = (value: unknown[]): HomeWidgetPreference[] => {
	const widgets = new Map<string, HomeWidgetPreference>();
	for (const item of value) {
		if (
			!isObjectRecord(item) ||
			typeof item.key !== "string" ||
			widgets.has(item.key)
		) {
			continue;
		}
		widgets.set(item.key, {
			key: item.key,
			size: isDashboardWidgetSize(item.size) ? item.size : undefined,
			hidden: typeof item.hidden === "boolean" ? item.hidden : undefined,
		});
	}
	return Array.from(widgets.values());
};

const isBuilderStateItem = (value: unknown): value is BuilderStateItem => {
	if (!isObjectRecord(value) || typeof value.lastUpdated !== "number") {
		return false;
	}

	if (value.activeTab !== undefined && typeof value.activeTab !== "string") {
		return false;
	}

	return (
		value.collapsibleOpenByKey === undefined ||
		(isObjectRecord(value.collapsibleOpenByKey) &&
			Object.values(value.collapsibleOpenByKey).every(
				(open) => typeof open === "boolean",
			))
	);
};

/** Normalizes unknown stored data into the supported preference shape. */
const normalizePreferenceState = (value: unknown): UserPreferenceState => {
	const normalized = createEmptyPreferenceState();
	if (!isObjectRecord(value)) return normalized;

	const preferences = value.preferences;
	if (isObjectRecord(preferences)) {
		if (typeof preferences.autoSaveEnabled === "boolean") {
			normalized.preferences.autoSaveEnabled = preferences.autoSaveEnabled;
		}

		if (typeof preferences.agentKey === "string") {
			normalized.preferences.agentKey = preferences.agentKey;
		}

		if (isObjectRecord(preferences.agentModels)) {
			for (const [agentKey, value] of Object.entries(preferences.agentModels)) {
				const selection = parseModelSelection(value);
				if (selection) normalized.preferences.agentModels[agentKey] = selection;
			}
		}

		if (isObjectRecord(preferences.home)) {
			const { view, widgets } = preferences.home;
			if (view === "ask" || view === "overview") {
				normalized.preferences.home.view = view;
			}
			if (Array.isArray(widgets)) {
				normalized.preferences.home.widgets = parseHomeWidgets(widgets);
			}
		}

		if (isObjectRecord(preferences.sections)) {
			for (const [key, open] of Object.entries(preferences.sections)) {
				if (typeof open !== "boolean" || !sectionPreferenceKeys.has(key)) {
					continue;
				}
				normalized.preferences.sections[key as SectionPreferenceKey] = open;
			}
		}

		if (isObjectRecord(preferences.navigationGroups)) {
			for (const [groupKey, open] of Object.entries(
				preferences.navigationGroups,
			)) {
				if (typeof open === "boolean") {
					normalized.preferences.navigationGroups[groupKey] = open;
				}
			}
		}

		if (isStringArray(preferences.requestActivityFilters)) {
			normalized.preferences.requestActivityFilters =
				preferences.requestActivityFilters;
		}

		if (isObjectRecord(preferences.tables)) {
			for (const [tableKey, hiddenColumns] of Object.entries(
				preferences.tables,
			)) {
				if (isStringArray(hiddenColumns)) {
					normalized.preferences.tables[tableKey] = hiddenColumns;
				}
			}
		}

		if (isObjectRecord(preferences.collections)) {
			for (const [collectionKey, collectionValue] of Object.entries(
				preferences.collections,
			)) {
				if (!isObjectRecord(collectionValue)) continue;
				const collectionState: CollectionPreferenceState = {};
				if (typeof collectionValue.previewOpen === "boolean") {
					collectionState.previewOpen = collectionValue.previewOpen;
				}
				normalized.preferences.collections[collectionKey] = collectionState;
			}
		}
	}

	const workspace = value.workspace;
	if (!isObjectRecord(workspace) || !isObjectRecord(workspace.collections)) {
		return normalized;
	}

	for (const [collectionKey, collectionValue] of Object.entries(
		workspace.collections,
	)) {
		if (!isObjectRecord(collectionValue)) continue;
		const documents = collectionValue.documents;
		if (!isObjectRecord(documents)) continue;

		const collectionState: BuilderCollectionState = { documents: {} };
		for (const [documentId, documentValue] of Object.entries(documents)) {
			if (
				!isObjectRecord(documentValue) ||
				!isObjectRecord(documentValue.bricks)
			) {
				continue;
			}

			const bricks: Record<string, BuilderStateItem> = {};
			for (const [brickRef, brickState] of Object.entries(
				documentValue.bricks,
			)) {
				if (isBuilderStateItem(brickState)) bricks[brickRef] = brickState;
			}
			collectionState.documents[documentId] = { bricks };
		}
		normalized.workspace.collections[collectionKey] = collectionState;
	}

	return normalized;
};

/** Parses stored preferences, returning empty state for invalid data. */
export const parseStoredState = (raw: string | null): StoredUserPreferences => {
	if (!raw) return createEmptyStoredState();

	try {
		const parsed: unknown = JSON.parse(raw);
		if (
			!isObjectRecord(parsed) ||
			parsed.version !== USER_PREFERENCES_VERSION
		) {
			return createEmptyStoredState();
		}

		const normalized = normalizePreferenceState(parsed);

		return {
			...normalized,
			version: USER_PREFERENCES_VERSION,
		};
	} catch {
		return createEmptyStoredState();
	}
};
