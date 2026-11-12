import { sql } from "kysely";
import type { MigrationDatabase } from "../../harness/src/migrations/types.ts";
import { STORY_KEY } from "../collections/story.ts";
import { recordJob } from "./plugin.ts";
import { SEED_RECORDS_TABLE } from "./records.ts";

/**
 * Reads seed run counts, stories, media and queued record jobs directly from the database to
 * expose writes left by failed seeds.
 */
export const readSeeded = (database: Pick<MigrationDatabase, "query">) =>
	database.query(async (kysely) => {
		const count = async (query: ReturnType<typeof sql<{ count: unknown }>>) =>
			Number((await query.execute(kysely)).rows[0]?.count ?? 0);

		const records = await sql<{
			name: string;
			runs: unknown;
		}>`SELECT name, runs FROM ${sql.table(SEED_RECORDS_TABLE)}`.execute(kysely);

		return {
			records: Object.fromEntries(
				records.rows.map((row) => [row.name, Number(row.runs)]),
			),
			stories: await count(
				sql`SELECT COUNT(*) AS count FROM ${sql.table(`lucid_document__${STORY_KEY}`)}`,
			),
			media: await count(sql`SELECT COUNT(*) AS count FROM lucid_media`),
			jobs: await count(
				sql`SELECT COUNT(*) AS count FROM lucid_jobs WHERE job_key = ${recordJob.key}`,
			),
		};
	});
