import T from "../../../translations/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { CollectionMigrationsRepository } from "../../repositories/index.js";

const getCurrentCollectionMigrationId: ServiceFn<[string], number> = async (
	context,
	collectionKey,
) => {
	const CollectionMigrations = new CollectionMigrationsRepository(
		context.db.client,
		context.config.db,
	);
	const latestMigrationRes =
		await CollectionMigrations.selectLatestByCollectionKey({
			collectionKey,
		});
	if (latestMigrationRes.error) return latestMigrationRes;

	if (!latestMigrationRes.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				name: T("error_schema_migration_required_name"),
				message: T("error_schema_migration_required_message"),
				status: 400,
			},
		};
	}

	return {
		data: latestMigrationRes.data.id,
		error: undefined,
	};
};

export default getCurrentCollectionMigrationId;
