import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class AiGenerationsRepository extends StaticRepository<"lucid_ai_generations"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_ai_generations");
	}
	tableSchema = z.object({
		id: z.number(),
		request_id: z.string(),
		provider_request_id: z.string().nullable(),
		feature_key: z.string(),
		feature_version: z.string(),
		user_id: z.number().nullable(),
		target_type: z.string(),
		target: z.record(z.string(), z.unknown()),
		output: z.unknown(),
		usage: z.record(z.string(), z.unknown()),
		model: z.string(),
		cost_currency: z.string(),
		cost_total_minor: z.number(),
		status: z.literal("success"),
		error_message: z.string().nullable(),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		request_id: this.dbAdapter.getDataType("text"),
		provider_request_id: this.dbAdapter.getDataType("text"),
		feature_key: this.dbAdapter.getDataType("text"),
		feature_version: this.dbAdapter.getDataType("text"),
		user_id: this.dbAdapter.getDataType("integer"),
		target_type: this.dbAdapter.getDataType("text"),
		target: this.dbAdapter.getDataType("json"),
		output: this.dbAdapter.getDataType("json"),
		usage: this.dbAdapter.getDataType("json"),
		model: this.dbAdapter.getDataType("text"),
		cost_currency: this.dbAdapter.getDataType("text"),
		cost_total_minor: this.dbAdapter.getDataType("integer"),
		status: this.dbAdapter.getDataType("text"),
		error_message: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
