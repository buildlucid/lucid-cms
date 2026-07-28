import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class IntegrationScopesRepository extends StaticRepository<"lucid_integration_scopes"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_integration_scopes");
	}
	tableSchema = z.object({
		id: z.number(),
		integration_id: z.number(),
		scope: z.string(),
		core: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		integration_id: this.dbAdapter.getDataType("integer"),
		scope: this.dbAdapter.getDataType("text"),
		core: this.dbAdapter.getDataType("boolean"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
