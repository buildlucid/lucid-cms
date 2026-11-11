import { randomUUID } from "node:crypto";

/**
 * The start every database name in a run shares, such as `harness_20261110_223015_4821`, so
 * the run can remove whatever its test processes left behind.
 */
export const getRunPrefix = (runId: string): string =>
	`harness_${runId}`.replaceAll(/\W/g, "_").toLowerCase();

/**
 * Names a database a test or benchmark makes, such as `harness_20261110_223015_4821_db_…`.
 * Short enough for Postgres, which cuts names at 63 characters.
 */
const createDatabaseName = (runId: string, kind: string): string =>
	`${getRunPrefix(runId)}_${kind}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;

export default createDatabaseName;
