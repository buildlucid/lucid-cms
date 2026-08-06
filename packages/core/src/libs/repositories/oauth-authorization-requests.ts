import type { LucidDatabase } from "../db/client/index.js";
import { oauthAuthorizationRequestsTable } from "../db/tables/oauth-authorization-requests.js";
import { mediaImageSelect } from "./helpers/media-selects.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class OAuthAuthorizationRequestsRepository extends StaticRepository<"lucid_oauth_authorization_requests"> {
	constructor(db: LucidDatabase) {
		super(db, oauthAuthorizationRequestsTable);
	}

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
					this.database,
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
