import testConfig from "./test-config.js";

const migrateDatabase = async () => {
	const res = await testConfig.basic();
	await res.db.migrateToLatest();
};

const destroyDatabase = async () => {
	const res = await testConfig.basic();
	await res.db.client.destroy();
};

const testDatabase = {
	migrate: migrateDatabase,
	destroy: destroyDatabase,
};

export default testDatabase;
