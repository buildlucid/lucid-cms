import z from "zod";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class ClientIntegrationScopesRepository extends StaticRepository<"lucid_client_integration_scopes"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_client_integration_scopes");
	}
	tableSchema = z.object({
		id: z.number(),
		client_integration_id: z.number(),
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
		client_integration_id: this.dbAdapter.getDataType("integer"),
		scope: this.dbAdapter.getDataType("text"),
		core: this.dbAdapter.getDataType("boolean"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
