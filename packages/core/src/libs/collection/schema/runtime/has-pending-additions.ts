import type { SchemaConfigDiff } from "./diff-snapshot-vs-config.js";

/**
 * Whether the config has tables, columns or indexes the database is still waiting for. The
 * runtime schema leaves those out until a migration adds them.
 */
const hasPendingAdditions = (diff: SchemaConfigDiff): boolean =>
	diff.missingTableNames.size > 0 ||
	diff.missingColumnsByTable.size > 0 ||
	diff.missingIndexesByTable.size > 0;

export default hasPendingAdditions;
