import type { FieldError, InternalDocumentField } from "@types";
import type { Accessor } from "solid-js";
import { unwrap } from "solid-js/store";
import type { createBrickStore } from "@/store/brickStore/brickStore";
import type {
	CollectionDataFieldConfig,
	CollectionFieldConfig,
} from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import { getFieldError } from "@/utils/get-field-error";
import helpers from "@/utils/helpers";
import isLocaleLockedField from "@/utils/is-locale-locked-field";
import resolveFieldAccess, {
	type FieldAccess,
} from "@/utils/resolve-field-access";
import { isFieldValue, readFieldValue, readTypedValue } from "./field-state";
import type { EditorField, EditorFieldType, FieldScope } from "./types";

/** What every field in an open document pane shares. */
export type FieldEnvironment = {
	store: ReturnType<typeof createBrickStore>;
	contentLocale: Accessor<string>;
	/** The locales a locale-limited request can change, or null when every locale can. */
	editableLocales: Accessor<string[] | null>;
	/** The locales fields keep values for, used when a write creates a missing field. */
	locales: Accessor<string[]>;
	/** The open document's collection, for fetching linked items' display data. */
	collectionKey: Accessor<string | undefined>;
};

/** One level of fields: a brick's top level, or a repeater item. */
export type FieldLevel = {
	brickIndex: Accessor<number>;
	/** The repeater item, when the level is one. */
	groupRef?: string;
	repeaterKey?: string;
	/** The level's configs, with tabs, sections and collapsibles still in place. */
	configs: Accessor<CollectionFieldConfig[]>;
	fields: Accessor<InternalDocumentField[]>;
	errors: Accessor<FieldError[] | undefined>;
	/** What the brick or repeater allows, which the level's fields can only narrow. */
	access: Accessor<FieldAccess>;
};

type FoundField = { config: CollectionDataFieldConfig; access: FieldAccess };

/** Finds a field through tabs, sections and collapsibles, narrowing access by each one it passes. */
const findField = (
	configs: CollectionFieldConfig[],
	key: string,
	parent: FieldAccess,
): FoundField | undefined => {
	for (const config of configs) {
		const access = resolveFieldAccess(config.permissions, parent);
		if (
			config.type === "tab" ||
			config.type === "section" ||
			config.type === "collapsible"
		) {
			const found = findField(config.fields, key, access);
			if (found) return found;
			continue;
		}
		if (config.key === key) return { config, access };
	}
	return undefined;
};

/** Builds a field handle whose properties read the store, so it stays current. */
const createEditorField = (
	environment: FieldEnvironment,
	level: FieldLevel,
	found: FoundField,
): EditorField => {
	const { config } = found;
	const { store } = environment;
	//* resolved on each read, so kept handles follow permission changes
	const access = () =>
		findField(level.configs(), config.key, level.access())?.access ?? "hidden";
	const data = () => level.fields().find((field) => field.key === config.key);
	const validation = "validation" in config ? config.validation : undefined;
	const required =
		validation !== undefined &&
		"required" in validation &&
		validation.required === true;
	const id = () =>
		brickHelpers.customFieldId({
			scope: store.idPrefix,
			key: config.key,
			brickIndex: level.brickIndex(),
			groupRef: level.groupRef,
		});
	const label = () =>
		helpers.getLocaleValue({
			value: config.details.label,
			fallback: config.key,
		});
	const description = () =>
		helpers.getLocaleValue({ value: config.details.description }) || undefined;
	const readOnly = () =>
		store.get.locked ||
		config.ui?.disabled === true ||
		access() !== "editable" ||
		isLocaleLockedField({
			config,
			editableLocales: environment.editableLocales(),
			locale: environment.contentLocale(),
		});
	const errors = () =>
		(level.errors() ?? [])
			.filter(
				(error) =>
					error.key === config.key &&
					(error.localeCode === null ||
						error.localeCode === environment.contentLocale()),
			)
			.flatMap((error) => {
				const message = getFieldError(error);
				return message ? [message] : [];
			});

	if (config.type === "repeater") {
		const field: EditorField<"repeater"> = {
			key: config.key,
			type: config.type,
			config,
			required,
			get id() {
				return id();
			},
			get label() {
				return label();
			},
			get description() {
				return description();
			},
			get readOnly() {
				return readOnly();
			},
			get errors() {
				return errors();
			},
			get groups() {
				return (data()?.groups ?? []).map((group) => ({
					ref: group.ref,
					fields: createFieldScope(environment, {
						brickIndex: level.brickIndex,
						groupRef: group.ref,
						repeaterKey: config.key,
						configs: () => config.fields,
						//* found by ref on each read, as undo and reloads replace the item objects
						fields: () =>
							data()?.groups?.find((item) => item.ref === group.ref)?.fields ??
							[],
						errors: () =>
							level
								.errors()
								?.find((error) => error.key === config.key)
								?.groupErrors?.find((error) => error.ref === group.ref)?.fields,
						access,
					}),
				}));
			},
		};
		return field;
	}

	const value = () =>
		readTypedValue(
			config.type,
			readFieldValue(
				config,
				data(),
				environment.contentLocale(),
				store.get.collectionLocalized,
			),
		);

	//* only linked field types have refs; their types leave the property out on the rest
	const refs = () => {
		if (!("resource" in config)) return undefined;
		const collectionKey = environment.collectionKey();
		const raw = readFieldValue(
			config,
			data(),
			environment.contentLocale(),
			store.get.collectionLocalized,
		);

		if (config.resource === "documents") {
			const items = readTypedValue(config.type, raw);
			store.requestRefs({
				collectionKey,
				resource: config.resource,
				value: items,
			});
			return brickHelpers.getFieldRefs({
				refs: store.get.refs,
				resource: config.resource,
				fieldValue: items,
			});
		}

		const ids = readTypedValue(config.type, raw);
		store.requestRefs({ collectionKey, resource: config.resource, value: ids });
		return brickHelpers.getFieldRefs({
			refs: store.get.refs,
			resource: config.resource,
			fieldValue: ids,
		});
	};

	const field = {
		key: config.key,
		type: config.type,
		config,
		required,
		get id() {
			return id();
		},
		get label() {
			return label();
		},
		get description() {
			return description();
		},
		get readOnly() {
			return readOnly();
		},
		get errors() {
			return errors();
		},
		get value() {
			return value();
		},
		get refs() {
			return refs();
		},
		setValue(next: unknown) {
			if (readOnly()) return;
			if (!isFieldValue[config.type](next)) {
				throw new TypeError(
					`"${config.key}" is a ${config.type} field and can't hold ${JSON.stringify(next)}.`,
				);
			}

			const brickIndex = level.brickIndex();
			//* fields in tabs or repeater items that haven't opened yet may not exist
			if (!data()) {
				store.get.addField({
					brickIndex,
					fieldConfig: config,
					ref: level.groupRef,
					repeaterKey: level.repeaterKey,
					locales: environment.locales(),
				});
			}
			store.get.setFieldValue({
				brickIndex,
				fieldConfig: config,
				key: config.key,
				ref: level.groupRef,
				repeaterKey: level.repeaterKey,
				value: structuredClone(unwrap(next)),
				contentLocale: environment.contentLocale(),
			});
		},
	};

	//* type, config and value come from the same config, which TypeScript can't correlate across the union
	return field as EditorField;
};

/** The fields at one level, looked up by key. Handles stay current, so they can be kept and read later. */
export const createFieldScope = (
	environment: FieldEnvironment,
	level: FieldLevel,
): FieldScope => {
	function get(key: string): EditorField | undefined;
	function get<TType extends EditorFieldType>(
		key: string,
		type: TType,
	): EditorField<TType> | undefined;
	function get(key: string, type?: EditorFieldType): EditorField | undefined {
		const found = findField(level.configs(), key, level.access());
		if (!found || found.access === "hidden") return undefined;
		if (type !== undefined && found.config.type !== type) return undefined;
		return createEditorField(environment, level, found);
	}

	return { get };
};
