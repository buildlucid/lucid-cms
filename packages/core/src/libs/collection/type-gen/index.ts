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

type FilterTreeNode = {
	filterType?: string;
	children: Map<string, FilterTreeNode>;
};

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

/** Collects sortable top-level field sort keys, independent of listing config. */
const collectCustomFieldSortKeys = (
	collection: CollectionBuilder,
): string[] => {
	const sortKeys: string[] = [];

	for (const field of collection.persistedFieldTree) {
		const fieldConfig = registeredFields[field.type].config;
		if (fieldConfig.database.mode !== "column") continue;
		if (!fieldConfig.capabilities.sortable) continue;

		sortKeys.push(
			field.key.startsWith(constants.db.generatedColumnPrefix)
				? field.key
				: `${constants.db.generatedColumnPrefix}${field.key}`,
		);
	}

	return sortKeys;
};

/** Returns sort keys for a collection. */
const getCollectionSortKeys = (collection: CollectionBuilder): string[] => {
	const sortKeys = collection.getData.orderable
		? [...collectionDocumentSortKeys, "order"]
		: [...collectionDocumentSortKeys];

	return dedupeStrings([
		...sortKeys,
		...collectCustomFieldSortKeys(collection),
	]);
};

/** Creates a mutable tree that mirrors the nested DX filter object shape. */
const createFilterTreeNode = (): FilterTreeNode => ({
	children: new Map(),
});

/** Adds one dotted filter path into the nested filter tree. */
const addFilterPath = (
	tree: FilterTreeNode,
	path: string[],
	filterType = "FilterObject",
) => {
	if (path.length === 0) return;

	const [segment, ...rest] = path;
	if (!segment) return;

	const child = tree.children.get(segment) ?? createFilterTreeNode();
	tree.children.set(segment, child);

	if (rest.length === 0) {
		child.filterType = filterType;
		return;
	}

	addFilterPath(child, rest, filterType);
};

/** Merges filter branches without losing paths that are both a value and a traversal root. */
const mergeFilterTree = (
	target: FilterTreeNode,
	source: FilterTreeNode,
): void => {
	target.filterType ??= source.filterType;

	for (const [key, sourceChild] of source.children) {
		const targetChild = target.children.get(key) ?? createFilterTreeNode();
		target.children.set(key, targetChild);
		mergeFilterTree(targetChild, sourceChild);
	}
};

/** Renders a nested filter tree into a TypeScript object type string. */
const renderFilterTree = (tree: FilterTreeNode): string => {
	if (tree.children.size === 0) {
		return "Record<string, never>";
	}

	const properties = Array.from(tree.children.entries()).map(([key, value]) => {
		const branch = renderFilterTree(value);
		const type =
			value.filterType && value.children.size > 0
				? `${value.filterType} | ${branch}`
				: value.filterType
					? value.filterType
					: branch;

		return `${stringLiteral(key)}?: ${type};`;
	});

	return `{\n${indentBlock(properties.join("\n"))}\n}`;
};

/**
 * Collects the rendered properties for one client field list. Tabs are
 * transparent, sections/collapsibles nest or inline their children based on
 * their `output` config to match the client response shape.
 */
const collectFieldMapProperties = (
	fields: CFConfig<FieldTypes>[],
	context: RenderFieldContext,
	properties: string[],
	declarations: string[],
): void => {
	for (const field of fields) {
		if (field.type === "tab") {
			collectFieldMapProperties(
				field.fields,
				context,
				properties,
				declarations,
			);
			continue;
		}

		if (field.type === "section" || field.type === "collapsible") {
			if (field.output === "inline") {
				collectFieldMapProperties(
					field.fields,
					context,
					properties,
					declarations,
				);
			} else {
				const nested = renderFieldMap(field.fields, context);
				declarations.push(...nested.declarations);
				properties.push(`${stringLiteral(field.key)}: ${nested.typeText};`);
			}
			continue;
		}

		const renderedField = renderField(field, context);
		declarations.push(...renderedField.declarations);

		if (renderedField.omitted || !renderedField.fieldType) {
			continue;
		}

		properties.push(`${stringLiteral(field.key)}: ${renderedField.fieldType};`);
	}
};

/** Renders one client field list into a reusable object field map type. */
const renderFieldMap = (
	fields: CFConfig<FieldTypes>[],
	context: RenderFieldContext,
): RenderedFieldMap => {
	const properties: string[] = [];
	const declarations: string[] = [];

	collectFieldMapProperties(fields, context, properties, declarations);

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
	switch (props.mode) {
		case "groups":
			return `Array<${props.groupFieldsType ?? "Record<string, never>"}>`;
		case "translations":
			return `CollectionDocumentTranslations<${props.valueType ?? "unknown"}>`;
		default:
			return props.valueType ?? "unknown";
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
		fieldInstance?.localizedEnabled === true
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

/** Builds the exported type name for one collection's supported document versions. */
const buildCollectionVersionTypeName = (collectionKey: string): string => {
	return `${toPascalCaseIdentifier(collectionKey, "Collection")}CollectionDocumentVersion`;
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

	const fieldSegment = field.key.startsWith(constants.db.generatedColumnPrefix)
		? field.key
		: `${constants.db.generatedColumnPrefix}${field.key}`;

	if (scope.kind === "collection") {
		if (path.length === 0) {
			return [[fieldSegment]];
		}

		return [["fields", path[path.length - 1] as string, fieldSegment]];
	}

	return [
		[
			scope.brickKey,
			...(path.length > 0 ? [path[path.length - 1] as string] : []),
			fieldSegment,
		],
	];
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

const mergeFilterTreeAtPath = (
	tree: FilterTreeNode,
	path: string[],
	branch: FilterTreeNode,
): void => {
	let node = tree;
	for (const segment of path) {
		const child = node.children.get(segment) ?? createFilterTreeNode();
		node.children.set(segment, child);
		node = child;
	}
	mergeFilterTree(node, branch);
};

const setFilterTypeAtPath = (
	tree: FilterTreeNode,
	path: string[],
	filterType: string,
): void => {
	let node = tree;
	for (const segment of path) {
		const child = node.children.get(segment) ?? createFilterTreeNode();
		node.children.set(segment, child);
		node = child;
	}
	node.filterType = filterType;
};

const relationIdFilterType = (collection: string | string[]): string => {
	const collectionKeys = Array.isArray(collection) ? collection : [collection];
	const explicitIds = collectionKeys.map(
		(collectionKey) => `\`${collectionKey}:\${number}\``,
	);

	return `FilterObject<${["number", "number[]", ...explicitIds].join(" | ")}>`;
};

/** Narrows relation ID leaves without adding another traversal level. */
const applyRelationIdFilterTypes = (props: {
	tree: FilterTreeNode;
	fields: CFConfig<FieldTypes>[];
	scope: FilterScope;
	path?: string[];
}): void => {
	for (const field of props.fields) {
		const fieldDefinition = registeredFields[field.type];
		const storageMode = storageModes[fieldDefinition.config.database.mode];

		if (storageMode.mode === "tree-table") {
			applyRelationIdFilterTypes({
				...props,
				fields: storageMode.getChildFieldConfigs(field) ?? [],
				path: [...(props.path ?? []), field.key],
			});
			continue;
		}
		if (field.type !== "relation") continue;

		const relationPath = collectFieldFilterPaths(
			field,
			props.scope,
			props.path,
		)[0];
		if (!relationPath) continue;

		setFilterTypeAtPath(
			props.tree,
			relationPath,
			relationIdFilterType(field.collection),
		);
	}
};

/** Builds the target collection's existing custom-field filter tree without recursive traversals. */
const collectCollectionCustomFilterTree = (
	collection: CollectionBuilder,
): FilterTreeNode => {
	const tree = collectFilterTree(collection.persistedFieldTree, {
		kind: "collection",
	});
	applyRelationIdFilterTypes({
		tree,
		fields: collection.persistedFieldTree,
		scope: { kind: "collection" },
	});

	for (const { brick } of getCollectionBricks(collection)) {
		const brickTree = collectFilterTree(brick.persistedFieldTree, {
			kind: "brick",
			brickKey: brick.key,
		});
		applyRelationIdFilterTypes({
			tree: brickTree,
			fields: brick.persistedFieldTree,
			scope: { kind: "brick", brickKey: brick.key },
		});
		mergeFilterTree(tree, brickTree);
	}

	return tree;
};

/** Adds an implicit first-target branch plus explicit one-hop collection branches. */
const addRelationDocumentFilterBranches = (props: {
	tree: FilterTreeNode;
	fields: CFConfig<FieldTypes>[];
	scope: FilterScope;
	collectionsByKey: Map<string, CollectionBuilder>;
	path?: string[];
}): void => {
	for (const field of props.fields) {
		const fieldDefinition = registeredFields[field.type];
		const storageMode = storageModes[fieldDefinition.config.database.mode];

		if (storageMode.mode === "tree-table") {
			addRelationDocumentFilterBranches({
				...props,
				fields: storageMode.getChildFieldConfigs(field) ?? [],
				path: [...(props.path ?? []), field.key],
			});
			continue;
		}
		if (field.type !== "relation") continue;

		const relationPath = collectFieldFilterPaths(
			field,
			props.scope,
			props.path,
		)[0];
		if (!relationPath) continue;
		setFilterTypeAtPath(
			props.tree,
			relationPath,
			relationIdFilterType(field.collection),
		);

		const targetCollectionKeys = Array.isArray(field.collection)
			? field.collection
			: [field.collection];
		for (const [
			targetIndex,
			targetCollectionKey,
		] of targetCollectionKeys.entries()) {
			const targetCollection = props.collectionsByKey.get(targetCollectionKey);
			if (!targetCollection) continue;
			const targetFilterTree =
				collectCollectionCustomFilterTree(targetCollection);

			mergeFilterTreeAtPath(
				props.tree,
				[...relationPath, targetCollectionKey],
				targetFilterTree,
			);
			if (targetIndex === 0) {
				mergeFilterTreeAtPath(props.tree, relationPath, targetFilterTree);
			}
		}
	}
};

/** Returns every version type that a resolved document can report. */
const getCollectionVersions = (collection: CollectionBuilder): string[] => {
	return dedupeStrings([
		"latest",
		"revision",
		constants.collectionBuilder.publishing.snapshotVersionType,
		...collection.getData.environments.map((environment) => environment.key),
	]);
};

/** Returns the moving version targets exposed to client integrations. */
const getCollectionVersionKeys = (collection: CollectionBuilder): string[] => {
	return dedupeStrings([
		"latest",
		...collection.getData.environments.map((environment) => environment.key),
	]);
};

/** Returns the configured locale codes so translated field helpers can use them. */
const getGeneratedLocaleCodes = (
	localization: CollectionTypeGenLocalization,
): string[] => {
	return dedupeStrings(localization.locales.map((locale) => locale.code));
};

/** Builds all generated declarations for a single collection. */
const buildCollectionTypeDeclarations = (
	collection: CollectionBuilder,
	collectionsByKey: Map<string, CollectionBuilder>,
) => {
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
	const collectionVersionTypeName = buildCollectionVersionTypeName(
		collection.key,
	);
	const collectionVersionKeyTypeName = buildCollectionVersionKeyTypeName(
		collection.key,
	);
	const collectionFields = renderFieldMap(collection.clientFieldTree, {
		builder: collection,
		collectionUsesTranslations: collection.getData.localized,
		withinGroup: false,
	});
	const collectionDeclarations = [...collectionFields.declarations];
	const brickTypeNames: string[] = [];
	const filterTree = createFilterTreeNode();

	for (const filterKey of collectionDocumentFilterKeys) {
		addFilterPath(filterTree, [filterKey]);
	}
	if (collection.getData.workflow) {
		addFilterPath(filterTree, ["workflowStage"]);
	}

	mergeFilterTree(
		filterTree,
		collectFilterTree(collection.persistedFieldTree, {
			kind: "collection",
		}),
	);
	addRelationDocumentFilterBranches({
		tree: filterTree,
		fields: collection.persistedFieldTree,
		scope: { kind: "collection" },
		collectionsByKey,
	});

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
		const brickFields = renderFieldMap(brick.clientFieldTree, {
			builder: brick,
			collectionUsesTranslations: collection.getData.localized,
			withinGroup: false,
		});

		collectionDeclarations.push(...brickFields.declarations);

		mergeFilterTree(
			filterTree,
			collectFilterTree(brick.persistedFieldTree, {
				kind: "brick",
				brickKey: brick.key,
			}),
		);
		addRelationDocumentFilterBranches({
			tree: filterTree,
			fields: brick.persistedFieldTree,
			scope: { kind: "brick", brickKey: brick.key },
			collectionsByKey,
		});

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
		`export type ${collectionSortKeyTypeName} = ${getCollectionSortKeys(
			collection,
		)
			.map((sortKey) => stringLiteral(sortKey))
			.join(" | ")};`,
		`export type ${collectionVersionTypeName} = ${getCollectionVersions(
			collection,
		)
			.map((version) => stringLiteral(version))
			.join(" | ")};`,
		`export type ${collectionVersionKeyTypeName} = ${getCollectionVersionKeys(
			collection,
		)
			.map((versionKey) => stringLiteral(versionKey))
			.join(" | ")};`,
	);

	return {
		collectionFieldsTypeName,
		collectionBricksTypeName,
		collectionFiltersTypeName,
		collectionSortKeyTypeName,
		collectionVersionTypeName,
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
	const versionEntries: string[] = [];
	const versionKeyEntries: string[] = [];
	const declarations: string[] = [];
	const collectionsByKey = new Map(
		props.collections.map((collection) => [collection.key, collection]),
	);

	for (const collection of props.collections) {
		const generatedCollection = buildCollectionTypeDeclarations(
			collection,
			collectionsByKey,
		);

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
		versionEntries.push(
			`${stringLiteral(collection.key)}: ${generatedCollection.collectionVersionTypeName};`,
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
		`export interface GeneratedCollectionDocumentVersionsByCollection {\n${versionEntries.length > 0 ? indentBlock(versionEntries.join("\n")) : ""}\n}`,
		`export interface GeneratedCollectionDocumentVersionKeysByCollection {\n${versionKeyEntries.length > 0 ? indentBlock(versionKeyEntries.join("\n")) : ""}\n}`,
		`export type GeneratedCollectionDocumentKey = Extract<keyof GeneratedCollectionDocumentFieldsByCollection, string>;`,
		`export type CollectionDocumentKey = GeneratedCollectionDocumentKey | (string & {});`,
		`export type CollectionDocument<TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey> = CoreCollectionDocument<TCollectionKey>;`,
		`export type Document<TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey> = CoreCollectionDocument<TCollectionKey>;`,
		`export type CollectionDocumentFilters<TCollectionKey extends string = string> = CoreCollectionDocumentFilters<TCollectionKey>;`,
		`export type CollectionDocumentFilterInput<TCollectionKey extends string = string> = CoreCollectionDocumentFilterInput<TCollectionKey>;`,
		`export type CollectionDocumentVersion<TCollectionKey extends string = string> = CoreCollectionDocumentVersion<TCollectionKey>;`,
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
\tCollectionDocumentFilterInput as CoreCollectionDocumentFilterInput,
\tCollectionDocumentFilters as CoreCollectionDocumentFilters,
\tCollectionDocumentVersion as CoreCollectionDocumentVersion,
\tCollectionDocumentSortKey as CoreCollectionDocumentSortKey,
\tCollectionDocumentSorts as CoreCollectionDocumentSorts,
\tCollectionDocumentTranslations,
\tCollectionDocumentVersionKey as CoreCollectionDocumentVersionKey,
\tDocumentBrick,
\tFilterObject,
\tRelationFieldValue,
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
					"interface CollectionDocumentVersionsByCollection extends GeneratedCollectionDocumentVersionsByCollection {}",
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
					"interface CollectionDocumentVersionsByCollection extends GeneratedCollectionDocumentVersionsByCollection {}",
					"interface CollectionDocumentSortsByCollection extends GeneratedCollectionDocumentSortsByCollection {}",
					"interface CollectionDocumentVersionKeysByCollection extends GeneratedCollectionDocumentVersionKeysByCollection {}",
				],
			},
		],
	};
};

export default generateCollectionClientTypes;
