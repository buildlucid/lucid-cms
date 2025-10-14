import { sql } from "kysely";
import z from "zod/v4";
import { optionsNameSchema } from "../../schemas/options.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type {
	Insert,
	KyselyDB,
	LucidOptions,
	Select,
} from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class OptionsRepository extends StaticRepository<"lucid_options"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_options");
	}
	tableSchema = z.object({
		name: optionsNameSchema,
		value_int: z.number().nullable(),
		value_text: z.string().nullable(),
		value_bool: z
			.union([
				z.literal(this.dbAdapter.config.defaults.boolean.true),
				z.literal(this.dbAdapter.config.defaults.boolean.false),
			])
			.nullable(),
	});
	columnFormats = {
		name: this.dbAdapter.getDataType("text"),
		value_int: this.dbAdapter.getDataType("integer"),
		value_text: this.dbAdapter.getDataType("text"),
		value_bool: this.dbAdapter.getDataType("boolean"),
	};
	queryConfig = undefined;

	// ----------------------------------------
	// upserts
	async upsertSingle<
		K extends keyof Select<LucidOptions>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<LucidOptions>>;
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		const query = this.db
			.insertInto("lucid_options")
			.values(
				this.formatData(props.data, {
					type: "insert",
				}),
			)
			.onConflict((oc) =>
				oc.column("name").doUpdateSet((eb) => ({
					value_int: eb.ref("excluded.value_int"),
					value_text: eb.ref("excluded.value_text"),
					value_bool: eb.ref("excluded.value_bool"),
				})),
			)
			.$if(
				props.returnAll !== true &&
					props.returning !== undefined &&
					props.returning.length > 0,
				// @ts-expect-error
				(qb) => qb.returning(props.returning),
			)
			.$if(props.returnAll ?? false, (qb) => qb.returningAll());

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					Pick<Select<LucidOptions>, K> | undefined
				>,
			{
				method: "upsertSingle",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning,
			selectAll: props.returnAll,
		});
	}
}
