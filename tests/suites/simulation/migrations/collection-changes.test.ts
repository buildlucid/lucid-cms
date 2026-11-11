import {
	describe,
	expect,
	fc,
	getRunOptions,
	type MigrationDatabase,
	migratedTo,
	type PrepareDatabase,
	recordDigest,
	requires,
	sql,
	test,
} from "#harness/simulation";
import {
	GENERATED_KEY,
	type GeneratedField,
	generatedStep,
} from "#shared/migrations/collections/generated";

const TABLE = `lucid_document__${GENERATED_KEY}__fld`;
const KEYS = ["alpha", "beta", "gamma", "delta"] as const;

type Change = {
	kind: "add" | "remove" | "retype" | "index";
	key: (typeof KEYS)[number];
};
type Row = Record<string, unknown>;

/** The collection every sequence starts from, with content in each field. */
const START: GeneratedField[] = [
	{ key: "alpha", type: "text" },
	{ key: "beta", type: "number" },
];

/** Every sequence starts from the collection at `START`, with two documents stored. */
const started: PrepareDatabase = async (database) => {
	await migratedTo(generatedStep(START))(database);
	await database.cms(generatedStep(START), async (admin) => {
		for (const title of ["one", "two"]) {
			const created = await admin.request({
				method: "POST",
				path: `/api/v1/documents/${GENERATED_KEY}`,
				body: {
					fields: [{ key: "alpha", type: "text", value: title }],
				},
			});
			expect(created.status).toBe(201);
		}
	});
};

/** Applies a change to the collection's fields, or returns null when it does not fit them. */
const applyChange = (
	fields: GeneratedField[],
	change: Change,
): GeneratedField[] | null => {
	const current = fields.find((field) => field.key === change.key);

	switch (change.kind) {
		case "add": {
			return current ? null : [...fields, { key: change.key, type: "text" }];
		}
		case "remove": {
			return current && fields.length > 1
				? fields.filter((field) => field !== current)
				: null;
		}
		case "retype": {
			return current
				? fields.map((field) =>
						field === current
							? { ...field, type: field.type === "text" ? "number" : "text" }
							: field,
					)
				: null;
		}
		case "index": {
			return current
				? fields.map((field) =>
						field === current ? { ...field, index: !field.index } : field,
					)
				: null;
		}
	}
};

/** Reads every stored row of the collection's fields. */
const readRows = (database: MigrationDatabase): Promise<Row[]> =>
	database.query(async (kysely) => {
		const result =
			await sql<Row>`SELECT * FROM ${sql.table(TABLE)} ORDER BY id`.execute(
				kysely,
			);
		return result.rows;
	});

/** Gives every row a value in each field that has none, so a later change has content to lose. */
const fillEmptyFields = (
	database: MigrationDatabase,
	fields: GeneratedField[],
) =>
	database.query(async (kysely) => {
		for (const field of fields) {
			const column = sql.ref(`_${field.key}`);
			const value = field.type === "text" ? "kept" : 7;
			await sql`UPDATE ${sql.table(TABLE)} SET ${column} = ${value} WHERE ${column} IS NULL`.execute(
				kysely,
			);
		}
	});

/** Leaves out one field's column, which is the only one a change to that field may touch. */
const without = (rows: Row[], key: string): Row[] =>
	rows.map(({ [`_${key}`]: _changed, ...rest }) => rest);

describe("collection changes", () => {
	requires("mode:host");

	test("a migration that needs no approval never changes stored content", async ({
		migrations,
		task,
	}) => {
		const trace: unknown[] = [];

		await fc.assert(
			fc.asyncProperty(
				fc.array(
					fc.record<Change>({
						kind: fc.constantFrom("add", "remove", "retype", "index"),
						key: fc.constantFrom(...KEYS),
					}),
					{ maxLength: 6 },
				),
				async (changes) => {
					const database = await migrations.database(started);
					let fields = START;

					for (const change of changes) {
						const next = applyChange(fields, change);
						if (!next) {
							continue;
						}
						await fillEmptyFields(database, fields);
						const before = await readRows(database);

						const migrated = await database.cli(generatedStep(next), "migrate");
						if (migrated.code === 0) {
							//* Lucid judged the change safe, so every value has to still be there
							expect(await readRows(database), migrated.output).toMatchObject(
								before,
							);
						} else {
							//* refused changes leave everything alone, and allowed ones only cost the changed field
							expect(migrated.output).toContain("--allow-destructive");
							expect(await readRows(database)).toEqual(before);

							const allowed = await database.cli(
								generatedStep(next),
								"migrate",
								"--allow-destructive",
							);
							expect(allowed.code, allowed.output).toBe(0);
							expect(without(await readRows(database), change.key)).toEqual(
								without(before, change.key),
							);
						}

						fields = next;
						trace.push([change.kind, change.key, migrated.code]);
					}

					const status = await database.cli(
						generatedStep(fields),
						"migrate:status",
						"--check",
					);
					expect(status.code, status.output).toBe(0);
				},
			),
			getRunOptions(),
		);

		//* whether a change needs approval must not depend on the database
		recordDigest(task, trace);
	});
});
