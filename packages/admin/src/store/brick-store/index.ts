import type {
	BrickError,
	Collection,
	DocumentVersionCheckResponse,
	FieldError,
	FieldRef,
	FieldTypes,
	FieldValue,
	InternalCollectionDocument,
	InternalDocumentField,
} from "@types";
import { nanoid } from "nanoid";
import { batch, untrack } from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";
import type {
	CollectionBrickConfig,
	CollectionDataFieldConfig,
	CollectionFieldConfig,
	CollectionLeafFieldConfig,
	CollectionNonTabFieldConfig,
} from "@/types/collection-config";
import brickHelpers, { clearTargetFieldErrors } from "@/utils/brick-helpers";
import { mergeDraftCheckFields } from "@/utils/draft-check-helpers";
import { isDocumentRef } from "@/utils/relation-field-helpers";
import safeDeepEqual from "@/utils/safe-deep-equal";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";
import { isObjectRecord } from "@/utils/type-guards";
import {
	type BrickFieldIndex,
	type BrickFieldPath,
	createBrickFieldIndex,
	getFieldAtPath,
	getIndexedFieldPath,
} from "./field-index";
import { createInternalField, ensureFieldsForConfigs } from "./fields";
import {
	type BrickSnapshot,
	createBricksSnapshot,
	createBuilderBrickStructureSnapshot,
	createContentComparisonSnapshot,
} from "./snapshots";

export interface BrickData {
	ref: string;
	key: string;
	order: number;
	type: "builder" | "fixed" | "collection-fields";
	open: boolean;
	fields: Array<InternalDocumentField>;
}

interface BrickSnapshotPayload {
	bricks?: Array<BrickData>;
	fields?: Array<InternalDocumentField>;
}

const [get, set] = createStore<{
	bricks: Array<BrickData>;
	fieldsErrors: Array<FieldError>;
	brickErrors: Array<BrickError>;
	initialSnapshot: BrickSnapshot[] | null;
	autoSaveCounter: number;
	skipAutoSave: boolean;
	relationFieldDragCount: number;
	locked: boolean;
	refs: Partial<Record<FieldTypes, FieldRef[]>>;
	collectionLocalized: boolean;
	documentRevision: number;
	contentRevision: number;
	structureRevision: number;
	snapshotRevision: number;
	reset: () => void;
	setBricks: (
		document?: InternalCollectionDocument,
		collection?: Collection,
	) => void;
	syncBricks: (
		document?: InternalCollectionDocument,
		collection?: Collection,
	) => void;
	captureInitialSnapshot: (snapshot?: BrickSnapshot[]) => void;
	createSnapshotFromPayload: (payload: BrickSnapshotPayload) => BrickSnapshot[];
	addBrick: (props: { brickConfig: CollectionBrickConfig }) => void;
	removeBrick: (brickIndex: number) => void;
	toggleBrickOpen: (brickIndex: number) => void;
	swapBrickOrder: (props: { brickRef: string; targetBrickRef: string }) => void;
	setFieldValue: (params: {
		brickIndex: number;
		key: string;
		fieldConfig: CollectionLeafFieldConfig;
		repeaterKey?: string;
		ref?: string;
		value: FieldValue;
		contentLocale: string;
		clearFromItemIndex?: number;
	}) => void;
	clearFieldErrors: (params: {
		brickIndex: number;
		key: string;
		fieldConfig: CollectionLeafFieldConfig;
		ref?: string;
		contentLocale: string;
		clearFromItemIndex?: number;
	}) => void;
	addField: (params: {
		brickIndex: number;
		fieldConfig: CollectionDataFieldConfig;
		ref?: string;
		repeaterKey?: string;
		locales: string[];
	}) => InternalDocumentField;
	ensureFields: (params: {
		brickIndex: number;
		fieldConfig: CollectionFieldConfig[];
		locales: string[];
	}) => void;
	addRepeaterGroup: (params: {
		brickIndex: number;
		fieldConfig: CollectionNonTabFieldConfig[];
		key: string;
		ref?: string;
		parentRepeaterKey?: string;
		locales: string[];
	}) => void;
	removeRepeaterGroup: (params: {
		brickIndex: number;
		repeaterKey: string;
		targetRef: string;
		ref?: string;
		parentRepeaterKey?: string;
	}) => void;
	swapGroupOrder: (_props: {
		brickIndex: number;
		repeaterKey: string;
		selectedRef: string;
		targetRef: string;
		ref?: string;
		parentRepeaterKey?: string;
	}) => void;
	toggleGroupOpen: (_props: {
		brickIndex: number;
		repeaterKey: string;
		ref: string;
		parentRepeaterKey: string | undefined;
		parentRef: string | undefined;
	}) => void;
	setRefs: (document?: InternalCollectionDocument) => void;
	addRef: (
		fieldType: "media" | "relation" | "user",
		ref: FieldRef | FieldRef[],
	) => void;
	mergeDraftCheckResponse: (response: DocumentVersionCheckResponse) => void;
	startRelationFieldDrag: () => void;
	endRelationFieldDrag: () => void;
}>({
	bricks: [],
	fieldsErrors: [],
	brickErrors: [],
	initialSnapshot: null,
	locked: false,
	autoSaveCounter: 0,
	skipAutoSave: true,
	relationFieldDragCount: 0,
	collectionLocalized: false,
	documentRevision: 0,
	contentRevision: 0,
	structureRevision: 0,
	snapshotRevision: 0,
	refs: {},
	/** Clears all document, validation, lookup, and dirty-state data between builder sessions. */
	reset() {
		brickFieldIndexes.clear();
		clearInitialSnapshotCaches();
		batch(() => {
			set("bricks", []);
			set("fieldsErrors", []);
			set("brickErrors", []);
			set("initialSnapshot", null);
			set("autoSaveCounter", 0);
			set("skipAutoSave", true);
			set("relationFieldDragCount", 0);
			set("collectionLocalized", false);
			set("refs", {});
			markDocumentChange({ content: true, structure: true });
			set("snapshotRevision", (previous) => previous + 1);
		});
	},
	/** Records the saved baseline before notifying dirty-state consumers so a successful save becomes clean immediately. */
	captureInitialSnapshot(snapshot) {
		const nextSnapshot = snapshot ?? createBricksSnapshot(get.bricks);
		cacheInitialSnapshots(nextSnapshot);
		batch(() => {
			set("initialSnapshot", nextSnapshot);
			set("snapshotRevision", (previous) => previous + 1);
		});
	},
	/** Creates the canonical baseline shape from a save payload so responses can be compared without rehydrating the store. */
	createSnapshotFromPayload(payload) {
		return createBricksSnapshot([
			{
				ref: "collection-pseudo-brick",
				key: "collection-pseudo-brick",
				order: -1,
				type: "collection-fields",
				open: false,
				fields: structuredClone(unwrap(payload.fields ?? [])),
			},
			...structuredClone(unwrap(payload.bricks ?? [])),
		]);
	},
	// Bricks
	/** Hydrates every brick from the document and collection config, then indexes fields for fast builder access. */
	setBricks(document, collection) {
		batch(() => {
			set(
				"bricks",
				brickHelpers.buildBricks({
					document: structuredClone(unwrap(document)),
					collection: structuredClone(unwrap(collection)),
				}),
			);
			markDocumentChange({ content: true, structure: true });
		});
		rebuildAllBrickFieldIndexes();
	},
	/** Reconciles server bricks while preserving open repeater groups so background refreshes do not disrupt editing. */
	syncBricks(document, collection) {
		const nextBricks = brickHelpers.buildBricks({
			document: structuredClone(unwrap(document)),
			collection: structuredClone(unwrap(collection)),
		});

		batch(() => {
			set(
				"bricks",
				produce((draft) => {
					const currentBySyncKey = new Map(
						draft.map((brick) => [brickHelpers.getBrickSyncKey(brick), brick]),
					);
					const mergedBricks: BrickData[] = [];

					for (const nextBrick of nextBricks) {
						const currentBrick = currentBySyncKey.get(
							brickHelpers.getBrickSyncKey(nextBrick),
						);
						if (!currentBrick) {
							mergedBricks.push(nextBrick);
							continue;
						}

						currentBrick.key = nextBrick.key;
						currentBrick.order = nextBrick.order;
						currentBrick.type = nextBrick.type;
						if (nextBrick.type === "builder") {
							currentBrick.ref = nextBrick.ref;
						}
						currentBrick.fields = brickHelpers.preserveRepeaterGroupOpenState(
							nextBrick.fields || [],
							currentBrick.fields || [],
						);
						mergedBricks.push(currentBrick);
					}

					draft.splice(0, draft.length, ...mergedBricks);
				}),
			);
			markDocumentChange({ content: true, structure: true });
		});
		rebuildAllBrickFieldIndexes();
	},
	/** Appends an empty builder brick and indexes it so structural additions are immediately editable and detectable. */
	addBrick(props) {
		batch(() => {
			set(
				"bricks",
				produce((draft) => {
					const largestOrder = draft?.reduce((prev, current) => {
						return prev.order > current.order ? prev : current;
					});

					draft.push({
						ref: nanoid(),
						key: props.brickConfig.key,
						order: largestOrder ? largestOrder.order + 1 : 0,
						type: "builder",
						open: false,
						fields: [],
					});
				}),
			);
			markDocumentChange({ content: true, structure: true });
		});
		rebuildBrickFieldIndex(get.bricks.length - 1);
	},
	/** Removes a builder brick and its field index so autosave and dirty checks reflect the structural deletion. */
	removeBrick(brickIndex) {
		let brickRemoved = false;
		const removedBrickRef = get.bricks[brickIndex]?.ref;

		batch(() => {
			set(
				"bricks",
				produce((draft) => {
					if (draft[brickIndex].type !== "builder") return;
					draft.splice(brickIndex, 1);
					brickRemoved = true;
				}),
			);

			if (brickRemoved) {
				set("autoSaveCounter", (prev) => prev + 1);
				markDocumentChange({ content: true, structure: true });
			}
		});
		if (brickRemoved && removedBrickRef)
			brickFieldIndexes.delete(removedBrickRef);
	},
	/** Toggles a brick's editor-only expansion state without treating it as persisted content. */
	toggleBrickOpen(brickIndex) {
		set(
			"bricks",
			produce((draft) => {
				draft[brickIndex].open = draft[brickIndex].open !== true;
			}),
		);
	},
	/** Swaps two brick positions and marks the structure dirty so autosave and preview observe the new order. */
	swapBrickOrder(props) {
		let brickOrderChanged = false;

		batch(() => {
			set(
				"bricks",
				produce((draft) => {
					const brick = draft.find((b) => b.ref === props.brickRef);
					const targetBrick = draft.find((b) => b.ref === props.targetBrickRef);

					if (!brick || !targetBrick) return;

					const order = brick.order;
					brick.order = targetBrick.order;
					targetBrick.order = order;
					brickOrderChanged = true;

					draft.sort((a, b) => a.order - b.order);
				}),
			);

			if (brickOrderChanged) {
				set("autoSaveCounter", (prev) => prev + 1);
				markDocumentChange({ content: true, structure: true });
			}
		});
	},
	// Fields
	/** Updates a localized or shared field only when its value changes, then clears stale errors and schedules autosave. */
	setFieldValue(params) {
		let fieldChanged = false;
		const fieldPath = getBrickFieldPath({
			brickIndex: params.brickIndex,
			key: params.key,
			groupRef: params.ref,
		});

		batch(() => {
			set(
				"bricks",
				params.brickIndex,
				"fields",
				produce((fieldsDraft) => {
					const field =
						(fieldPath && getFieldAtPath(fieldsDraft, fieldPath)) ||
						brickHelpers.findFieldRecursive({
							fields: fieldsDraft,
							targetKey: params.key,
							groupRef: params.ref,
							repeaterKey: params.repeaterKey,
						});

					if (!field) return;

					if (
						params.fieldConfig.localized === true &&
						get.collectionLocalized === true
					) {
						const previousValue = field.translations?.[params.contentLocale];
						if (safeDeepEqual(previousValue, params.value)) return;

						if (!field.translations) field.translations = {};
						field.translations[params.contentLocale] = params.value;
					} else {
						if (safeDeepEqual(field.value, params.value)) return;

						field.value = params.value;
					}

					fieldChanged = true;
				}),
			);

			if (fieldChanged) {
				get.clearFieldErrors({
					brickIndex: params.brickIndex,
					key: params.key,
					fieldConfig: params.fieldConfig,
					ref: params.ref,
					contentLocale: params.contentLocale,
					clearFromItemIndex: params.clearFromItemIndex,
				});

				set("autoSaveCounter", (prev) => prev + 1);
				markDocumentChange({ content: true });
			}
		});
	},
	/** Clears validation errors for the edited field while retaining errors that belong to other fields or groups. */
	clearFieldErrors(params) {
		const brick = get.bricks[params.brickIndex];
		const localeCode =
			params.fieldConfig.localized === true && get.collectionLocalized === true
				? params.contentLocale
				: undefined;
		const errorTarget = {
			key: params.key,
			localeCode,
			groupRef: params.ref,
			clearFromItemIndex: params.clearFromItemIndex,
		};

		if (brick?.type === "collection-fields") {
			set(
				"fieldsErrors",
				produce((draft) => {
					const nextErrors = clearTargetFieldErrors(draft, errorTarget);
					draft.splice(0, draft.length, ...nextErrors);
				}),
			);
			return;
		}

		if (!brick) return;

		set(
			"brickErrors",
			produce((draft) => {
				const brickErrorIndex = draft.findIndex(
					(error) => error.ref === brick.ref && error.key === brick.key,
				);
				if (brickErrorIndex === -1) return;

				const nextFields = clearTargetFieldErrors(
					draft[brickErrorIndex].fields,
					errorTarget,
				);
				if (nextFields.length === 0) {
					draft.splice(brickErrorIndex, 1);
					return;
				}

				draft[brickErrorIndex].fields = nextFields;
			}),
		);
	},
	/** Creates a missing field at brick or repeater-group scope and refreshes the index used by later edits. */
	addField(params) {
		const newField = createInternalField({
			fieldConfig: params.fieldConfig,
			locales: params.locales,
			collectionLocalized: get.collectionLocalized,
		});

		// Field belongs on the brick level
		if (params.ref === undefined) {
			batch(() => {
				set(
					"bricks",
					params.brickIndex,
					"fields",
					produce((fieldsDraft) => {
						fieldsDraft.push(newField);
					}),
				);
				markDocumentChange({ content: true });
			});
			rebuildBrickFieldIndex(params.brickIndex);
			return newField;
		}

		const repeaterKey = params.repeaterKey;
		if (repeaterKey === undefined) return newField;

		let fieldAdded = false;
		batch(() => {
			set(
				"bricks",
				params.brickIndex,
				"fields",
				produce((fieldsDraft) => {
					const repeaterField = brickHelpers.findFieldRecursive({
						fields: fieldsDraft,
						targetKey: repeaterKey,
						groupRef: params.ref,
					});
					if (repeaterField?.type !== "repeater") return;

					const group = repeaterField.groups?.find(
						(candidate) => candidate.ref === params.ref,
					);
					if (!group) return;

					group.fields.push(newField);
					fieldAdded = true;
				}),
			);
			if (fieldAdded) markDocumentChange({ content: true });
		});
		if (fieldAdded) rebuildBrickFieldIndex(params.brickIndex);
		return newField;
	},
	/** Adds config-defined fields missing from a brick so older documents remain editable after schema changes. */
	ensureFields(params) {
		let fieldsAdded = false;
		batch(() => {
			set(
				"bricks",
				params.brickIndex,
				"fields",
				produce((fieldsDraft) => {
					fieldsAdded = ensureFieldsForConfigs({
						fields: fieldsDraft,
						fieldConfigs: params.fieldConfig,
						locales: params.locales,
						collectionLocalized: get.collectionLocalized,
					});
				}),
			);
			if (fieldsAdded) markDocumentChange({ content: true });
		});
		if (fieldsAdded) rebuildBrickFieldIndex(params.brickIndex);
	},
	// Groups
	/** Appends an initialized repeater group and refreshes field paths so nested fields stay fast to locate. */
	addRepeaterGroup(params) {
		let groupAdded = false;
		const fieldPath = getBrickFieldPath({
			brickIndex: params.brickIndex,
			key: params.key,
			groupRef: params.ref,
		});

		batch(() => {
			set(
				"bricks",
				params.brickIndex,
				"fields",
				produce((fieldsDraft) => {
					const field =
						(fieldPath && getFieldAtPath(fieldsDraft, fieldPath)) ||
						brickHelpers.findFieldRecursive({
							fields: fieldsDraft,
							targetKey: params.key,
							groupRef: params.ref,
							repeaterKey: params.parentRepeaterKey,
						});

					if (!field) return;
					if (field.type !== "repeater") return;
					if (field.groups === undefined) field.groups = [];

					const groupFields: InternalDocumentField[] = [];

					for (const field of flattenStructuralScopeConfigs(
						params.fieldConfig,
					)) {
						groupFields.push(
							createInternalField({
								fieldConfig: field,
								locales: params.locales,
								collectionLocalized: get.collectionLocalized,
							}),
						);
					}

					if (field.groups.length === 0) {
						field.groups = [
							{
								ref: nanoid(),
								order: 0,
								open: false,
								fields: groupFields,
							},
						];
						groupAdded = true;
						return;
					}

					const largestOrder = field.groups?.reduce((prev, current) => {
						return prev.order > current.order ? prev : current;
					});

					field.groups.push({
						ref: nanoid(),
						order: largestOrder.order + 1,
						open: false,
						fields: groupFields,
					});
					groupAdded = true;
				}),
			);

			if (groupAdded) {
				set("autoSaveCounter", (prev) => prev + 1);
				markDocumentChange({ content: true });
			}
		});
		if (groupAdded) rebuildBrickFieldIndex(params.brickIndex);
	},
	/** Removes a repeater group and rebuilds indexed paths so deleted nested fields cannot be resolved later. */
	removeRepeaterGroup(params) {
		let groupRemoved = false;
		const fieldPath = getBrickFieldPath({
			brickIndex: params.brickIndex,
			key: params.repeaterKey,
			groupRef: params.ref,
		});

		batch(() => {
			set(
				"bricks",
				params.brickIndex,
				"fields",
				produce((fieldsDraft) => {
					const field =
						(fieldPath && getFieldAtPath(fieldsDraft, fieldPath)) ||
						brickHelpers.findFieldRecursive({
							fields: fieldsDraft,
							targetKey: params.repeaterKey,
							groupRef: params.ref,
							repeaterKey: params.parentRepeaterKey,
						});

					if (!field) return;
					if (field.type !== "repeater") return;
					if (field.groups === undefined) return;

					const targetGroupIndex = field.groups.findIndex(
						(g) => g.ref === params.targetRef,
					);
					if (targetGroupIndex === -1) return;

					field.groups.splice(targetGroupIndex, 1);
					groupRemoved = true;
				}),
			);

			if (groupRemoved) {
				set("autoSaveCounter", (prev) => prev + 1);
				markDocumentChange({ content: true });
			}
		});
		if (groupRemoved) rebuildBrickFieldIndex(params.brickIndex);
	},
	/** Reorders two repeater groups and refreshes paths so persisted order and indexed access remain aligned. */
	swapGroupOrder(params) {
		let groupOrderChanged = false;
		const fieldPath = getBrickFieldPath({
			brickIndex: params.brickIndex,
			key: params.repeaterKey,
			groupRef: params.ref,
		});

		batch(() => {
			set(
				"bricks",
				params.brickIndex,
				"fields",
				produce((fieldsDraft) => {
					const field =
						(fieldPath && getFieldAtPath(fieldsDraft, fieldPath)) ||
						brickHelpers.findFieldRecursive({
							fields: fieldsDraft,
							targetKey: params.repeaterKey,
							groupRef: params.ref,
							repeaterKey: params.parentRepeaterKey,
						});

					if (!field) return;
					if (field.type !== "repeater") return;
					if (field.groups === undefined) field.groups = [];

					const selectedIndex = field.groups.findIndex(
						(group) => group.ref === params.selectedRef,
					);
					const targetGroupIndex = field.groups.findIndex(
						(group) => group.ref === params.targetRef,
					);

					if (selectedIndex === -1 || targetGroupIndex === -1) return;

					const groupOrder = field.groups[selectedIndex].order;

					field.groups[selectedIndex].order =
						field.groups[targetGroupIndex].order;
					field.groups[targetGroupIndex].order = groupOrder;
					groupOrderChanged = true;

					field.groups.sort((a, b) => a.order - b.order);
				}),
			);

			if (groupOrderChanged) {
				set("autoSaveCounter", (prev) => prev + 1);
				markDocumentChange({ content: true });
			}
		});
		if (groupOrderChanged) rebuildBrickFieldIndex(params.brickIndex);
	},
	/** Toggles a repeater group's UI expansion and advances only the revision that tracks editor state. */
	toggleGroupOpen: (props) => {
		let groupToggled = false;
		const fieldPath = getBrickFieldPath({
			brickIndex: props.brickIndex,
			key: props.repeaterKey,
			groupRef: props.parentRef,
		});
		batch(() => {
			set(
				"bricks",
				props.brickIndex,
				"fields",
				produce((fieldsDraft) => {
					const field =
						(fieldPath && getFieldAtPath(fieldsDraft, fieldPath)) ||
						brickHelpers.findFieldRecursive({
							fields: fieldsDraft,
							targetKey: props.repeaterKey,
							groupRef: props.parentRef,
							repeaterKey: props.parentRepeaterKey,
						});

					if (!field?.groups) return;

					const group = field.groups.find((g) => g.ref === props.ref);
					if (!group) return;

					group.open = group.open !== true;
					groupToggled = true;
				}),
			);
			if (groupToggled) markDocumentChange();
		});
	},
	/** Replaces resolved document references so relation, media, and user fields can render their current labels. */
	setRefs(document) {
		const refs = structuredClone(unwrap(document?.refs));
		set("refs", refs || {});
	},
	/** Upserts resolved references by stable identity so newly selected records are available without a refetch. */
	addRef(fieldType, ref) {
		set(
			"refs",
			produce((draft) => {
				const refsToAdd = Array.isArray(ref) ? ref : [ref];
				if (!draft[fieldType]) {
					draft[fieldType] = [];
				}

				const refs = draft[fieldType];

				for (const nextRef of refsToAdd) {
					const existingIndex = refs.findIndex((existing) => {
						if (!existing || !nextRef) return false;

						if (fieldType === "relation") {
							const existingDocumentRef = isDocumentRef(existing)
								? existing
								: undefined;
							const nextDocumentRef = isDocumentRef(nextRef)
								? nextRef
								: undefined;

							if (!existingDocumentRef || !nextDocumentRef) {
								return false;
							}

							return (
								existingDocumentRef.collectionKey ===
									nextDocumentRef.collectionKey &&
								existingDocumentRef.id === nextDocumentRef.id
							);
						}

						if (!isObjectRecord(existing) || !isObjectRecord(nextRef)) {
							return false;
						}

						return existing.id === nextRef.id;
					});

					if (existingIndex !== -1) {
						refs[existingIndex] = nextRef;
					} else {
						refs.push(nextRef);
					}
				}
			}),
		);
	},
	/** Merges draft-check field data into existing bricks so validation feedback does not reset editor UI state. */
	mergeDraftCheckResponse(response) {
		const collectionFieldsPseudoBrickIndex = get.bricks.findIndex(
			(brick) => brick.type === "collection-fields",
		);
		let fieldsMerged = false;

		batch(() => {
			if (
				collectionFieldsPseudoBrickIndex !== -1 &&
				response.fields.length > 0
			) {
				set(
					"bricks",
					collectionFieldsPseudoBrickIndex,
					"fields",
					produce((fields) => {
						mergeDraftCheckFields(fields, response.fields);
					}),
				);
				fieldsMerged = true;
			}

			response.bricks.forEach((responseBrick) => {
				const responseBrickFields = responseBrick.fields ?? [];
				const brickIndex = get.bricks.findIndex((brick) => {
					if (brick.type === "collection-fields") return false;
					if (brick.type !== responseBrick.type) return false;
					if (brick.key !== responseBrick.key) return false;
					if (brick.type === "builder") return brick.ref === responseBrick.ref;
					return true;
				});

				if (brickIndex === -1 || responseBrickFields.length === 0) return;

				set(
					"bricks",
					brickIndex,
					"fields",
					produce((fields) => {
						mergeDraftCheckFields(fields, responseBrickFields);
					}),
				);
				fieldsMerged = true;
			});

			if (fieldsMerged) markDocumentChange({ content: true });
		});
		if (fieldsMerged) rebuildAllBrickFieldIndexes();
	},
	/** Increments active relation drags so overlapping drag lifecycles keep navigation protection enabled. */
	startRelationFieldDrag() {
		set("relationFieldDragCount", (prev) => prev + 1);
	},
	/** Completes one relation drag without allowing the shared activity counter to become negative. */
	endRelationFieldDrag() {
		set("relationFieldDragCount", (prev) => Math.max(0, prev - 1));
	},
});

const brickFieldIndexes = new Map<string, BrickFieldIndex>();

/**
 * Advances only the dirty-state revisions affected by a mutation. Consumers
 * can then depend on a small scalar instead of tracking every field read made
 * while a deep comparison is calculated.
 */
const markDocumentChange = (
	props: { content?: boolean; structure?: boolean } = {},
) => {
	set("documentRevision", (previous) => previous + 1);
	if (props.content) set("contentRevision", (previous) => previous + 1);
	if (props.structure) set("structureRevision", (previous) => previous + 1);
};

/** Rebuilds one brick's lookup index after its field structure changes. */
const rebuildBrickFieldIndex = (brickIndex: number) => {
	untrack(() => {
		const brick = get.bricks[brickIndex];
		if (!brick) return;
		brickFieldIndexes.set(brick.ref, createBrickFieldIndex(brick.fields));
	});
};

/** Rebuilds all lookup indexes after document hydration or server merging. */
const rebuildAllBrickFieldIndexes = () => {
	untrack(() => {
		brickFieldIndexes.clear();
		get.bricks.forEach((brick) => {
			brickFieldIndexes.set(brick.ref, createBrickFieldIndex(brick.fields));
		});
	});
};

/**
 * Returns a validated field path, lazily rebuilding the brick index when the
 * store was populated through a lower-level test or development helper.
 */
const getBrickFieldPath = (props: {
	brickIndex: number;
	key: string;
	groupRef?: string;
}): BrickFieldPath | undefined => {
	return untrack(() => {
		const brick = get.bricks[props.brickIndex];
		if (!brick) return undefined;

		let index = brickFieldIndexes.get(brick.ref);
		if (!index) {
			index = createBrickFieldIndex(brick.fields);
			brickFieldIndexes.set(brick.ref, index);
		}

		let path = getIndexedFieldPath(index, props.key, props.groupRef);
		let indexedField = path ? getFieldAtPath(brick.fields, path) : undefined;
		if (indexedField?.key === props.key) return path;

		index = createBrickFieldIndex(brick.fields);
		brickFieldIndexes.set(brick.ref, index);
		path = getIndexedFieldPath(index, props.key, props.groupRef);
		indexedField = path ? getFieldAtPath(brick.fields, path) : undefined;
		return indexedField?.key === props.key ? path : undefined;
	});
};

let cachedInitialSnapshot: BrickSnapshot[] | null = null;
let cachedInitialContentSnapshot: ReturnType<
	typeof createContentComparisonSnapshot
> | null = null;
let cachedInitialStructureSnapshot: ReturnType<
	typeof createBuilderBrickStructureSnapshot
> | null = null;

/** Drops saved baselines when the builder resets so dirty checks cannot reuse another document's state. */
const clearInitialSnapshotCaches = () => {
	cachedInitialSnapshot = null;
	cachedInitialContentSnapshot = null;
	cachedInitialStructureSnapshot = null;
};

/** Precomputes each baseline representation once when a save completes. */
const cacheInitialSnapshots = (snapshot: BrickSnapshot[]) => {
	cachedInitialSnapshot = snapshot;
	cachedInitialContentSnapshot = createContentComparisonSnapshot(snapshot);
	cachedInitialStructureSnapshot =
		createBuilderBrickStructureSnapshot(snapshot);
};

interface DirtyComparisonCache {
	revision: number;
	snapshotRevision: number;
	value: boolean;
}

/** Creates an invalidated comparison cache so the first read always computes the current dirty state. */
const createEmptyDirtyComparisonCache = (): DirtyComparisonCache => ({
	revision: -1,
	snapshotRevision: -1,
	value: false,
});

const documentDirtyCache = createEmptyDirtyComparisonCache();
const contentDirtyCache = createEmptyDirtyComparisonCache();
const structureDirtyCache = createEmptyDirtyComparisonCache();

/** Lazily restores derived saved baselines when callers provide the initial snapshot through lower-level store access. */
const ensureInitialSnapshotCaches = () => {
	if (get.initialSnapshot === null) {
		clearInitialSnapshotCaches();
		return;
	}
	if (cachedInitialSnapshot !== null) return;

	cacheInitialSnapshots(
		JSON.parse(JSON.stringify(unwrap(get.initialSnapshot))) as BrickSnapshot[],
	);
};

/** Compares the complete current builder state with its saved baseline for navigation and status indicators. */
const calculateDocumentMutated = (): boolean => {
	ensureInitialSnapshotCaches();
	if (cachedInitialSnapshot === null) {
		return get.bricks.some(
			(brick) => brick.type === "builder" || brick.fields.length > 0,
		);
	}
	return !safeDeepEqual(
		createBricksSnapshot(get.bricks),
		cachedInitialSnapshot,
	);
};

/**
 * Runs one deep document comparison per mutation revision, then shares the
 * result across the save button, navigation guard, autosave, and preview.
 */
const getDocumentMutated = (): boolean => {
	const revision = get.documentRevision;
	const snapshotRevision = get.snapshotRevision;
	if (
		documentDirtyCache.revision === revision &&
		documentDirtyCache.snapshotRevision === snapshotRevision
	) {
		return documentDirtyCache.value;
	}

	documentDirtyCache.revision = revision;
	documentDirtyCache.snapshotRevision = snapshotRevision;
	documentDirtyCache.value = untrack(calculateDocumentMutated);
	return documentDirtyCache.value;
};

/** Detects unsaved content while ignoring UI-only repeater state. */
const getDocumentContentMutated = (): boolean => {
	const hasInitialSnapshot = get.initialSnapshot !== null;
	const revision = hasInitialSnapshot
		? get.contentRevision
		: get.documentRevision;
	const snapshotRevision = get.snapshotRevision;
	if (
		contentDirtyCache.revision === revision &&
		contentDirtyCache.snapshotRevision === snapshotRevision
	) {
		return contentDirtyCache.value;
	}

	contentDirtyCache.revision = revision;
	contentDirtyCache.snapshotRevision = snapshotRevision;
	contentDirtyCache.value = untrack(() => {
		ensureInitialSnapshotCaches();
		if (cachedInitialContentSnapshot === null) {
			return calculateDocumentMutated();
		}
		return !safeDeepEqual(
			createContentComparisonSnapshot(createBricksSnapshot(get.bricks)),
			cachedInitialContentSnapshot,
		);
	});
	return contentDirtyCache.value;
};

/** Detects unsaved builder additions, removals, or order changes. */
const getBuilderBrickStructureMutated = (): boolean => {
	const revision = get.structureRevision;
	const snapshotRevision = get.snapshotRevision;
	if (
		structureDirtyCache.revision === revision &&
		structureDirtyCache.snapshotRevision === snapshotRevision
	) {
		return structureDirtyCache.value;
	}

	structureDirtyCache.revision = revision;
	structureDirtyCache.snapshotRevision = snapshotRevision;
	structureDirtyCache.value = untrack(() => {
		ensureInitialSnapshotCaches();
		const current = createBuilderBrickStructureSnapshot(get.bricks);
		if (cachedInitialStructureSnapshot === null) return current.length > 0;
		return !safeDeepEqual(current, cachedInitialStructureSnapshot);
	});
	return structureDirtyCache.value;
};

const brickStore = {
	get,
	set,
	getDocumentMutated,
	getDocumentContentMutated,
	getBuilderBrickStructureMutated,
};

export default brickStore;
