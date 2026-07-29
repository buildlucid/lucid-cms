import { sql } from "kysely";
import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import type { MediaPosterPropsT } from "../formatters/media.js";
import { mediaImageSelect } from "./helpers/media-selects.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps, ValidationConfig } from "./types.js";

const detailedColumns = [
	"id",
	"client_id",
	"name",
	"client_uri",
	"token_endpoint_auth_method",
	"logo_media_id",
	"enabled",
	"created_by",
	"created_at",
	"updated_at",
] as const;

export default class OAuthClientsRepository extends StaticRepository<"lucid_oauth_clients"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_oauth_clients");
	}
	tableSchema = z.object({
		id: z.number(),
		client_id: z.string(),
		name: z.string(),
		client_uri: z.string().nullable(),
		token_endpoint_auth_method: z.enum(["none", "client_secret_basic"]),
		client_secret_hash: z.string().nullable(),
		client_secret_salt: z.string().nullable(),
		logo_media_id: z.number().nullable(),
		enabled: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		created_by: z.number().nullable(),
		created_at: z.union([z.string(), z.date()]),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		redirect_uris: z
			.array(
				z.object({
					redirect_uri: z.string(),
				}),
			)
			.optional(),
		logo: z.array(z.custom<MediaPosterPropsT>()).optional(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		client_id: this.dbAdapter.getDataType("text"),
		name: this.dbAdapter.getDataType("text"),
		client_uri: this.dbAdapter.getDataType("text"),
		token_endpoint_auth_method: this.dbAdapter.getDataType("text"),
		client_secret_hash: this.dbAdapter.getDataType("text"),
		client_secret_salt: this.dbAdapter.getDataType("text"),
		logo_media_id: this.dbAdapter.getDataType("integer"),
		enabled: this.dbAdapter.getDataType("boolean"),
		created_by: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	/** Builds the ordered redirect URI selection shared by OAuth client reads. */
	private selectRedirectUris() {
		return this.dbAdapter
			.jsonArrayFrom(
				this.db
					.selectFrom("lucid_oauth_client_redirect_uris")
					.select(["redirect_uri"])
					.where(
						"lucid_oauth_client_redirect_uris.oauth_client_id",
						"=",
						sql.ref<number>("lucid_oauth_clients.id"),
					)
					.orderBy("lucid_oauth_client_redirect_uris.id", "asc"),
			)
			.as("redirect_uris");
	}

	/** Builds the shared OAuth client view used by single and multiple reads. */
	private selectDetailed() {
		return this.db
			.selectFrom("lucid_oauth_clients")
			.select(detailedColumns)
			.select(() => [
				this.selectRedirectUris(),
				mediaImageSelect(
					this.db,
					this.dbAdapter,
					"lucid_oauth_clients.logo_media_id",
					"logo",
				),
			]);
	}

	/** Selects the registered client data needed to begin authorization. */
	async selectSingleAuthorizationClient<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				clientId: string;
			}
		>,
	) {
		const columns = [
			"id",
			"name",
			"client_uri",
			"logo_media_id",
			"enabled",
		] as const;
		const query = this.db
			.selectFrom("lucid_oauth_clients")
			.select(columns)
			.select(() => [this.selectRedirectUris()])
			.where("client_id", "=", props.clientId);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleAuthorizationClient",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [...columns, "redirect_uris"],
		});
	}

	/** Selects one OAuth client with its redirect URIs and logo. */
	async selectSingleDetailed<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
			}
		>,
	) {
		const query = this.selectDetailed().where(
			"lucid_oauth_clients.id",
			"=",
			props.id,
		);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleDetailed",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [...detailedColumns, "redirect_uris", "logo"],
		});
	}

	/** Selects every OAuth client with its redirect URIs and logo. */
	async selectMultipleDetailed<V extends boolean = false>(
		props: { validation?: ValidationConfig<V> } = {},
	) {
		const query = this.selectDetailed().orderBy(
			"lucid_oauth_clients.created_at",
			"desc",
		);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleDetailed",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: [...detailedColumns, "redirect_uris", "logo"],
		});
	}
}
