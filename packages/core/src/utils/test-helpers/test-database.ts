import testConfig from "./test-config.js";

const migrateDatabase = async () => {
	const config = await testConfig.basic();
	await config.db.migrateToLatest();
};

const destroyDatabase = async () => {
	const config = await testConfig.basic();
	await config.db.client.destroy();
};

const testDatabase = {
	migrate: migrateDatabase,
	destroy: destroyDatabase,
};

export default testDatabase;
