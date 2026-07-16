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
import { batch } from "solid-js";
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

export interface BrickData {
	ref: string;
	key: string;
	order: number;
	type: "builder" | "fixed" | "collection-fields";
	open: boolean;
	fields: Array<InternalDocumentField>;
}

interface BrickSnapshot {
	ref: string;
	key: string;
	order: number;
	type: "builder" | "fixed" | "collection-fields";
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
	refs: {},
	reset() {
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
		});
	},
	captureInitialSnapshot(snapshot) {
		set("initialSnapshot", snapshot ?? createBricksSnapshot(get.bricks));
	},
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
	setBricks(document, collection) {
		set(
			"bricks",
			brickHelpers.buildBricks({
				document: structuredClone(unwrap(document)),
				collection: structuredClone(unwrap(collection)),
			}),
		);
	},
	syncBricks(document, collection) {
		const nextBricks = brickHelpers.buildBricks({
			document: structuredClone(unwrap(document)),
			collection: structuredClone(unwrap(collection)),
		});

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
	},
	addBrick(props) {
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
	},
	removeBrick(brickIndex) {
		let brickRemoved = false;

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
		}
	},
	toggleBrickOpen(brickIndex) {
		set(
			"bricks",
			produce((draft) => {
				draft[brickIndex].open = draft[brickIndex].open !== true;
			}),
		);
	},
	swapBrickOrder(props) {
		let brickOrderChanged = false;

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
		}
	},
	// Fields
	setFieldValue(params) {
		let fieldChanged = false;

		set(
			"bricks",
			params.brickIndex,
			"fields",
			produce((fieldsDraft) => {
				const field = brickHelpers.findFieldRecursive({
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
		}
	},
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
	addField(params) {
		const newField = createInternalField({
			fieldConfig: params.fieldConfig,
			locales: params.locales,
			collectionLocalized: get.collectionLocalized,
		});

		// Field belongs on the brick level
		if (params.ref === undefined) {
			set(
				"bricks",
				params.brickIndex,
				"fields",
				produce((fieldsDraft) => {
					fieldsDraft.push(newField);
				}),
			);
			return newField;
		}

		const repeaterKey = params.repeaterKey;
		if (repeaterKey === undefined) return newField;

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
				if (!repeaterField) return;
				if (repeaterField.type !== "repeater") return;

				const group = repeaterField.groups?.find((g) => g.ref === params.ref);
				if (!group) return;

				group.fields.push(newField);
			}),
		);
		return newField;
	},
	ensureFields(params) {
		set(
			"bricks",
			params.brickIndex,
			"fields",
			produce((fieldsDraft) => {
				ensureFieldsForConfigs({
					fields: fieldsDraft,
					fieldConfigs: params.fieldConfig,
					locales: params.locales,
					collectionLocalized: get.collectionLocalized,
				});
			}),
		);
	},
	// Groups
	addRepeaterGroup(params) {
		let groupAdded = false;

		set(
			"bricks",
			params.brickIndex,
			"fields",
			produce((fieldsDraft) => {
				const field = brickHelpers.findFieldRecursive({
					fields: fieldsDraft,
					targetKey: params.key,
					groupRef: params.ref,
					repeaterKey: params.parentRepeaterKey,
				});

				if (!field) return;
				if (field.type !== "repeater") return;
				if (field.groups === undefined) field.groups = [];

				const groupFields: InternalDocumentField[] = [];

				for (const field of flattenStructuralScopeConfigs(params.fieldConfig)) {
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
		}
	},
	removeRepeaterGroup(params) {
		let groupRemoved = false;

		set(
			"bricks",
			params.brickIndex,
			"fields",
			produce((fieldsDraft) => {
				const field = brickHelpers.findFieldRecursive({
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
		}
	},
	swapGroupOrder(params) {
		let groupOrderChanged = false;

		set(
			"bricks",
			params.brickIndex,
			"fields",
			produce((fieldsDraft) => {
				const field = brickHelpers.findFieldRecursive({
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
		}
	},
	toggleGroupOpen: (props) => {
		set(
			"bricks",
			props.brickIndex,
			"fields",
			produce((fieldsDraft) => {
				const field = brickHelpers.findFieldRecursive({
					fields: fieldsDraft,
					targetKey: props.repeaterKey,
					groupRef: props.parentRef,
					repeaterKey: props.parentRepeaterKey,
				});

				if (!field?.groups) return;

				const group = field.groups.find((g) => g.ref === props.ref);
				if (!group) return;

				group.open = group.open !== true;
			}),
		);
	},
	setRefs(document) {
		const refs = structuredClone(unwrap(document?.refs));
		set("refs", refs || {});
	},
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
	mergeDraftCheckResponse(response) {
		const collectionFieldsPseudoBrickIndex = get.bricks.findIndex(
			(brick) => brick.type === "collection-fields",
		);

		if (collectionFieldsPseudoBrickIndex !== -1 && response.fields.length > 0) {
			set(
				"bricks",
				collectionFieldsPseudoBrickIndex,
				"fields",
				produce((fields) => {
					mergeDraftCheckFields(fields, response.fields);
				}),
			);
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
		});
	},
	startRelationFieldDrag() {
		set("relationFieldDragCount", (prev) => prev + 1);
	},
	endRelationFieldDrag() {
		set("relationFieldDragCount", (prev) => Math.max(0, prev - 1));
	},
});

const createInternalField = (props: {
	fieldConfig: CollectionDataFieldConfig;
	locales: string[];
	collectionLocalized: boolean;
}): InternalDocumentField => {
	const newField: InternalDocumentField = {
		key: props.fieldConfig.key,
		type: props.fieldConfig.type,
	};

	if (props.fieldConfig.type !== "repeater") {
		if (
			props.fieldConfig.localized === true &&
			props.collectionLocalized === true
		) {
			newField.translations = {};

			for (const locale of props.locales) {
				newField.translations[locale] = props.fieldConfig.default;
			}
		} else {
			newField.value = props.fieldConfig.default;
		}
	}

	return newField;
};

const ensureFieldsForConfigs = (props: {
	fields: InternalDocumentField[];
	fieldConfigs: CollectionFieldConfig[];
	locales: string[];
	collectionLocalized: boolean;
}) => {
	const dataFieldConfigs = flattenStructuralScopeConfigs(props.fieldConfigs);
	const fieldsByKey = new Map(props.fields.map((field) => [field.key, field]));

	for (const fieldConfig of dataFieldConfigs) {
		let field = fieldsByKey.get(fieldConfig.key);

		if (!field) {
			field = createInternalField({
				fieldConfig,
				locales: props.locales,
				collectionLocalized: props.collectionLocalized,
			});
			props.fields.push(field);
			fieldsByKey.set(field.key, field);
		}

		if (fieldConfig.type !== "repeater" || field.type !== "repeater") continue;

		for (const group of field.groups ?? []) {
			ensureFieldsForConfigs({
				fields: group.fields,
				fieldConfigs: fieldConfig.fields,
				locales: props.locales,
				collectionLocalized: props.collectionLocalized,
			});
		}
	}
};

const createBrickSnapshot = (brick: BrickData): BrickSnapshot => ({
	ref: brick.ref,
	key: brick.key,
	order: brick.order,
	type: brick.type,
	fields: JSON.parse(JSON.stringify(brick.fields)),
});

const createBricksSnapshot = (bricks: BrickData[]): BrickSnapshot[] =>
	bricks.map(createBrickSnapshot);

/** Normalizes UI-only repeater state before comparing document content. */
const normalizeGroupOpenState = (
	fields: InternalDocumentField[],
): InternalDocumentField[] =>
	fields.map((field) => ({
		...field,
		...(field.groups
			? {
					groups: field.groups.map((group) => ({
						...group,
						open: false,
						fields: normalizeGroupOpenState(group.fields),
					})),
				}
			: {}),
	}));

/** Creates a content comparison that ignores whether groups are expanded. */
const createContentComparisonSnapshot = (snapshots: BrickSnapshot[]) =>
	snapshots.map((snapshot) => ({
		...snapshot,
		fields: normalizeGroupOpenState(snapshot.fields),
	}));

/** Captures the persisted builder identity used by preview field targets. */
const createBuilderBrickStructureSnapshot = (
	bricks: Array<Pick<BrickSnapshot, "key" | "order" | "type">>,
) =>
	bricks
		.filter((brick) => brick.type === "builder")
		.map((brick) => ({ key: brick.key, order: brick.order }));

const getDocumentMutated = (): boolean => {
	if (get.initialSnapshot === null) {
		return get.bricks.some((b) => b.type === "builder" || b.fields.length > 0);
	}
	const currentSnapshot = createBricksSnapshot(get.bricks);
	return !safeDeepEqual(currentSnapshot, get.initialSnapshot);
};

/** Detects unsaved content while ignoring UI-only repeater state. */
const getDocumentContentMutated = (): boolean => {
	if (get.initialSnapshot === null) return getDocumentMutated();
	return !safeDeepEqual(
		createContentComparisonSnapshot(createBricksSnapshot(get.bricks)),
		createContentComparisonSnapshot(get.initialSnapshot),
	);
};

/** Detects unsaved builder additions, removals, or order changes. */
const getBuilderBrickStructureMutated = (): boolean => {
	const current = createBuilderBrickStructureSnapshot(get.bricks);
	if (get.initialSnapshot === null) return current.length > 0;
	return !safeDeepEqual(
		current,
		createBuilderBrickStructureSnapshot(get.initialSnapshot),
	);
};

const brickStore = {
	get,
	set,
	getDocumentMutated,
	getDocumentContentMutated,
	getBuilderBrickStructureMutated,
};

export default brickStore;
