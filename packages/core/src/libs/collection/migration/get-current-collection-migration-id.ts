import type { ServiceFn } from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
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
				name: copy("server:core.error.schema.migration.required.name"),
				message: copy("server:core.error.schema.migration.required.message"),
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
