import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type { LucidOptions, Select, KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class OptionsRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// select
	selectSingle = async <K extends keyof Select<LucidOptions>>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_options">;
	}) => {
		let query = this.db.selectFrom("lucid_options").select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.executeTakeFirst() as Promise<
			Pick<Select<LucidOptions>, K> | undefined
		>;
	};
	// ----------------------------------------
	// create
	createSingle = async (props: {
		name: LucidOptions["name"];
		valueInt?: LucidOptions["value_int"];
		valueBool?: LucidOptions["value_bool"];
		valueText?: LucidOptions["value_text"];
	}) => {
		return this.db
			.insertInto("lucid_options")
			.values({
				name: props.name,
				value_bool: props.valueBool,
				value_int: props.valueInt,
				value_text: props.valueText,
			})
			.executeTakeFirst();
	};
	// ----------------------------------------
	// update
	updateSingle = async (props: {
		where: QueryBuilderWhere<"lucid_options">;
		data: {
			valueInt?: LucidOptions["value_int"];
			valueBool?: LucidOptions["value_bool"];
			valueText?: LucidOptions["value_text"];
		};
	}) => {
		let query = this.db
			.updateTable("lucid_options")
			.set({
				value_text: props.data.valueText,
				value_int: props.data.valueInt,
				value_bool: props.data.valueBool,
			})
			.returning("name");

		query = queryBuilder.update(query, props.where);

		return query.executeTakeFirst();
	};
}
