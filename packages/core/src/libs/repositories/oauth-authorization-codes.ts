import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class OAuthAuthorizationCodesRepository extends StaticRepository<"lucid_oauth_authorization_codes"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_oauth_authorization_codes");
	}
	tableSchema = z.object({
		id: z.number(),
		code_hash: z.string(),
		grant_id: z.number(),
		client_id: z.string(),
		redirect_uri: z.string(),
		resource: z.string(),
		code_challenge: z.string(),
		expires_at: z.union([z.string(), z.date()]),
		consumed_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		code_hash: this.dbAdapter.getDataType("varchar", 64),
		grant_id: this.dbAdapter.getDataType("integer"),
		client_id: this.dbAdapter.getDataType("text"),
		redirect_uri: this.dbAdapter.getDataType("text"),
		resource: this.dbAdapter.getDataType("text"),
		code_challenge: this.dbAdapter.getDataType("varchar", 128),
		expires_at: this.dbAdapter.getDataType("timestamp"),
		consumed_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	/**
	 * Atomically consumes an unexpired OAuth authorization code.
	 */
	async consume<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				codeHash: string;
				consumedAt: string;
			}
		>,
	) {
		const query = this.db
			.updateTable("lucid_oauth_authorization_codes")
			.set({ consumed_at: props.consumedAt })
			.where("code_hash", "=", props.codeHash)
			.where("consumed_at", "is", null)
			.where("expires_at", ">", props.consumedAt)
			.returning([
				"id",
				"grant_id",
				"client_id",
				"redirect_uri",
				"resource",
				"code_challenge",
			]);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "consume",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"grant_id",
				"client_id",
				"redirect_uri",
				"resource",
				"code_challenge",
			],
		});
	}
}
