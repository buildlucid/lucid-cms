import { sql } from "kysely";
import type { LucidDatabase } from "../db/client/index.js";
import type { LucidOptions } from "../db/tables/index.js";
import { optionsTable } from "../db/tables/options.js";
import type { Insert, Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class OptionsRepository extends StaticRepository<"lucid_options"> {
	constructor(db: LucidDatabase) {
		super(db, optionsTable);
	}

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
			.values(this.asInsertData(props.data))
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

	/**
	 * Inserts an immutable text option if absent and returns the stored value.
	 * A concurrent creator wins without allowing this caller to replace it.
	 */
	async ensureTextValue(props: {
		name: Select<LucidOptions>["name"];
		value: string;
	}) {
		const exec = await this.executeQuery(
			async () => {
				const inserted = await this.db
					.insertInto("lucid_options")
					.values({
						name: props.name,
						value_int: null,
						value_text: props.value,
						value_bool: null,
					})
					.onConflict((conflict) => conflict.column("name").doNothing())
					.returning(["value_text"])
					.executeTakeFirst();
				if (inserted) return inserted;

				return this.db
					.selectFrom("lucid_options")
					.select(["value_text"])
					.where("name", "=", props.name)
					.executeTakeFirst();
			},
			{ method: "ensureTextValue" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: true,
			mode: "single",
			select: ["value_text"],
		});
	}

	async adjustInt<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				data: {
					name: Select<LucidOptions>["name"];
					delta: number;
					max?: number;
					min?: number;
				};
			}
		>,
	) {
		const min = props.data.min ?? 0;

		let query = this.db
			.updateTable("lucid_options")
			.set({
				value_int: sql<number>`CASE
					WHEN COALESCE(value_int, 0) + ${props.data.delta} < ${min} THEN ${min}
					ELSE COALESCE(value_int, 0) + ${props.data.delta}
				END`,
			})
			.where("name", "=", props.data.name);

		if (props.data.max !== undefined && props.data.delta > 0) {
			query = query.where(
				sql<number>`COALESCE(value_int, 0) + ${props.data.delta}`,
				"<=",
				props.data.max,
			);
		}

		const exec = await this.executeQuery(
			async () => {
				const updateRes = await query.executeTakeFirst();
				return {
					count: Number(updateRes.numUpdatedRows ?? 0n),
				};
			},
			{
				method: "adjustInt",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "count",
		});
	}
}
