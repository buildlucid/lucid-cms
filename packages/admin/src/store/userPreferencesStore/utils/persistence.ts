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
	"pageBuilder.sidebar",
	"pageBuilder.sidebar.documentDetails",
	"pageBuilder.sidebar.requests",
	"pageBuilder.sidebar.workflow",
	"request.sidebar.details",
	"request.sidebar.reviewers",
	"request.sidebar.schedule",
	"request.sidebar.status",
	"agent.chat.details",
	"agent.panel",
] as const;

/** Plugin sections in the document sidebar are keyed by their slot key. */
export type SectionPreferenceKey =
	| (typeof SECTION_PREFERENCE_KEYS)[number]
	| `slot.${string}`;

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
	/** Whether the preview outlines fields and shows brick controls. Unset means on. */
	previewEditing?: boolean;
};

/** Device-local UI state, with synced choices stored separately in `UserPreferences`. */
export type UserPreferenceState = {
	preferences: {
		/** The page builder's fields column width beside the preview, in pixels. Unset uses the default. */
		builderFieldsWidth?: number;
		collections: Record<string, CollectionPreferenceState>;
		/** Open state of navigation groups, keyed by group key. Unset means open. */
		navigationGroups: Record<string, boolean>;
		sections: Partial<Record<SectionPreferenceKey, boolean>>;
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
		collections: {},
		navigationGroups: {},
		sections: {},
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
const isSectionPreferenceKey = (key: string): key is SectionPreferenceKey =>
	sectionPreferenceKeys.has(key) || key.startsWith("slot.");

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
		if (
			typeof preferences.builderFieldsWidth === "number" &&
			Number.isFinite(preferences.builderFieldsWidth) &&
			preferences.builderFieldsWidth > 0
		) {
			normalized.preferences.builderFieldsWidth =
				preferences.builderFieldsWidth;
		}

		if (isObjectRecord(preferences.sections)) {
			for (const [key, open] of Object.entries(preferences.sections)) {
				if (typeof open !== "boolean" || !isSectionPreferenceKey(key)) {
					continue;
				}
				normalized.preferences.sections[key] = open;
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

		if (isObjectRecord(preferences.collections)) {
			for (const [collectionKey, collectionValue] of Object.entries(
				preferences.collections,
			)) {
				if (!isObjectRecord(collectionValue)) continue;
				const collectionState: CollectionPreferenceState = {};
				if (typeof collectionValue.previewEditing === "boolean") {
					collectionState.previewEditing = collectionValue.previewEditing;
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
