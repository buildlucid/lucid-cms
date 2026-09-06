import type { Kysely } from "kysely";
import type { LucidDB } from "../../exports/types.js";

// Public augmentation must also work when LucidDB inherits dynamic table keys.
declare module "../../exports/types.js" {
	interface LucidDB {
		plugin_type_contract_notes: { id: number; message: string };
	}
}

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
type Assert<T extends true> = T;

type DocumentRow = LucidDB["lucid_document__articles"];
type VersionRow = LucidDB["lucid_document__articles__ver"];
type BrickRow = LucidDB["lucid_document__articles__hero"];
type FieldsRow = LucidDB["lucid_document__articles__fld"];
type RepeaterRow = LucidDB["lucid_document__articles__hero__links"];

type DocumentOrder = Assert<Equal<DocumentRow["order"], string | null>>;
type VersionContent = Assert<Equal<VersionRow["content_id"], string>>;
type VersionSource = Assert<Equal<VersionRow["promoted_from"], number | null>>;
type BrickPosition = Assert<Equal<BrickRow["position"], number>>;
type FieldsLocale = Assert<Equal<FieldsRow["locale"], string>>;
type RepeaterParent = Assert<
	Equal<RepeaterRow["parent_id"], number | null | undefined>
>;
type AugmentedRow = Assert<
	Equal<LucidDB["plugin_type_contract_notes"], { id: number; message: string }>
>;

const selectRows = (db: Kysely<LucidDB>) => ({
	document: db
		.selectFrom("lucid_document__articles")
		.select(["id", "order"])
		.executeTakeFirstOrThrow(),
	version: db
		.selectFrom("lucid_document__articles__ver")
		.select(["content_id", "promoted_from"])
		.executeTakeFirstOrThrow(),
	brick: db
		.selectFrom("lucid_document__articles__hero")
		.select(["document_version_id", "position"])
		.executeTakeFirstOrThrow(),
	plugin: db
		.selectFrom("plugin_type_contract_notes")
		.select(["id", "message"])
		.executeTakeFirstOrThrow(),
});
type Queries = ReturnType<typeof selectRows>;
type DocumentQuery = Assert<
	Equal<Awaited<Queries["document"]>, { id: number; order: string | null }>
>;
type VersionQuery = Assert<
	Equal<
		Awaited<Queries["version"]>,
		{ content_id: string; promoted_from: number | null }
	>
>;
type BrickQuery = Assert<
	Equal<
		Awaited<Queries["brick"]>,
		{ document_version_id: number; position: number }
	>
>;
type PluginQuery = Assert<
	Equal<Awaited<Queries["plugin"]>, { id: number; message: string }>
>;

export type DynamicTableContractAssertions = [
	DocumentOrder,
	VersionContent,
	VersionSource,
	BrickPosition,
	FieldsLocale,
	RepeaterParent,
	AugmentedRow,
	DocumentQuery,
	VersionQuery,
	BrickQuery,
	PluginQuery,
];
