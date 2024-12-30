import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import boolean from "../../utils/helpers/boolean.js";
import type { LucidClientIntegrations, Select, KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class ClientIntegrationsRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// select
	selectSingle = async <
		K extends keyof Select<LucidClientIntegrations>,
	>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_client_integrations">;
	}) => {
		let query = this.db
			.selectFrom("lucid_client_integrations")
			.select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.executeTakeFirst() as Promise<
			Pick<Select<LucidClientIntegrations>, K> | undefined
		>;
	};
	selectMultiple = async <
		K extends keyof Select<LucidClientIntegrations>,
	>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_client_integrations">;
	}) => {
		let query = this.db
			.selectFrom("lucid_client_integrations")
			.select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.execute() as Promise<
			Array<Pick<Select<LucidClientIntegrations>, K>>
		>;
	};
	// ----------------------------------------
	// create
	createSingle = async (props: {
		name: string;
		description?: string;
		enabled: boolean;
		key: string;
		apiKey: string;
		secret: string;
		createdAt: string;
		updatedAt: string;
	}) => {
		return this.db
			.insertInto("lucid_client_integrations")
			.values({
				name: props.name,
				description: props.description,
				enabled: boolean.insertFormat(props.enabled, this.dbAdapter),
				key: props.key,
				api_key: props.apiKey,
				secret: props.secret,
				created_at: props.createdAt,
				updated_at: props.updatedAt,
			})
			.returning(["id", "api_key"])
			.executeTakeFirst();
	};
	// ----------------------------------------
	// update
	updateSingle = async (props: {
		where: QueryBuilderWhere<"lucid_client_integrations">;
		data: {
			name?: string;
			description?: string;
			enabled?: boolean;
			apiKey?: string;
			secret?: string;
			updatedAt?: string;
		};
	}) => {
		let query = this.db
			.updateTable("lucid_client_integrations")
			.set({
				name: props.data.name,
				description: props.data.description,
				enabled: boolean.insertFormat(props.data.enabled, this.dbAdapter),
				api_key: props.data.apiKey,
				secret: props.data.secret,
				updated_at: props.data.updatedAt,
			})
			.returning(["id"]);

		query = queryBuilder.update(query, props.where);

		return query.executeTakeFirst();
	};
	// ----------------------------------------
	// delete
	deleteSingle = async (props: {
		where: QueryBuilderWhere<"lucid_client_integrations">;
	}) => {
		let query = this.db
			.deleteFrom("lucid_client_integrations")
			.returning(["id"]);

		query = queryBuilder.delete(query, props.where);

		return query.executeTakeFirst();
	};
}
