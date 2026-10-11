import type {
	BrickError,
	Collection,
	DocumentVersionCheckResponse,
	FieldError,
	FieldValue,
	InternalCollectionDocument,
	InternalDocumentField,
	RefResource,
	RefResourceMap,
	Refs,
} from "@types";
import { nanoid } from "nanoid";
import { batch, untrack } from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";
import { mergeDraftCheckFields } from "@/store/brickStore/utils/draft-check-helpers";
import type {
	CollectionBrickConfig,
	CollectionDataFieldConfig,
	CollectionFieldConfig,
	CollectionLeafFieldConfig,
	CollectionNonTabFieldConfig,
} from "@/types/collection-config";
import brickHelpers, { clearTargetFieldErrors } from "@/utils/brick-helpers";
import { upsertRefs } from "@/utils/document-ref-helpers";
import safeDeepEqual from "@/utils/safe-deep-equal";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";
import {
	type BrickLayoutItem,
	type BricksEditState,
	createEditStack,
	type EditEntry,
	type EditSource,
	type FieldEditTarget,
} from "./utils/edit-stack";
import {
	type BrickFieldIndex,
	type BrickFieldPath,
	createBrickFieldIndex,
	getFieldAtPath,
	getIndexedFieldPath,
} from "./utils/field-index";
import { createInternalField, ensureFieldsForConfigs } from "./utils/fields";
import {
	type BrickSnapshot,
	createBricksSnapshot,
	createBuilderBrickStructureSnapshot,
	createContentComparisonSnapshot,
	normalizeGroupOpenState,
} from "./utils/snapshots";

export interface BrickData {
	ref: string;
	key: string;
	order: number;
	type: "builder" | "fixed" | "embedded" | "collection-fields";
	open: boolean;
	fields: Array<InternalDocumentField>;
}

interface BrickSnapshotPayload {
	bricks?: Array<BrickData>;
	fields?: Array<InternalDocumentField>;
}

/** Resources that field pickers can add, excluding agents supplied through responses. */
type FieldRefResource = Exclude<RefResource, "agents">;

type AddRefInput = {
	[TResource in FieldRefResource]: {
		resource: TResource;
		ref: RefResourceMap[TResource] | RefResourceMap[TResource][];
	};
}[FieldRefResource];

/** Initializes defaults before a new brick is ever expanded or saved. */
const createBrickFields = (props: {
	brickConfig: CollectionBrickConfig;
	locales: string[];
	collectionLocalized: boolean;
}) => {
	const fields: InternalDocumentField[] = [];
	ensureFieldsForConfigs({
		fields,
		fieldConfigs: props.brickConfig.fields,
		locales: props.locales,
		collectionLocalized: props.collectionLocalized,
	});
	return fields;
};

/** Each document pane owns its content, refs and dirty-state caches. */
export const createBrickStore = (idPrefix = "") => {
	const [get, set] = createStore<{
		bricks: Array<BrickData>;
		fieldsErrors: Array<FieldError>;
		brickErrors: Array<BrickError>;
		initialSnapshot: BrickSnapshot[] | null;
		autoSaveCounter: number;
		autoSavePaused: boolean;
		relationFieldDragCount: number;
		locked: boolean;
		/** The saved content the editor's state is based on, sent with saves so one based on content saved since is refused. Null until loaded, or after a save whose content the next load brings. */
		baseContentId: string | null;
		/** The saved content moved on while there were unsaved edits, eg. the agent changed it. Autosave waits until the reader chooses. */
		contentChanged: boolean;
		/** The agent changed the content through its builder tools. Autosave waits until the person saves, so they review its changes first. */
		agentEdited: boolean;
		refs: Refs;
		collectionLocalized: boolean;
		documentRevision: number;
		contentRevision: number;
		structureRevision: number;
		snapshotRevision: number;
		/** Advances whenever the undo or redo steps change. */
		editRevision: number;
		reset: () => void;
		setBricks: (
			document?: InternalCollectionDocument,
			collection?: Collection,
		) => void;
		syncBricks: (
			document?: Pick<InternalCollectionDocument, "bricks" | "fields">,
			collection?: Collection,
		) => void;
		applyContent: (props: {
			content: Pick<InternalCollectionDocument, "bricks" | "fields">;
			refs: Refs;
			collection?: Collection;
			/** The agent run making the change, so its reply can offer to undo it. */
			runId: string;
		}) => void;
		captureInitialSnapshot: (snapshot?: BrickSnapshot[]) => void;
		createSnapshotFromPayload: (
			payload: BrickSnapshotPayload,
		) => BrickSnapshot[];
		addBrick: (props: {
			brickConfig: CollectionBrickConfig;
			locales: string[];
		}) => void;
		addEmbeddedBrick: (props: {
			brickConfig: CollectionBrickConfig;
			locales: string[];
		}) => string;
		replaceBrickFields: (props: {
			brickIndex: number;
			fields: InternalDocumentField[];
		}) => void;
		removeBrick: (brickIndex: number) => void;
		toggleBrickOpen: (brickIndex: number) => void;
		swapBrickOrder: (props: {
			brickRef: string;
			targetBrickRef: string;
		}) => void;
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
		setRefs: (refs?: Refs) => void;
		addRef: (input: AddRefInput) => void;
		addRefs: (refs: Refs) => void;
		mergeDraftCheckResponse: (response: DocumentVersionCheckResponse) => void;
		startRelationFieldDrag: () => void;
		endRelationFieldDrag: () => void;
	}>({
		bricks: [],
		fieldsErrors: [],
		brickErrors: [],
		initialSnapshot: null,
		locked: false,
		baseContentId: null,
		contentChanged: false,
		agentEdited: false,
		autoSaveCounter: 0,
		autoSavePaused: false,
		relationFieldDragCount: 0,
		collectionLocalized: false,
		documentRevision: 0,
		contentRevision: 0,
		structureRevision: 0,
		snapshotRevision: 0,
		editRevision: 0,
		refs: {},
		/** Clears all document, validation, lookup, dirty-state and undo data between builder sessions. */
		reset() {
			brickFieldIndexes.clear();
			clearInitialSnapshotCaches();
			batchDepth = 0;
			batchBefore = undefined;
			batch(() => {
				clearEdits();
				set("bricks", []);
				set("fieldsErrors", []);
				set("brickErrors", []);
				set("initialSnapshot", null);
				set("autoSaveCounter", 0);
				set("autoSavePaused", false);
				set("relationFieldDragCount", 0);
				set("collectionLocalized", false);
				set("baseContentId", null);
				set("contentChanged", false);
				set("agentEdited", false);
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
				clearEdits();
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
							draft.map((brick) => [
								brickHelpers.getBrickSyncKey(brick),
								brick,
							]),
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
							if (
								nextBrick.type === "builder" ||
								nextBrick.type === "embedded"
							) {
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
		/** Applies the agent's content as one undoable step while preserving open bricks and groups and pausing autosave until the person saves. */
		applyContent(props) {
			batch(() => {
				recordBricks({ source: { type: "agent", runId: props.runId } }, () =>
					get.syncBricks(props.content, props.collection),
				);
				get.addRefs(props.refs);
				set("autoSaveCounter", (previous) => previous + 1);
				set("agentEdited", true);
			});
		},
		/** Appends an initialized builder brick and schedules autosave for the structural change. */
		addBrick(props) {
			recordBricks({}, () => {
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
								fields: createBrickFields({
									...props,
									collectionLocalized: get.collectionLocalized,
								}),
							});
						}),
					);
					set("autoSaveCounter", (previous) => previous + 1);
					markDocumentChange({ content: true, structure: true });
				});
				rebuildBrickFieldIndex(get.bricks.length - 1);
			});
		},
		/**
		 * Creates a brick owned by a rich-text embedded-brick node. Its fields are
		 * seeded here rather than on first edit, because nothing renders an embedded
		 * brick's body until the edit drawer opens, so it would otherwise save with
		 * no values and preview as a bare brick key.
		 */
		addEmbeddedBrick(props) {
			const ref = nanoid();
			const fields = createBrickFields({
				...props,
				collectionLocalized: get.collectionLocalized,
			});

			recordBricks({}, () => {
				batch(() => {
					set(
						"bricks",
						produce((draft) => {
							draft.push({
								ref,
								key: props.brickConfig.key,
								order: 0,
								type: "embedded",
								open: false,
								fields,
							});
						}),
					);
					set("autoSaveCounter", (previous) => previous + 1);
					markDocumentChange({ content: true, structure: true });
				});
				rebuildBrickFieldIndex(get.bricks.length - 1);
			});
			return ref;
		},
		/** Replaces one brick's fields and refreshes the derived state used by editing and autosave. */
		replaceBrickFields(props) {
			if (
				!get.bricks[props.brickIndex] ||
				safeDeepEqual(get.bricks[props.brickIndex].fields, props.fields)
			) {
				return;
			}

			recordBricks({ brickIndex: props.brickIndex }, () => {
				batch(() => {
					set(
						"bricks",
						props.brickIndex,
						"fields",
						structuredClone(unwrap(props.fields)),
					);
					set("autoSaveCounter", (previous) => previous + 1);
					markDocumentChange({ content: true });
				});
				rebuildBrickFieldIndex(props.brickIndex);
			});
		},
		/** Removes a builder brick and its field index so autosave and dirty checks reflect the structural deletion. */
		removeBrick(brickIndex) {
			let brickRemoved = false;
			const removedBrickRef = get.bricks[brickIndex]?.ref;

			recordBricks({}, () => {
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
			});
			if (brickRemoved && removedBrickRef) {
				brickFieldIndexes.delete(removedBrickRef);
			}
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
			recordBricks({}, () => {
				let brickOrderChanged = false;

				batch(() => {
					set(
						"bricks",
						produce((draft) => {
							const brick = draft.find((b) => b.ref === props.brickRef);
							const targetBrick = draft.find(
								(b) => b.ref === props.targetBrickRef,
							);

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
			});
		},
		// Fields
		/** Updates a localized or shared field only when its value changes, recording the step, then clears stale errors and schedules autosave. */
		setFieldValue(params) {
			const brickRef = get.bricks[params.brickIndex]?.ref;
			if (brickRef === undefined) return;

			const target: FieldEditTarget = {
				brickRef,
				key: params.key,
				groupRef: params.ref,
				repeaterKey: params.repeaterKey,
				locale:
					params.fieldConfig.localized === true &&
					get.collectionLocalized === true
						? params.contentLocale
						: undefined,
			};
			const written = writeFieldValue({
				brickIndex: params.brickIndex,
				target,
				value: params.value,
				clearFromItemIndex: params.clearFromItemIndex,
			});
			if (!written || batchDepth > 0) return;

			pushEdit({
				kind: "field",
				target,
				before: written.previous,
				after: structuredClone(unwrap(params.value)),
				source: { type: "user" },
				at: Date.now(),
			});
		},
		/** Clears validation errors for the edited field while retaining errors that belong to other fields or groups. */
		clearFieldErrors(params) {
			clearErrors({
				brickIndex: params.brickIndex,
				key: params.key,
				localeCode:
					params.fieldConfig.localized === true &&
					get.collectionLocalized === true
						? params.contentLocale
						: undefined,
				groupRef: params.ref,
				clearFromItemIndex: params.clearFromItemIndex,
			});
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

			recordBricks({ brickIndex: params.brickIndex }, () => {
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
			});
		},
		/** Removes a repeater group and rebuilds indexed paths so deleted nested fields cannot be resolved later. */
		removeRepeaterGroup(params) {
			let groupRemoved = false;
			const fieldPath = getBrickFieldPath({
				brickIndex: params.brickIndex,
				key: params.repeaterKey,
				groupRef: params.ref,
			});

			recordBricks({ brickIndex: params.brickIndex }, () => {
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
			});
		},
		/** Reorders two repeater groups and refreshes paths so persisted order and indexed access remain aligned. */
		swapGroupOrder(params) {
			let groupOrderChanged = false;
			const fieldPath = getBrickFieldPath({
				brickIndex: params.brickIndex,
				key: params.repeaterKey,
				groupRef: params.ref,
			});

			recordBricks({ brickIndex: params.brickIndex }, () => {
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
			});
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
		setRefs(responseRefs) {
			set("refs", structuredClone(unwrap(responseRefs ?? {})));
		},
		/** Upserts resolved references by stable identity so newly selected records are available without a refetch. */
		addRef(input) {
			if (input.resource === "documents") {
				set(
					"refs",
					"documents",
					upsertRefs(get.refs.documents, input.ref, (existing, next) => {
						return (
							existing.collectionKey === next.collectionKey &&
							existing.id === next.id
						);
					}),
				);
				return;
			}

			if (input.resource === "media") {
				set(
					"refs",
					"media",
					upsertRefs(get.refs.media, input.ref, (existing, next) => {
						return existing.id === next.id;
					}),
				);
				return;
			}

			set(
				"refs",
				"users",
				upsertRefs(get.refs.users, input.ref, (existing, next) => {
					return existing.id === next.id;
				}),
			);
		},
		/** Upserts every resource in a refs response, eg. the media an agent's changes link to. */
		addRefs(refs) {
			batch(() => {
				if (refs.documents) {
					get.addRef({ resource: "documents", ref: refs.documents });
				}
				if (refs.media) get.addRef({ resource: "media", ref: refs.media });
				if (refs.users) get.addRef({ resource: "users", ref: refs.users });
			});
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
						if (brick.type === "builder" || brick.type === "embedded") {
							return brick.ref === responseBrick.ref;
						}
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

	/** Clears validation errors for one field, at brick level or inside a repeater group, keeping the rest. */
	const clearErrors = (target: {
		brickIndex: number;
		key: string;
		localeCode?: string;
		groupRef?: string;
		clearFromItemIndex?: number;
	}) => {
		const brick = get.bricks[target.brickIndex];
		if (!brick) return;

		if (brick.type === "collection-fields") {
			set(
				"fieldsErrors",
				produce((draft) => {
					const nextErrors = clearTargetFieldErrors(draft, target);
					draft.splice(0, draft.length, ...nextErrors);
				}),
			);
			return;
		}

		set(
			"brickErrors",
			produce((draft) => {
				const brickErrorIndex = draft.findIndex(
					(error) => error.ref === brick.ref && error.key === brick.key,
				);
				if (brickErrorIndex === -1) return;

				const nextFields = clearTargetFieldErrors(
					draft[brickErrorIndex].fields,
					target,
				);
				if (nextFields.length === 0) {
					draft.splice(brickErrorIndex, 1);
					return;
				}

				draft[brickErrorIndex].fields = nextFields;
			}),
		);
	};

	/** Writes shared or localized values without recording undo steps, returning `{ previous }` on a change or nothing for missing or unchanged fields. */
	const writeFieldValue = (props: {
		brickIndex: number;
		target: FieldEditTarget;
		value: InternalDocumentField["value"];
		clearFromItemIndex?: number;
	}): { previous: InternalDocumentField["value"] } | undefined => {
		const fieldPath = getBrickFieldPath({
			brickIndex: props.brickIndex,
			key: props.target.key,
			groupRef: props.target.groupRef,
		});
		let written: { previous: InternalDocumentField["value"] } | undefined;

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
							targetKey: props.target.key,
							groupRef: props.target.groupRef,
							repeaterKey: props.target.repeaterKey,
						});
					if (!field) return;

					const locale = props.target.locale;
					const previous =
						locale !== undefined ? field.translations?.[locale] : field.value;
					if (safeDeepEqual(previous, props.value)) return;

					written = { previous: structuredClone(unwrap(previous)) };
					if (locale !== undefined) {
						if (!field.translations) field.translations = {};
						field.translations[locale] = props.value;
					} else {
						field.value = props.value;
					}
				}),
			);

			if (written) {
				clearErrors({
					brickIndex: props.brickIndex,
					key: props.target.key,
					localeCode: props.target.locale,
					groupRef: props.target.groupRef,
					clearFromItemIndex: props.clearFromItemIndex,
				});
				set("autoSaveCounter", (prev) => prev + 1);
				markDocumentChange({ content: true });
			}
		});
		return written;
	};

	// ----------------------------------------
	// Edits
	const editStack = createEditStack();
	//* edits made inside a batch are recorded as one step when it ends
	let batchDepth = 0;
	let batchBefore: BricksCapture | undefined;

	type BricksCapture = {
		layout: BrickLayoutItem[];
		/** The fields a step may change, serialised to tell afterwards whether it did. */
		fields: Map<string, string>;
	};

	/** Notes every brick's position, and the fields of one brick or all of them. */
	const captureBricks = (brickIndex?: number): BricksCapture =>
		untrack(() => {
			const fields = new Map<string, string>();
			const layout = get.bricks.map((brick, index): BrickLayoutItem => {
				if (brickIndex === undefined || brickIndex === index) {
					fields.set(brick.ref, JSON.stringify(unwrap(brick.fields)));
				}
				return {
					ref: brick.ref,
					key: brick.key,
					type: brick.type,
					order: brick.order,
				};
			});
			return { layout, fields };
		});

	/** Works out which bricks a step changed, added or removed, or nothing when it changed none. */
	const diffBricks = (
		before: BricksCapture,
		after: BricksCapture,
	):
		| Pick<Extract<EditEntry, { kind: "bricks" }>, "before" | "after">
		| undefined => {
		const beforeFields: BricksEditState["fields"] = {};
		const afterFields: BricksEditState["fields"] = {};
		for (const ref of new Set([
			...before.fields.keys(),
			...after.fields.keys(),
		])) {
			const previous = before.fields.get(ref);
			const next = after.fields.get(ref);
			if (previous === next) continue;

			const previousFields: InternalDocumentField[] | undefined =
				previous === undefined ? undefined : JSON.parse(previous);
			const nextFields: InternalDocumentField[] | undefined =
				next === undefined ? undefined : JSON.parse(next);
			//* repeater items that only opened or closed changed no content
			if (
				previousFields &&
				nextFields &&
				safeDeepEqual(
					normalizeGroupOpenState(previousFields),
					normalizeGroupOpenState(nextFields),
				)
			) {
				continue;
			}
			if (previousFields) beforeFields[ref] = previousFields;
			if (nextFields) afterFields[ref] = nextFields;
		}

		if (
			Object.keys(beforeFields).length === 0 &&
			Object.keys(afterFields).length === 0 &&
			safeDeepEqual(before.layout, after.layout)
		) {
			return undefined;
		}
		return {
			before: { layout: before.layout, fields: beforeFields },
			after: { layout: after.layout, fields: afterFields },
		};
	};

	const pushEdit = (entry: EditEntry) => {
		editStack.push(entry);
		set("editRevision", (previous) => previous + 1);
	};

	/** Records the edits made since the batch began as one step, and stops collecting. */
	const commitBatch = () => {
		if (!batchBefore) return;
		const change = diffBricks(batchBefore, captureBricks());
		batchBefore = undefined;
		if (!change) return;
		pushEdit({
			kind: "bricks",
			...change,
			source: { type: "user" },
			at: Date.now(),
		});
	};

	const clearEdits = () => {
		editStack.clear();
		set("editRevision", (previous) => previous + 1);
	};

	/** Records structural changes as one step, optionally comparing one brick, with user changes joining batches and agent changes staying separate for chat undo. */
	const recordBricks = (
		props: { source?: EditSource; brickIndex?: number },
		mutate: () => void,
	) => {
		const batching = batchDepth > 0;
		if (batching && props.source?.type !== "agent") {
			mutate();
			return;
		}
		//* what the batch collected so far goes first, and it carries on collecting after the agent's step
		if (batching) commitBatch();

		const before = captureBricks(props.brickIndex);
		mutate();
		const change = diffBricks(before, captureBricks(props.brickIndex));
		if (change) {
			pushEdit({
				kind: "bricks",
				...change,
				source: props.source ?? { type: "user" },
				at: Date.now(),
			});
		}
		if (batching) batchBefore = captureBricks();
	};

	/** Puts the bricks back as a step left them, keeping whichever bricks and groups are open now. */
	const applyBricksState = (state: BricksEditState) => {
		batch(() => {
			set(
				"bricks",
				produce((draft) => {
					const current = new Map(draft.map((brick) => [brick.ref, brick]));
					const next = state.layout.map((item): BrickData => {
						const existing = current.get(item.ref);
						const fields = state.fields[item.ref];
						return {
							...item,
							open: existing?.open ?? false,
							fields: fields
								? brickHelpers.preserveRepeaterGroupOpenState(
										structuredClone(fields),
										existing?.fields ?? [],
									)
								: (existing?.fields ?? []),
						};
					});
					draft.splice(0, draft.length, ...next);
				}),
			);
			set("autoSaveCounter", (prev) => prev + 1);
			markDocumentChange({ content: true, structure: true });
		});
		rebuildAllBrickFieldIndexes();
	};

	/** Applies the side of a step that undoing or redoing it leads to. */
	const applyEdit = (entry: EditEntry, direction: "undo" | "redo") => {
		if (entry.kind === "bricks") {
			applyBricksState(direction === "undo" ? entry.before : entry.after);
			return;
		}

		const brickIndex = untrack(() =>
			get.bricks.findIndex((brick) => brick.ref === entry.target.brickRef),
		);
		if (brickIndex === -1) return;
		writeFieldValue({
			brickIndex,
			target: entry.target,
			value: structuredClone(direction === "undo" ? entry.before : entry.after),
		});
	};

	const stepEdits = (direction: "undo" | "redo") => {
		if (untrack(() => get.locked)) return undefined;
		const entry = direction === "undo" ? editStack.undo() : editStack.redo();
		if (!entry) return undefined;

		batch(() => {
			applyEdit(entry, direction);
			//* the agent's changes are back, so autosave waits for the person to review them again
			if (direction === "redo" && entry.source.type === "agent") {
				set("agentEdited", true);
			}
			set("editRevision", (previous) => previous + 1);
		});
		return entry;
	};

	/** Undo and redo for the pane's content, with steps the builder and the agent's tools record as they edit. */
	const edits = {
		/** Steps back and returns the step for the builder to show, or nothing when there is none or the pane is locked. */
		undo: () => stepEdits("undo"),
		redo: () => stepEdits("redo"),
		canUndo: () => {
			get.editRevision;
			return editStack.peekUndo() !== undefined;
		},
		canRedo: () => {
			get.editRevision;
			return editStack.peekRedo() !== undefined;
		},
		/** The step undo would take next. */
		peekUndo: () => {
			get.editRevision;
			return editStack.peekUndo();
		},
		/** Drops every step, eg. once content saved elsewhere replaces what they were made against. */
		clear: clearEdits,
		/** Holds the steps made until `endBatch`, which records them as one, eg. edits made in a drawer. */
		beginBatch: () => {
			if (batchDepth++ === 0) batchBefore = captureBricks();
		},
		endBatch: () => {
			if (batchDepth === 0) return;
			if (--batchDepth === 0) commitBatch();
		},
	};

	const rebuildBrickFieldIndex = (brickIndex: number) => {
		untrack(() => {
			const brick = get.bricks[brickIndex];
			if (!brick) return;
			brickFieldIndexes.set(brick.ref, createBrickFieldIndex(brick.fields));
		});
	};

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
			JSON.parse(
				JSON.stringify(unwrap(get.initialSnapshot)),
			) as BrickSnapshot[],
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
		idPrefix,
		get,
		set,
		edits,
		getDocumentMutated,
		getDocumentContentMutated,
		getBuilderBrickStructureMutated,
	};

	return brickStore;
};

const brickStore = createBrickStore();
export default brickStore;
