import { isObjectRecord } from "@/utils/type-guards";

export const USER_PREFERENCES_STORAGE_KEY = "lucid_user_preferences";
export const USER_PREFERENCES_VERSION = 1;
export const BUILDER_STATE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export const SECTION_PREFERENCE_KEYS = [
	"history.inspector.contentSummary",
	"history.inspector.documentPayload",
	"history.inspector.releaseActivity",
	"history.inspector.revisionRetention",
	"history.inspector.versionDetails",
	"pageBuilder.sidebar.documentDetails",
	"pageBuilder.sidebar.releaseRequests",
	"pageBuilder.sidebar.scheduledReleases",
	"pageBuilder.sidebar.workflow",
	"releaseRequest.sidebar.comments",
	"releaseRequest.sidebar.details",
	"releaseRequest.sidebar.execution",
	"releaseRequest.sidebar.reviewers",
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

type BuilderTenantState = {
	collections: Record<string, BuilderCollectionState>;
};

export type CollectionPreferenceState = {
	previewOpen?: boolean;
};

export type UserPreferenceState = {
	preferences: {
		autoSaveEnabled?: boolean;
		collections: Record<string, CollectionPreferenceState>;
		sections: Partial<Record<SectionPreferenceKey, boolean>>;
		tables: Record<string, string[]>;
	};
	workspace: {
		tenants: Record<string, BuilderTenantState>;
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

/** Creates an empty in-memory preference state. */
export const createEmptyPreferenceState = (): UserPreferenceState => ({
	preferences: {
		collections: {},
		sections: {},
		tables: {},
	},
	workspace: {
		tenants: {},
	},
});

/** Creates an empty preference state with its storage version. */
export const createEmptyStoredState = (): StoredUserPreferences => ({
	...createEmptyPreferenceState(),
	version: USER_PREFERENCES_VERSION,
});

/** Returns a document's builder state, creating its scope when absent. */
export const ensureBuilderDocumentState = (
	preferenceState: UserPreferenceState,
	tenantKey: string,
	collectionKey: string,
	documentId: number,
): BuilderDocumentState => {
	let tenantState = preferenceState.workspace.tenants[tenantKey];
	if (!tenantState) {
		tenantState = { collections: {} };
		preferenceState.workspace.tenants[tenantKey] = tenantState;
	}

	let collectionState = tenantState.collections[collectionKey];
	if (!collectionState) {
		collectionState = { documents: {} };
		tenantState.collections[collectionKey] = collectionState;
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

/** Checks whether a stored value is an array of strings. */
const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === "string");

/** Checks whether a stored value is a valid builder preference item. */
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

		if (isObjectRecord(preferences.sections)) {
			for (const [key, open] of Object.entries(preferences.sections)) {
				if (typeof open !== "boolean" || !sectionPreferenceKeys.has(key)) {
					continue;
				}
				normalized.preferences.sections[key as SectionPreferenceKey] = open;
			}
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
	if (!isObjectRecord(workspace) || !isObjectRecord(workspace.tenants)) {
		return normalized;
	}

	for (const [tenantKey, tenantValue] of Object.entries(workspace.tenants)) {
		if (!isObjectRecord(tenantValue)) continue;
		const collections = tenantValue.collections;
		if (!isObjectRecord(collections)) continue;

		const tenantState: BuilderTenantState = { collections: {} };
		for (const [collectionKey, collectionValue] of Object.entries(
			collections,
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
			tenantState.collections[collectionKey] = collectionState;
		}
		normalized.workspace.tenants[tenantKey] = tenantState;
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
