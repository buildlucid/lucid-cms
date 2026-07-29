import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import type { MediaPosterPropsT } from "../formatters/media.js";
import { mediaImageSelect } from "./helpers/media-selects.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class OAuthAuthorizationRequestsRepository extends StaticRepository<"lucid_oauth_authorization_requests"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_oauth_authorization_requests");
	}
	tableSchema = z.object({
		id: z.number(),
		request_id: z.string(),
		client_id: z.string(),
		client_name: z.string(),
		client_uri: z.string().nullable(),
		client_logo_media_id: z.number().nullable(),
		redirect_uri: z.string(),
		resource: z.string(),
		scopes: z.string(),
		state: z.string(),
		code_challenge: z.string(),
		expires_at: z.union([z.string(), z.date()]),
		consumed_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]),
		client_logo: z.array(z.custom<MediaPosterPropsT>()).optional(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		request_id: this.dbAdapter.getDataType("text"),
		client_id: this.dbAdapter.getDataType("text"),
		client_name: this.dbAdapter.getDataType("text"),
		client_uri: this.dbAdapter.getDataType("text"),
		client_logo_media_id: this.dbAdapter.getDataType("integer"),
		redirect_uri: this.dbAdapter.getDataType("text"),
		resource: this.dbAdapter.getDataType("text"),
		scopes: this.dbAdapter.getDataType("text"),
		state: this.dbAdapter.getDataType("text"),
		code_challenge: this.dbAdapter.getDataType("varchar", 128),
		expires_at: this.dbAdapter.getDataType("timestamp"),
		consumed_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	/** Selects an active authorization request with its client logo. */
	async selectSingleActiveWithLogo<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				requestId: string;
				currentTime: string;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_oauth_authorization_requests")
			.select([
				"request_id",
				"client_id",
				"client_name",
				"client_uri",
				"scopes",
				"expires_at",
			])
			.select(() => [
				mediaImageSelect(
					this.db,
					this.dbAdapter,
					"lucid_oauth_authorization_requests.client_logo_media_id",
					"client_logo",
				),
			])
			.where("request_id", "=", props.requestId)
			.where("consumed_at", "is", null)
			.where("expires_at", ">", props.currentTime);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleActiveWithLogo",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"request_id",
				"client_id",
				"client_name",
				"client_uri",
				"scopes",
				"expires_at",
				"client_logo",
			],
		});
	}

	/**
	 * Atomically consumes an unexpired OAuth authorization request.
	 */
	async consume<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				requestId: string;
				consumedAt: string;
			}
		>,
	) {
		const query = this.db
			.updateTable("lucid_oauth_authorization_requests")
			.set({ consumed_at: props.consumedAt })
			.where("request_id", "=", props.requestId)
			.where("consumed_at", "is", null)
			.where("expires_at", ">", props.consumedAt)
			.returning([
				"id",
				"request_id",
				"client_id",
				"client_name",
				"client_uri",
				"client_logo_media_id",
				"redirect_uri",
				"resource",
				"scopes",
				"state",
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
				"request_id",
				"client_id",
				"client_name",
				"client_uri",
				"client_logo_media_id",
				"redirect_uri",
				"resource",
				"scopes",
				"state",
				"code_challenge",
			],
		});
	}
}
