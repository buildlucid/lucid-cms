import { createStore, produce } from "solid-js/store";
import shortUUID from "short-uuid";
import brickHelpers from "@/utils/brick-helpers";
import type {
	FieldErrors,
	FieldResponse,
	CollectionDocumentResponse,
	CollectionResponse,
	FieldResponseValue,
	FieldResponseMeta,
	CFConfig,
	CollectionBrickConfig,
	FieldTypes,
} from "@types";

export interface BrickData {
	id: string | number;
	key: string;
	order: number;
	type: "builder" | "fixed" | "collection-fields";
	open: 1 | 0 | null;
	fields: Array<FieldResponse>;
}

type BrickStoreT = {
	bricks: Array<BrickData>;
	fieldsErrors: Array<FieldErrors>;
	documentMutated: boolean;
	locked: boolean;
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
	// functions
	reset: () => void;
	setBricks: (
		document?: CollectionDocumentResponse,
		collection?: CollectionResponse,
	) => void;
	addBrick: (props: {
		brickConfig: CollectionBrickConfig;
	}) => void;
	removeBrick: (brickIndex: number) => void;
	toggleBrickOpen: (brickIndex: number) => void;
	swapBrickOrder: (props: {
		brickIndex: number;
		targetBrickIndex: number;
	}) => void;
	setFieldValue: (params: {
		brickIndex: number;
		key: string;
		fieldConfig: CFConfig<Exclude<FieldTypes, "repeater" | "tab">>;
		repeaterKey?: string;
		groupId?: number | string;
		value: FieldResponseValue;
		meta?: FieldResponseMeta;
		contentLocale: string;
	}) => void;
	addField: (params: {
		brickIndex: number;
		fieldConfig: CFConfig<Exclude<FieldTypes, "tab">>;
		groupId?: number | string;
		repeaterKey?: string;
		locales: string[];
	}) => FieldResponse;
	addRepeaterGroup: (params: {
		brickIndex: number;
		fieldConfig: CFConfig<Exclude<FieldTypes, "tab">>[];
		key: string;
		groupId?: number | string;
		parentRepeaterKey?: string;
		locales: string[];
	}) => void;
	removeRepeaterGroup: (params: {
		brickIndex: number;
		repeaterKey: string;
		targetGroupId: number | string;
		groupId?: number | string;
		parentRepeaterKey?: string;
	}) => void;
	swapGroupOrder: (_props: {
		brickIndex: number;
		repeaterKey: string;
		selectedGroupId: number | string;
		targetGroupId: number | string;
		groupId?: number | string;
		parentRepeaterKey?: string;
	}) => void;
	toggleGroupOpen: (_props: {
		brickIndex: number;
		repeaterKey: string;
		groupId: number | string;
		parentRepeaterKey: string | undefined;
		parentGroupId: string | number | undefined;
	}) => void;
};

const [get, set] = createStore<BrickStoreT>({
	bricks: [],
	fieldsErrors: [],
	locked: false,
	documentMutated: false,
	collectionTranslations: false,
	imagePreview: {
		open: false,
		data: undefined,
	},
	reset() {
		set("bricks", []);
		set("fieldsErrors", []);
		set("documentMutated", false);
		set("collectionTranslations", false);
	},
	// Bricks
	setBricks(document, collection) {
		set(
			"bricks",
			produce((draft) => {
				// Set with data from document respponse
				draft.push({
					id: "collection-pseudo-brick",
					key: "collection-pseudo-brick",
					order: -1,
					type: "collection-fields",
					open: 0,
					fields: document?.fields || [],
				});

				for (const brick of document?.bricks || []) {
					draft.push(brick);
				}

				// add empty fixed bricks
				for (const brick of collection?.fixedBricks || []) {
					const brickIndex = draft.findIndex(
						(b) => b.key === brick.key && b.type === "fixed",
					);
					if (brickIndex !== -1) continue;

					draft.push({
						id: `ref-${shortUUID.generate()}}`,
						key: brick.key,
						fields: [],
						type: "fixed",
						open: 0,
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
					id: `ref-${shortUUID.generate()}`,
					key: props.brickConfig.key,
					order: largestOrder ? largestOrder.order + 1 : 0,
					type: "builder",
					open: 0,
					fields: [],
				});
			}),
		);
		set("documentMutated", true);
	},
	removeBrick(brickIndex) {
		set(
			"bricks",
			produce((draft) => {
				if (draft[brickIndex].type !== "builder") return;
				draft.splice(brickIndex, 1);
			}),
		);
		set("documentMutated", true);
	},
	toggleBrickOpen(brickIndex) {
		set(
			"bricks",
			produce((draft) => {
				draft[brickIndex].open = draft[brickIndex].open === 1 ? 0 : 1;
			}),
		);
		set("documentMutated", true);
	},
	swapBrickOrder(props) {
		set(
			"bricks",
			produce((draft) => {
				const brick = draft[props.brickIndex];
				const targetBrick = draft[props.targetBrickIndex];

				const order = brick.order;
				brick.order = targetBrick.order;
				targetBrick.order = order;

				draft.sort((a, b) => a.order - b.order);
			}),
		);
		set("documentMutated", true);
	},
	// Fields
	setFieldValue(params) {
		set(
			"bricks",
			produce((draft) => {
				const field = brickHelpers.findFieldRecursive({
					fields: draft[params.brickIndex].fields,
					targetKey: params.key,
					groupId: params.groupId,
					repeaterKey: params.repeaterKey,
				});

				if (!field) return;

				if (
					params.fieldConfig.config.useTranslations === true &&
					get.collectionTranslations === true
				) {
					if (!field.translations) field.translations = {};
					if (!field.meta) field.meta = {};

					field.translations[params.contentLocale] = params.value;
					(field.meta as Record<string, FieldResponseMeta>)[
						params.contentLocale
					] = params.meta || undefined;
				} else {
					field.value = params.value;
					field.meta = params.meta || undefined;
				}
			}),
		);
		set("documentMutated", true);
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
				for (const locale of params.locales) {
					newField.translations = {
						[locale]: params.fieldConfig.config.default,
					};
				}
			} else {
				newField.value = params.fieldConfig.config.default;
			}
		}

		brickStore.set(
			"bricks",
			produce((draft) => {
				const brick = draft[params.brickIndex];
				if (!brick) return;

				// Field belongs on the brick level
				if (params.groupId === undefined) {
					brick.fields.push(newField);
					return;
				}

				if (params.repeaterKey === undefined) return;

				const repeaterField = brickHelpers.findFieldRecursive({
					fields: brick.fields,
					targetKey: params.repeaterKey,
					groupId: params.groupId,
				});
				if (!repeaterField) return;
				if (repeaterField.type !== "repeater") return;

				const group = repeaterField.groups?.find(
					(g) => g.id === params.groupId,
				);
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
			produce((draft) => {
				const field = brickHelpers.findFieldRecursive({
					fields: draft[params.brickIndex].fields,
					targetKey: params.key,
					groupId: params.groupId,
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
							for (const locale of params.locales) {
								newField.translations = {
									[locale]: field.config.default,
								};
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
							id: `ref-${shortUUID.generate()}`,
							order: 0,
							open: 0,
							fields: groupFields,
						},
					];
					return;
				}

				const largestOrder = field.groups?.reduce((prev, current) => {
					return prev.order > current.order ? prev : current;
				});

				field.groups.push({
					id: `ref-${shortUUID.generate()}`,
					order: largestOrder.order + 1,
					open: 0,
					fields: groupFields,
				});
			}),
		);
		set("documentMutated", true);
	},
	removeRepeaterGroup(params) {
		set(
			"bricks",
			produce((draft) => {
				const field = brickHelpers.findFieldRecursive({
					fields: draft[params.brickIndex].fields,
					targetKey: params.repeaterKey,

					groupId: params.groupId,
					repeaterKey: params.parentRepeaterKey,
				});

				if (!field) return;
				if (field.type !== "repeater") return;
				if (field.groups === undefined) return;

				const targetGroupIndex = field.groups.findIndex(
					(g) => g.id === params.targetGroupId,
				);
				if (targetGroupIndex === -1) return;

				field.groups.splice(targetGroupIndex, 1);
			}),
		);
		set("documentMutated", true);
	},
	swapGroupOrder(params) {
		set(
			"bricks",
			produce((draft) => {
				const field = brickHelpers.findFieldRecursive({
					fields: draft[params.brickIndex].fields,
					targetKey: params.repeaterKey,
					groupId: params.groupId,
					repeaterKey: params.parentRepeaterKey,
				});

				if (!field) return;
				if (field.type !== "repeater") return;
				if (field.groups === undefined) field.groups = [];

				const selectedIndex = field.groups.findIndex(
					(group) => group.id === params.selectedGroupId,
				);
				const targetGroupIndex = field.groups.findIndex(
					(group) => group.id === params.targetGroupId,
				);

				if (selectedIndex === -1 || targetGroupIndex === -1) return;

				const groupOrder = field.groups[selectedIndex].order;

				field.groups[selectedIndex].order =
					field.groups[targetGroupIndex].order;
				field.groups[targetGroupIndex].order = groupOrder;

				field.groups.sort((a, b) => a.order - b.order);
			}),
		);
		set("documentMutated", true);
	},
	toggleGroupOpen: (props) => {
		set(
			"bricks",
			produce((draft) => {
				const field = brickHelpers.findFieldRecursive({
					fields: draft[props.brickIndex].fields,
					targetKey: props.repeaterKey,

					groupId: props.parentGroupId,
					repeaterKey: props.parentRepeaterKey,
				});

				if (!field || !field.groups) return;

				const group = field.groups.find((g) => g.id === props.groupId);
				if (!group) return;

				group.open = group.open === 1 ? 0 : 1;
			}),
		);
		set("documentMutated", true);
	},
});

const brickStore = {
	get,
	set,
};

export default brickStore;
