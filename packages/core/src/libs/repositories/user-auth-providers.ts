import z from "zod/v4";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class UserAuthProvidersRepository extends StaticRepository<"lucid_user_auth_providers"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_user_auth_providers");
	}
	tableSchema = z.object({
		id: z.number(),
		user_id: z.number(),
		provider_key: z.string(),
		provider_user_id: z.string(),
		linked_at: z.union([z.string(), z.date()]).nullable(),
		metadata: z.record(z.string(), z.unknown()).nullable(),
		created_at: z.union([z.string(), z.date()]),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		user_id: this.dbAdapter.getDataType("integer"),
		provider_key: this.dbAdapter.getDataType("text"),
		provider_user_id: this.dbAdapter.getDataType("text"),
		linked_at: this.dbAdapter.getDataType("timestamp"),
		metadata: this.dbAdapter.getDataType("json"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				userId: "user_id",
				providerKey: "provider_key",
			},
			sorts: {
				createdAt: "created_at",
				updatedAt: "updated_at",
				providerKey: "provider_key",
			},
		},
		operators: {
			providerKey: this.dbAdapter.config.fuzzOperator,
		},
	} as const;
}
