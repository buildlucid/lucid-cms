import { afterAll, beforeAll, expect, test } from "vitest";
import z from "zod/v4";
import passthroughKVAdapter from "../../libs/kv-adapter/adapters/passthrough.js";
import passthroughQueueAdapter from "../../libs/queue-adapter/adapters/passthrough.js";
import getTestConfig from "../test-helpers/get-test-config.js";
import serviceWrapper from "./service-wrapper.js";
import type { ServiceFn, ServiceResponse } from "./types.js";
import mergeServiceError from "./utils/merge-errors.js";

const CONSTANTS = {
	error: {
		level1: mergeServiceError({
			type: "basic",
			status: 500,
			name: "Example Error - Level 1",
		}),
		level2: mergeServiceError({
			type: "basic",
			status: 500,
			name: "Example Error - Level 2",
		}),
	},
};

// -----------------------------------------------
// Setup and Teardown
const testConfig = getTestConfig();

beforeAll(async () => {
	await testConfig.migrate();
});

afterAll(async () => {
	await testConfig.destroy();
});

// -----------------------------------------------
// Tests

test("basic - one level deep service wrapper success and error", async () => {
	const config = await testConfig.getConfig();

	// Setup
	const testService: ServiceFn<
		[
			{
				data: Record<string, string>;
				returnError: boolean;
			},
		],
		Record<string, string>
	> = async (_, data) => {
		await new Promise((resolve) => setTimeout(resolve, 50));

		if (data.returnError) {
			return {
				error: CONSTANTS.error.level1,
				data: undefined,
			};
		}
		return {
			error: undefined,
			data: data.data,
		};
	};

	const queueAdapter = passthroughQueueAdapter();
	const kvAdapter = passthroughKVAdapter();

	// Execute
	const [success, error] = await Promise.all([
		serviceWrapper(testService, {
			transaction: false,
		})(
			{
				db: config.db.client,
				config: config,
				queue: queueAdapter,
				kv: kvAdapter,
				env: null,
			},
			{
				data: {
					test: "test",
				},
				returnError: false,
			},
		),
		serviceWrapper(testService, {
			transaction: false,
		})(
			{
				db: config.db.client,
				config: config,
				queue: queueAdapter,
				kv: kvAdapter,
				env: null,
			},
			{
				data: {
					test: "test",
				},
				returnError: true,
			},
		),
	]);

	expect(success.data).toBeDefined();
	expect(error.error).toEqual(CONSTANTS.error.level1);
});

test("basic - two level deep service wrapper success and error", async () => {
	//* requires service to handle returning errors

	const config = await testConfig.getConfig();

	// Setup
	const testServiceOne: ServiceFn<
		[
			{
				data: Record<string, string>;
				returnError: boolean;
			},
		],
		Record<string, string>
	> = async (service, data) => {
		await new Promise((resolve) => setTimeout(resolve, 50));

		const serviceTwo = await testServiceTwo(service, data);
		if (serviceTwo.error) return serviceTwo;

		if (data.returnError) {
			return {
				error: CONSTANTS.error.level1,
				data: undefined,
			};
		}
		return {
			error: undefined,
			data: data.data,
		};
	};
	const testServiceTwo: ServiceFn<
		[
			{
				data: Record<string, string>;
				returnError: boolean;
			},
		],
		Record<string, string>
	> = async (_, data): ServiceResponse<Record<string, string>> => {
		await new Promise((resolve) => setTimeout(resolve, 50));

		if (data.returnError) {
			return {
				error: CONSTANTS.error.level2,
				data: undefined,
			};
		}
		return {
			error: undefined,
			data: data.data,
		};
	};

	const queueAdapter = passthroughQueueAdapter();
	const kvAdapter = passthroughKVAdapter();

	// Execute
	const [success, error] = await Promise.all([
		serviceWrapper(testServiceOne, {
			transaction: false,
		})(
			{
				db: config.db.client,
				config: config,
				queue: queueAdapter,
				kv: kvAdapter,
				env: null,
			},
			{
				data: {
					test: "test",
				},
				returnError: false,
			},
		),
		serviceWrapper(testServiceOne, {
			transaction: false,
		})(
			{
				db: config.db.client,
				config: config,
				queue: queueAdapter,
				kv: kvAdapter,
				env: null,
			},
			{
				data: {
					test: "test",
				},
				returnError: true,
			},
		),
	]);

	expect(success.data).toBeDefined();
	expect(error.error).toEqual(CONSTANTS.error.level2);
});

test("transaction - one level deep service wrapper success and error", async () => {
	const config = await testConfig.getConfig();
	const successCollectionKey = "transaction_test_success_1";
	const errorCollectionKey = "transaction_test_error_1";

	// Setup
	const createCollection: ServiceFn<
		[
			{
				collectionKey: string;
				returnError: boolean;
			},
		],
		{ key: string }
	> = async (service, data) => {
		const documentRes = await service.db
			.insertInto("lucid_collections")
			.values({
				key: data.collectionKey,
			})
			.returning("key")
			.executeTakeFirst();

		if (data.returnError) {
			return {
				error: CONSTANTS.error.level1,
				data: undefined,
			};
		}

		if (documentRes === undefined)
			return {
				error: CONSTANTS.error.level1,
				data: undefined,
			};

		return {
			error: undefined,
			data: documentRes,
		};
	};

	const queueAdapter = passthroughQueueAdapter();
	const kvAdapter = passthroughKVAdapter();

	// Execute
	const [success, error] = await Promise.all([
		serviceWrapper(createCollection, {
			transaction: true,
		})(
			{
				db: config.db.client,
				config: config,
				queue: queueAdapter,
				kv: kvAdapter,
				env: null,
			},
			{
				collectionKey: successCollectionKey,
				returnError: false,
			},
		),
		serviceWrapper(createCollection, {
			transaction: true,
		})(
			{
				db: config.db.client,
				config: config,
				queue: queueAdapter,
				kv: kvAdapter,
				env: null,
			},
			{
				collectionKey: errorCollectionKey,
				returnError: true, // toggle to verify transaction rollback is working
			},
		),
	]);

	expect(success.data).toBeDefined();
	expect(error.error).toEqual(CONSTANTS.error.level1);
	expect(
		await config.db.client
			.selectFrom("lucid_collections")
			.select("key")
			.where("key", "=", errorCollectionKey)
			.executeTakeFirst(),
	).toBeUndefined();
});

test("transaction - two level deep service wrapper success and error", async () => {
	const config = await testConfig.getConfig();
	const successCollectionKey = "transaction_test_success_2";
	const successCollectionKeyLevel2 = "transaction_test_success_2_level2";
	const errorCollectionKey = "transaction_test_error_2";
	const errorCollectionKeyLevel2 = "transaction_test_error_2_level2";

	// Setup
	const createCollectionWithDepth: ServiceFn<
		[
			{
				collectionKey: string;
				returnError: boolean;
				levelTwo: {
					call: boolean;
					returnError: boolean;
					collectionKey: string;
				};
			},
		],
		{ key: string }
	> = async (service, data) => {
		const documentRes = await service.db
			.insertInto("lucid_collections")
			.values({
				key: data.collectionKey,
			})
			.returning("key")
			.executeTakeFirst();

		if (data.returnError) {
			return {
				error: data.levelTwo.call
					? CONSTANTS.error.level1
					: CONSTANTS.error.level2,
				data: undefined,
			};
		}

		if (documentRes === undefined)
			return {
				error: data.levelTwo.call
					? CONSTANTS.error.level1
					: CONSTANTS.error.level2,
				data: undefined,
			};

		if (data.levelTwo.call) {
			return await createCollectionWithDepth(service, {
				collectionKey: data.levelTwo.collectionKey,
				returnError: data.levelTwo.returnError,
				levelTwo: {
					...data.levelTwo,
					call: false,
				},
			});
		}

		return {
			error: undefined,
			data: documentRes,
		};
	};

	const queueAdapter = passthroughQueueAdapter();
	const kvAdapter = passthroughKVAdapter();

	// Execute
	const [success, error] = await Promise.all([
		serviceWrapper(createCollectionWithDepth, {
			transaction: true,
		})(
			{
				db: config.db.client,
				config: config,
				queue: queueAdapter,
				kv: kvAdapter,
				env: null,
			},
			{
				collectionKey: successCollectionKey,
				returnError: false,
				levelTwo: {
					call: true,
					returnError: false,
					collectionKey: successCollectionKeyLevel2,
				},
			},
		),
		serviceWrapper(createCollectionWithDepth, {
			transaction: true,
		})(
			{
				db: config.db.client,
				config: config,
				queue: queueAdapter,
				kv: kvAdapter,
				env: null,
			},
			{
				collectionKey: errorCollectionKey,
				returnError: false,
				levelTwo: {
					call: true,
					returnError: true, // toggle to verify transaction rollback is working from level two
					collectionKey: errorCollectionKeyLevel2,
				},
			},
		),
	]);

	expect(success.data).toBeDefined();
	expect(error.error).toEqual(CONSTANTS.error.level2);

	const [successDocuments, errorDocuments] = await Promise.all([
		config.db.client
			.selectFrom("lucid_collections")
			.select("key")
			.where("key", "in", [successCollectionKey, successCollectionKeyLevel2])
			.execute(),
		config.db.client
			.selectFrom("lucid_collections")
			.select("key")
			.where("key", "in", [errorCollectionKey, errorCollectionKeyLevel2])
			.execute(),
	]);

	expect(successDocuments.length).toBe(2);
	expect(errorDocuments.length).toBe(0);
});

test("service wrapper schema validation", async () => {
	const config = await testConfig.getConfig();

	const schema = z.object({
		key: z.string(),
		value: z.string(),
	});

	// Setup
	const testService: ServiceFn<
		[Record<string, string>],
		Record<string, string>
	> = async (service, data) => {
		return {
			error: undefined,
			data: data,
		};
	};

	const queueAdapter = passthroughQueueAdapter();
	const kvAdapter = passthroughKVAdapter();

	// Execute
	const [success, error] = await Promise.all([
		serviceWrapper(testService, {
			transaction: false,
			schema: schema,
		})(
			{
				db: config.db.client,
				config: config,
				queue: queueAdapter,
				kv: kvAdapter,
				env: null,
			},
			{
				key: "test",
				value: "test",
			},
		),
		serviceWrapper(testService, {
			transaction: false,
			schema: schema,
		})(
			{
				db: config.db.client,
				config: config,
				queue: queueAdapter,
				kv: kvAdapter,
				env: null,
			},
			{
				key: "test",
				// @ts-expect-error
				value: 100,
			},
		),
	]);

	expect(success.data).toEqual({
		key: "test",
		value: "test",
	});
	expect(error.error?.zod).toBeDefined();
});
