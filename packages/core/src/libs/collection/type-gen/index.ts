import constants from "../../../constants/constants.js";
import type { TypeGenerationFile } from "../../type-generation/types.js";
import type BrickBuilder from "../builders/brick-builder/index.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import registeredFields from "../custom-fields/registered-fields.js";
import { storageModes } from "../custom-fields/storage/index.js";
import type {
	CFConfig,
	ClientFieldTypeGenerationResult,
	FieldTypes,
} from "../custom-fields/types.js";
import {
	dedupeStrings,
	indentBlock,
	stringLiteral,
	toPascalCaseIdentifier,
} from "./helpers.js";

type BuilderContext = BrickBuilder | CollectionBuilder;

type CollectionTypeGenLocalization = {
	locales: Array<{
		code: string;
	}>;
};

type RenderFieldContext = {
	builder: BuilderContext;
	collectionUsesTranslations: boolean;
	withinGroup: boolean;
};

type RenderedFieldMap = {
	typeText: string;
	declarations: string[];
};

type RenderedField = {
	omitted?: boolean;
	fieldType?: string;
	declarations: string[];
};

type FilterTreeNode = Map<string, FilterTreeNode | null>;

type FilterScope =
	| {
			kind: "collection";
	  }
	| {
			kind: "brick";
			brickKey: string;
	  };

const collectionDocumentFilterKeys = [
	"id",
	"createdBy",
	"updatedBy",
	"createdAt",
	"updatedAt",
	"isDeleted",
	"deletedBy",
] as const;

const collectionDocumentSortKeys = ["createdAt", "updatedAt"] as const;

/** Creates a mutable tree that mirrors the nested DX filter object shape. */
const createFilterTreeNode = (): FilterTreeNode => new Map();

/** Adds one dotted filter path into the nested filter tree. */
const addFilterPath = (tree: FilterTreeNode, path: string[]) => {
	if (path.length === 0) return;

	const [segment, ...rest] = path;
	if (!segment) return;

	if (rest.length === 0) {
		tree.set(segment, null);
		return;
	}

	const current = tree.get(segment);
	const child = current instanceof Map ? current : createFilterTreeNode();

	tree.set(segment, child);
	addFilterPath(child, rest);
};

/** Renders a nested filter tree into a TypeScript object type string. */
const renderFilterTree = (tree: FilterTreeNode): string => {
	if (tree.size === 0) {
		return "Record<string, never>";
	}

	const properties = Array.from(tree.entries()).map(([key, value]) => {
		if (value === null) {
			return `${stringLiteral(key)}?: FilterObject;`;
		}

		return `${stringLiteral(key)}?: ${renderFilterTree(value)};`;
	});

	return `{\n${indentBlock(properties.join("\n"))}\n}`;
};

/** Renders one persisted field list into a reusable object field map type. */
const renderFieldMap = (
	fields: CFConfig<FieldTypes>[],
	context: RenderFieldContext,
): RenderedFieldMap => {
	const properties: string[] = [];
	const declarations: string[] = [];

	for (const field of fields) {
		const renderedField = renderField(field, context);
		declarations.push(...renderedField.declarations);

		if (renderedField.omitted || !renderedField.fieldType) {
			continue;
		}

		properties.push(`${stringLiteral(field.key)}: ${renderedField.fieldType};`);
	}

	if (properties.length === 0) {
		return {
			typeText: "Record<string, never>",
			declarations: dedupeStrings(declarations),
		};
	}

	return {
		typeText: `{\n${indentBlock(properties.join("\n"))}\n}`,
		declarations: dedupeStrings(declarations),
	};
};

/** Chooses the exact field helper type that matches the formatted client response shape. */
const renderBaseFieldType = (props: {
	field: CFConfig<FieldTypes>;
	mode: "groups" | "translations" | "value";
	valueType?: string;
	groupFieldsType?: string;
	hasGroupRef: boolean;
}): string => {
	const keyArg = stringLiteral(props.field.key);
	const typeArg = stringLiteral(props.field.type);
	const groupRefArg = props.hasGroupRef ? ", true" : "";

	switch (props.mode) {
		case "groups":
			return `GroupDocumentField<${keyArg}, ${typeArg}, ${props.groupFieldsType ?? "Record<string, never>"}${groupRefArg}>`;
		case "translations":
			return `TranslatedDocumentField<${keyArg}, ${typeArg}, ${props.valueType ?? "unknown"}${groupRefArg}>`;
		default:
			return `ValueDocumentField<${keyArg}, ${typeArg}, ${props.valueType ?? "unknown"}${groupRefArg}>`;
	}
};

/** Resolves the generated field type for one field using its storage mode and translation config. */
const renderField = (
	field: CFConfig<FieldTypes>,
	context: RenderFieldContext,
): RenderedField => {
	const fieldDefinition = registeredFields[field.type];
	const fieldInstance = context.builder.fields.get(field.key);
	const fieldMode =
		context.collectionUsesTranslations &&
		fieldInstance?.translationsEnabled === true
			? "translations"
			: "value";
	const fieldTypeGen: ClientFieldTypeGenerationResult =
		fieldDefinition.clientTypeGen?.({
			field: field as never,
		}) ?? {
			valueType: "unknown",
		};

	return storageModes[fieldDefinition.config.database.mode].clientTypeGen({
		builder: context.builder,
		collectionUsesTranslations: context.collectionUsesTranslations,
		field,
		fieldMode,
		valueType: fieldTypeGen.valueType,
		fieldType: fieldTypeGen.fieldType,
		declarations: fieldTypeGen.declarations,
		hasGroupRef: context.withinGroup,
		helpers: {
			renderBaseFieldType,
			renderFieldMap,
		},
	});
};

/** Builds the exported type name for one collection's top-level field map. */
const buildCollectionFieldsTypeName = (collectionKey: string): string => {
	return `${toPascalCaseIdentifier(collectionKey, "Collection")}CollectionDocumentFields`;
};

/** Builds the exported type name for one collection's brick union. */
const buildCollectionBricksTypeName = (collectionKey: string): string => {
	return `${toPascalCaseIdentifier(collectionKey, "Collection")}CollectionDocumentBrick`;
};

/** Builds the exported type name for one collection's nested filter object. */
const buildCollectionFiltersTypeName = (collectionKey: string): string => {
	return `${toPascalCaseIdentifier(collectionKey, "Collection")}CollectionDocumentFilters`;
};

/** Builds the exported type name for one collection's supported sort keys. */
const buildCollectionSortKeyTypeName = (collectionKey: string): string => {
	return `${toPascalCaseIdentifier(collectionKey, "Collection")}CollectionDocumentSortKey`;
};

/** Builds the exported type name for one collection's supported document statuses. */
const buildCollectionStatusTypeName = (collectionKey: string): string => {
	return `${toPascalCaseIdentifier(collectionKey, "Collection")}CollectionDocumentStatus`;
};

/** Builds the exported type name for one collection's available version record keys. */
const buildCollectionVersionKeyTypeName = (collectionKey: string): string => {
	return `${toPascalCaseIdentifier(collectionKey, "Collection")}CollectionDocumentVersionKey`;
};

/** Builds a stable brick type name that avoids collisions across modes and collections. */
const buildBrickTypeName = (props: {
	collectionKey: string;
	brickKey: string;
	brickType: "builder" | "fixed";
}): string => {
	return `${toPascalCaseIdentifier(props.collectionKey, "Collection")}${toPascalCaseIdentifier(props.brickKey, "Brick")}${toPascalCaseIdentifier(props.brickType, "Brick")}Brick`;
};

/** Builds the exported field map type name for a specific brick instance shape. */
const buildBrickFieldsTypeName = (props: {
	collectionKey: string;
	brickKey: string;
	brickType: "builder" | "fixed";
}): string => {
	return `${buildBrickTypeName(props)}Fields`;
};

/** Collects the runtime filter paths supported by a field, including nested repeater children. */
const collectFieldFilterPaths = (
	field: CFConfig<FieldTypes>,
	scope: FilterScope,
	path: string[] = [],
): string[][] => {
	const fieldDefinition = registeredFields[field.type];
	const storageMode = storageModes[fieldDefinition.config.database.mode];

	if (storageMode.mode === "ignore") {
		return [];
	}

	if (storageMode.mode === "tree-table") {
		const childFields = storageMode.getChildFieldConfigs(field) ?? [];

		return childFields.flatMap((childField) =>
			collectFieldFilterPaths(childField, scope, [...path, field.key]),
		);
	}

	const fieldSegment = `_${field.key}`;

	if (scope.kind === "collection") {
		if (path.length === 0) {
			return [[fieldSegment]];
		}

		return [["fields", ...path, fieldSegment]];
	}

	return [[scope.brickKey, ...path, fieldSegment]];
};

/** Builds the nested DX filter tree for a collection field tree or brick field tree. */
const collectFilterTree = (
	fields: CFConfig<FieldTypes>[],
	scope: FilterScope,
): FilterTreeNode => {
	const tree = createFilterTreeNode();

	for (const field of fields) {
		for (const path of collectFieldFilterPaths(field, scope)) {
			addFilterPath(tree, path);
		}
	}

	return tree;
};

/** Returns every fixed and builder brick so generation can treat them uniformly. */
const getCollectionBricks = (
	collection: CollectionBuilder,
): Array<{
	brick: BrickBuilder;
	brickType: "builder" | "fixed";
}> => {
	return [
		...((collection.config.bricks?.builder ?? []).map((brick) => ({
			brick,
			brickType: "builder" as const,
		})) ?? []),
		...((collection.config.bricks?.fixed ?? []).map((brick) => ({
			brick,
			brickType: "fixed" as const,
		})) ?? []),
	];
};

/** Returns the full set of document statuses a collection can be addressed by. */
const getCollectionStatusKeys = (collection: CollectionBuilder): string[] => {
	return dedupeStrings([
		"latest",
		"revision",
		...collection.getData.config.environments.map(
			(environment) => environment.key,
		),
	]);
};

/** Returns the version slots exposed on the formatted document response. */
const getCollectionVersionKeys = (collection: CollectionBuilder): string[] => {
	return dedupeStrings([
		"latest",
		...collection.getData.config.environments.map(
			(environment) => environment.key,
		),
	]);
};

/** Returns the configured locale codes so translated field helpers can use them. */
const getGeneratedLocaleCodes = (
	localization: CollectionTypeGenLocalization,
): string[] => {
	return dedupeStrings(localization.locales.map((locale) => locale.code));
};

/** Builds all generated declarations for a single collection. */
const buildCollectionTypeDeclarations = (collection: CollectionBuilder) => {
	const collectionFieldsTypeName = buildCollectionFieldsTypeName(
		collection.key,
	);
	const collectionBricksTypeName = buildCollectionBricksTypeName(
		collection.key,
	);
	const collectionFiltersTypeName = buildCollectionFiltersTypeName(
		collection.key,
	);
	const collectionSortKeyTypeName = buildCollectionSortKeyTypeName(
		collection.key,
	);
	const collectionStatusTypeName = buildCollectionStatusTypeName(
		collection.key,
	);
	const collectionVersionKeyTypeName = buildCollectionVersionKeyTypeName(
		collection.key,
	);
	const collectionFields = renderFieldMap(collection.persistedFieldTree, {
		builder: collection,
		collectionUsesTranslations: collection.getData.config.useTranslations,
		withinGroup: false,
	});
	const collectionDeclarations = [...collectionFields.declarations];
	const brickTypeNames: string[] = [];
	const filterTree = createFilterTreeNode();

	for (const filterKey of collectionDocumentFilterKeys) {
		addFilterPath(filterTree, [filterKey]);
	}

	for (const [key, value] of collectFilterTree(collection.persistedFieldTree, {
		kind: "collection",
	})) {
		filterTree.set(key, value);
	}

	for (const { brick, brickType } of getCollectionBricks(collection)) {
		const brickTypeName = buildBrickTypeName({
			collectionKey: collection.key,
			brickKey: brick.key,
			brickType,
		});
		const brickFieldsTypeName = buildBrickFieldsTypeName({
			collectionKey: collection.key,
			brickKey: brick.key,
			brickType,
		});
		const brickFields = renderFieldMap(brick.persistedFieldTree, {
			builder: brick,
			collectionUsesTranslations: collection.getData.config.useTranslations,
			withinGroup: false,
		});

		collectionDeclarations.push(...brickFields.declarations);

		for (const [key, value] of collectFilterTree(brick.persistedFieldTree, {
			kind: "brick",
			brickKey: brick.key,
		})) {
			filterTree.set(key, value);
		}

		collectionDeclarations.push(
			`export type ${brickFieldsTypeName} = ${brickFields.typeText};`,
			`export type ${brickTypeName} = DocumentBrick<${stringLiteral(brick.key)}, ${stringLiteral(brickType)}, ${brickFieldsTypeName}>;`,
		);
		brickTypeNames.push(brickTypeName);
	}

	collectionDeclarations.unshift(
		`export type ${collectionFieldsTypeName} = ${collectionFields.typeText};`,
		`export type ${collectionBricksTypeName} = ${brickTypeNames.length > 0 ? brickTypeNames.join(" | ") : "never"};`,
		`export type ${collectionFiltersTypeName} = ${renderFilterTree(filterTree)};`,
		`export type ${collectionSortKeyTypeName} = ${collectionDocumentSortKeys
			.map((sortKey) => stringLiteral(sortKey))
			.join(" | ")};`,
		`export type ${collectionStatusTypeName} = ${getCollectionStatusKeys(
			collection,
		)
			.map((statusKey) => stringLiteral(statusKey))
			.join(" | ")};`,
		`export type ${collectionVersionKeyTypeName} = ${getCollectionVersionKeys(
			collection,
		)
			.map((statusKey) => stringLiteral(statusKey))
			.join(" | ")};`,
	);

	return {
		collectionFieldsTypeName,
		collectionBricksTypeName,
		collectionFiltersTypeName,
		collectionSortKeyTypeName,
		collectionStatusTypeName,
		collectionVersionKeyTypeName,
		declarations: dedupeStrings(collectionDeclarations),
	};
};

/** Combines all collection declarations into the generated collection lookup maps. */
const buildGeneratedMapsDeclaration = (props: {
	collections: CollectionBuilder[];
	localization: CollectionTypeGenLocalization;
}) => {
	const localeEntries = getGeneratedLocaleCodes(props.localization).map(
		(localeCode) => `${stringLiteral(localeCode)}: true;`,
	);
	const fieldEntries: string[] = [];
	const brickEntries: string[] = [];
	const filterEntries: string[] = [];
	const sortEntries: string[] = [];
	const statusEntries: string[] = [];
	const versionKeyEntries: string[] = [];
	const declarations: string[] = [];

	for (const collection of props.collections) {
		const generatedCollection = buildCollectionTypeDeclarations(collection);

		declarations.push(...generatedCollection.declarations);
		fieldEntries.push(
			`${stringLiteral(collection.key)}: ${generatedCollection.collectionFieldsTypeName};`,
		);
		brickEntries.push(
			`${stringLiteral(collection.key)}: ${generatedCollection.collectionBricksTypeName};`,
		);
		filterEntries.push(
			`${stringLiteral(collection.key)}: ${generatedCollection.collectionFiltersTypeName};`,
		);
		sortEntries.push(
			`${stringLiteral(collection.key)}: ${generatedCollection.collectionSortKeyTypeName};`,
		);
		statusEntries.push(
			`${stringLiteral(collection.key)}: ${generatedCollection.collectionStatusTypeName};`,
		);
		versionKeyEntries.push(
			`${stringLiteral(collection.key)}: ${generatedCollection.collectionVersionKeyTypeName};`,
		);
	}

	declarations.push(
		`export interface GeneratedCollectionDocumentLocaleCodes {\n${localeEntries.length > 0 ? indentBlock(localeEntries.join("\n")) : ""}\n}`,
		`export type GeneratedCollectionDocumentLocaleCode = Extract<keyof GeneratedCollectionDocumentLocaleCodes, string>;`,
		`export type CollectionDocumentLocaleCode = GeneratedCollectionDocumentLocaleCode | (string & {});`,
		`export interface GeneratedCollectionDocumentFieldsByCollection {\n${fieldEntries.length > 0 ? indentBlock(fieldEntries.join("\n")) : ""}\n}`,
		`export interface GeneratedCollectionDocumentBricksByCollection {\n${brickEntries.length > 0 ? indentBlock(brickEntries.join("\n")) : ""}\n}`,
		`export interface GeneratedCollectionDocumentFiltersByCollection {\n${filterEntries.length > 0 ? indentBlock(filterEntries.join("\n")) : ""}\n}`,
		`export interface GeneratedCollectionDocumentSortsByCollection {\n${sortEntries.length > 0 ? indentBlock(sortEntries.join("\n")) : ""}\n}`,
		`export interface GeneratedCollectionDocumentStatusesByCollection {\n${statusEntries.length > 0 ? indentBlock(statusEntries.join("\n")) : ""}\n}`,
		`export interface GeneratedCollectionDocumentVersionKeysByCollection {\n${versionKeyEntries.length > 0 ? indentBlock(versionKeyEntries.join("\n")) : ""}\n}`,
		`export type GeneratedCollectionDocumentKey = Extract<keyof GeneratedCollectionDocumentFieldsByCollection, string>;`,
		`export type CollectionDocumentKey = GeneratedCollectionDocumentKey | (string & {});`,
		`export type CollectionDocument<TCollectionKey extends CollectionDocumentKey | null = CollectionDocumentKey | null> = CoreCollectionDocument<TCollectionKey>;`,
		`export type Document<TCollectionKey extends CollectionDocumentKey | null = CollectionDocumentKey | null> = CoreCollectionDocument<TCollectionKey>;`,
		`export type CollectionDocumentFilters<TCollectionKey extends string = string> = CoreCollectionDocumentFilters<TCollectionKey>;`,
		`export type CollectionDocumentStatus<TCollectionKey extends string = string> = CoreCollectionDocumentStatus<TCollectionKey>;`,
		`export type CollectionDocumentSortKey<TCollectionKey extends string = string> = CoreCollectionDocumentSortKey<TCollectionKey>;`,
		`export type CollectionDocumentSorts<TCollectionKey extends string = string> = CoreCollectionDocumentSorts<TCollectionKey>;`,
		`export type CollectionDocumentVersionKey<TCollectionKey extends string = string> = CoreCollectionDocumentVersionKey<TCollectionKey>;`,
	);

	return dedupeStrings(declarations);
};

/** Generates the `.lucid/client.d.ts` file for collection-aware client-facing types. */
const generateCollectionClientTypes = (props: {
	collections: CollectionBuilder[];
	localization: CollectionTypeGenLocalization;
}): TypeGenerationFile => {
	const generatedMaps = buildGeneratedMapsDeclaration(props);

	return {
		filename: constants.typeGeneration.files.client,
		imports: [
			`import type {
\tCollectionDocument as CoreCollectionDocument,
\tCollectionDocumentFilters as CoreCollectionDocumentFilters,
\tCollectionDocumentStatus as CoreCollectionDocumentStatus,
\tCollectionDocumentSortKey as CoreCollectionDocumentSortKey,
\tCollectionDocumentSorts as CoreCollectionDocumentSorts,
\tCollectionDocumentVersionKey as CoreCollectionDocumentVersionKey,
\tDocumentBrick,
\tDocumentRelationValue,
\tFilterObject,
\tGroupDocumentField,
\tTranslatedDocumentField,
\tValueDocumentField,
} from "${constants.typeGeneration.modules.coreTypes}";`,
		],
		declarations: generatedMaps,
		moduleAugmentations: [
			{
				module: constants.typeGeneration.modules.coreTypes,
				declarations: [
					"interface CollectionDocumentLocaleCodes extends GeneratedCollectionDocumentLocaleCodes {}",
					"interface CollectionDocumentFieldsByCollection extends GeneratedCollectionDocumentFieldsByCollection {}",
					"interface CollectionDocumentBricksByCollection extends GeneratedCollectionDocumentBricksByCollection {}",
					"interface CollectionDocumentFiltersByCollection extends GeneratedCollectionDocumentFiltersByCollection {}",
					"interface CollectionDocumentStatusesByCollection extends GeneratedCollectionDocumentStatusesByCollection {}",
					"interface CollectionDocumentSortsByCollection extends GeneratedCollectionDocumentSortsByCollection {}",
					"interface CollectionDocumentVersionKeysByCollection extends GeneratedCollectionDocumentVersionKeysByCollection {}",
				],
			},
			{
				module: constants.typeGeneration.modules.clientTypes,
				declarations: [
					"interface CollectionDocumentLocaleCodes extends GeneratedCollectionDocumentLocaleCodes {}",
					"interface CollectionDocumentFieldsByCollection extends GeneratedCollectionDocumentFieldsByCollection {}",
					"interface CollectionDocumentBricksByCollection extends GeneratedCollectionDocumentBricksByCollection {}",
					"interface CollectionDocumentFiltersByCollection extends GeneratedCollectionDocumentFiltersByCollection {}",
					"interface CollectionDocumentStatusesByCollection extends GeneratedCollectionDocumentStatusesByCollection {}",
					"interface CollectionDocumentSortsByCollection extends GeneratedCollectionDocumentSortsByCollection {}",
					"interface CollectionDocumentVersionKeysByCollection extends GeneratedCollectionDocumentVersionKeysByCollection {}",
				],
			},
		],
	};
};

export default generateCollectionClientTypes;
