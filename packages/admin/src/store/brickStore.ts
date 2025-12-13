import { batch } from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";
import { nanoid } from "nanoid";
import equal from "fast-deep-equal/es6";
import brickHelpers from "@/utils/brick-helpers";
import type {
	FieldError,
	FieldResponse,
	DocumentResponse,
	CollectionResponse,
	FieldResponseValue,
	FieldRefs,
	CFConfig,
	CollectionBrickConfig,
	FieldTypes,
	BrickError,
	DocumentRef,
} from "@types";
import type { FocusState } from "@/hooks/useFocusPreservation";

export interface BrickData {
	ref: string;
	key: string;
	order: number;
	type: "builder" | "fixed" | "collection-fields";
	open: boolean;
	fields: Array<FieldResponse>;
}

interface BrickSnapshot {
	ref: string;
	key: string;
	order: number;
	type: "builder" | "fixed" | "collection-fields";
	fields: Array<FieldResponse>;
}

const [get, set] = createStore<{
	bricks: Array<BrickData>;
	fieldsErrors: Array<FieldError>;
	brickErrors: Array<BrickError>;
	initialSnapshot: BrickSnapshot[] | null;
	autoSaveCounter: number;
	skipAutoSave: boolean;
	locked: boolean;
	refs: Partial<Record<FieldTypes, FieldRefs[]>>;
	imagePreview: {
		open: boolean;
		data:
			| {
					title: string;
					description?: string;
					image?: string;
			  }
			| undefined;
	};
	collectionTranslations: boolean;
	focusState: FocusState | null;
	reset: () => void;
	setBricks: (
		document?: DocumentResponse,
		collection?: CollectionResponse,
	) => void;
	captureInitialSnapshot: () => void;
	addBrick: (props: {
		brickConfig: CollectionBrickConfig;
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
		fieldConfig: CFConfig<Exclude<FieldTypes, "repeater" | "tab">>;
		repeaterKey?: string;
		ref?: string;
		value: FieldResponseValue;
		contentLocale: string;
	}) => void;
	addField: (params: {
		brickIndex: number;
		fieldConfig: CFConfig<Exclude<FieldTypes, "tab">>;
		ref?: string;
		repeaterKey?: string;
		locales: string[];
	}) => FieldResponse;
	addRepeaterGroup: (params: {
		brickIndex: number;
		fieldConfig: CFConfig<Exclude<FieldTypes, "tab">>[];
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
	setRefs: (document?: DocumentResponse) => void;
	addRef: (fieldType: "media" | "document" | "user", ref: FieldRefs) => void;
}>({
	bricks: [],
	fieldsErrors: [],
	brickErrors: [],
	initialSnapshot: null,
	locked: false,
	autoSaveCounter: 0,
	skipAutoSave: true,
	collectionTranslations: false,
	refs: {},
	imagePreview: {
		open: false,
		data: undefined,
	},
	focusState: null,
	reset() {
		batch(() => {
			set("bricks", []);
			set("fieldsErrors", []);
			set("brickErrors", []);
			set("initialSnapshot", null);
			set("autoSaveCounter", 0);
			set("skipAutoSave", true);
			set("collectionTranslations", false);
			set("refs", {});
			set("focusState", null);
		});
	},
	captureInitialSnapshot() {
		set("initialSnapshot", createBricksSnapshot(get.bricks));
	},
	// Bricks
	setBricks(document, collection) {
		const bricks = structuredClone(unwrap(document?.bricks));
		const fields = structuredClone(unwrap(document?.fields));

		set(
			"bricks",
			produce((draft) => {
				// Set with data from document respponse
				draft.push({
					ref: "collection-pseudo-brick",
					key: "collection-pseudo-brick",
					order: -1,
					type: "collection-fields",
					open: false,
					fields: fields || [],
				});

				for (const brick of bricks || []) {
					draft.push(brick);
				}

				// add empty fixed bricks
				for (const brick of collection?.fixedBricks || []) {
					const brickIndex = draft.findIndex(
						(b) => b.key === brick.key && b.type === "fixed",
					);
					if (brickIndex !== -1) continue;

					draft.push({
						ref: nanoid(),
						key: brick.key,
						fields: [],
						type: "fixed",
						open: false,
						order: -1,
					});
				}
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
		set(
			"bricks",
			produce((draft) => {
				if (draft[brickIndex].type !== "builder") return;
				draft.splice(brickIndex, 1);
			}),
		);
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
		set(
			"bricks",
			produce((draft) => {
				const brick = draft.find((b) => b.ref === props.brickRef);
				const targetBrick = draft.find((b) => b.ref === props.targetBrickRef);

				if (!brick || !targetBrick) return;

				const order = brick.order;
				brick.order = targetBrick.order;
				targetBrick.order = order;

				draft.sort((a, b) => a.order - b.order);
			}),
		);
	},
	// Fields
	setFieldValue(params) {
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
					params.fieldConfig.config.useTranslations === true &&
					get.collectionTranslations === true
				) {
					if (!field.translations) field.translations = {};
					field.translations[params.contentLocale] = params.value;
				} else {
					field.value = params.value;
				}
			}),
		);
		set("autoSaveCounter", (prev) => prev + 1);
	},
	addField(params) {
		const newField: FieldResponse = {
			key: params.fieldConfig.key,
			type: params.fieldConfig.type,
		};

		if (params.fieldConfig.type !== "repeater") {
			if (
				params.fieldConfig.config.useTranslations === true &&
				get.collectionTranslations === true
			) {
				newField.translations = {};

				for (const locale of params.locales) {
					newField.translations[locale] = params.fieldConfig.config.default;
				}
			} else {
				newField.value = params.fieldConfig.config.default;
			}
		}

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
	// Groups
	addRepeaterGroup(params) {
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

				const groupFields: FieldResponse[] = [];

				for (const field of params.fieldConfig) {
					const newField: FieldResponse = {
						key: field.key,
						type: field.type,
					};

					if (field.type !== "repeater") {
						if (
							field.config.useTranslations === true &&
							get.collectionTranslations === true
						) {
							newField.translations = {};

							for (const locale of params.locales) {
								newField.translations[locale] = field.config.default;
							}
						} else {
							newField.value = field.config.default;
						}
					}

					groupFields.push(newField);
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
			}),
		);
	},
	removeRepeaterGroup(params) {
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
			}),
		);
	},
	swapGroupOrder(params) {
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

				field.groups.sort((a, b) => a.order - b.order);
			}),
		);
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

				if (!field || !field.groups) return;

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
				if (!draft[fieldType]) {
					draft[fieldType] = [];
				}

				const refs = draft[fieldType];

				const existingIndex = refs.findIndex((existing) => {
					if (!existing || !ref) return false;

					if (fieldType === "document") {
						const existingDoc = existing as DocumentRef;
						const refDoc = ref as DocumentRef;
						if (!existingDoc || !refDoc) return false;
						return (
							existingDoc.collectionKey === refDoc.collectionKey &&
							existingDoc.id === refDoc.id
						);
					}

					const existingItem = existing;
					const refItem = ref;
					if (!existingItem || !refItem) return false;
					return existingItem.id === refItem.id;
				});

				if (existingIndex !== -1) {
					refs[existingIndex] = ref;
				} else {
					refs.push(ref);
				}
			}),
		);
	},
});

const createBrickSnapshot = (brick: BrickData): BrickSnapshot => ({
	ref: brick.ref,
	key: brick.key,
	order: brick.order,
	type: brick.type,
	fields: JSON.parse(JSON.stringify(brick.fields)),
});

const createBricksSnapshot = (bricks: BrickData[]): BrickSnapshot[] =>
	bricks.map(createBrickSnapshot);

const getDocumentMutated = (): boolean => {
	if (get.initialSnapshot === null) {
		return get.bricks.some((b) => b.type === "builder" || b.fields.length > 0);
	}
	const currentSnapshot = createBricksSnapshot(get.bricks);
	return !equal(currentSnapshot, get.initialSnapshot);
};

const brickStore = {
	get,
	set,
	getDocumentMutated,
};

export default brickStore;
