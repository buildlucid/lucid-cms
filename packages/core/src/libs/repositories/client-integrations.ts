import z from "zod/v4";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class ClientIntegrationsRepository extends StaticRepository<"lucid_client_integrations"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_client_integrations");
	}
	tableSchema = z.object({
		id: z.number(),
		name: z.string(),
		description: z.string().nullable(),
		enabled: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		key: z.string(),
		api_key: z.string(),
		secret: z.string(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		name: this.dbAdapter.getDataType("text"),
		description: this.dbAdapter.getDataType("text"),
		enabled: this.dbAdapter.getDataType("boolean"),
		key: this.dbAdapter.getDataType("text"),
		api_key: this.dbAdapter.getDataType("text"),
		secret: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				name: "name",
				description: "description",
				enabled: "enabled",
			},
			sorts: {
				name: "name",
				enabled: "enabled",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		},
		operators: {
			name: this.dbAdapter.config.fuzzOperator,
			description: this.dbAdapter.config.fuzzOperator,
		},
	} as const;
}
