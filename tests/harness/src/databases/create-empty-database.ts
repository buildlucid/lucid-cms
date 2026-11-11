import type {
	DatabaseDriver,
	DatabaseLocation,
	ProvisionedDatabase,
} from "./types.ts";

/** Creates a database with nothing in it, for work that runs its own migrations. */
const createEmptyDatabase = async (
	driver: DatabaseDriver,
	location: DatabaseLocation,
): Promise<ProvisionedDatabase> => {
	const pending = await driver.createTemplate(location);
	return { url: pending.url, destroy: pending.discard };
};

export default createEmptyDatabase;
