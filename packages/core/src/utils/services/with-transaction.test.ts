import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { copy, createTranslationStore } from "../../libs/i18n/index.js";
import getTestConfig from "../test-helpers/get-test-config.js";
import createServiceContext from "./create-service-context.js";
import type { ServiceContext } from "./types.js";
import withTransaction from "./with-transaction.js";

const fixture = getTestConfig();
let context: ServiceContext;
const failure = {
	status: 400,
	message: copy("server:core.errors.default.message"),
};
const insert = async (context: ServiceContext, key: string) => {
	await context.db.kysely
		.insertInto("lucid_collections")
		.values({ key })
		.execute();
};
const exists = async (key: string) =>
	Boolean(
		await context.db.kysely
			.selectFrom("lucid_collections")
			.select("key")
			.where("key", "=", key)
			.executeTakeFirst(),
	);

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config,
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	await fixture.migrate();
});
afterAll(() => fixture.destroy());

test("commits a new transaction and returns the operation's data", async () => {
	const result = await withTransaction(context, async (transaction) => {
		expect(transaction.db.isTransaction).toBe(true);
		await insert(transaction, "tx_commit");
		return { error: undefined, data: { key: "tx_commit" } };
	});
	expect(result.data).toEqual({ key: "tx_commit" });
	expect(await exists("tx_commit")).toBe(true);
});

test("rolls back a returned error without throwing it", async () => {
	const result = await withTransaction(context, async (transaction) => {
		await insert(transaction, "tx_return_error");
		return { error: failure, data: undefined };
	});
	expect(result.error).toBe(failure);
	expect(await exists("tx_return_error")).toBe(false);
});

test("rolls back an unexpected exception and rethrows the same error", async () => {
	const error = new Error("Unexpected transaction failure.");
	await expect(
		withTransaction(context, async (transaction) => {
			await insert(transaction, "tx_throw");
			throw error;
		}),
	).rejects.toBe(error);
	expect(await exists("tx_throw")).toBe(false);
});

test("reuses the caller's transaction unless isolation is requested", async () => {
	const result = await withTransaction(context, async (parent) => {
		const child = await withTransaction(parent, async (transaction) => {
			expect(transaction).toBe(parent);
			await insert(transaction, "tx_reused");
			return { error: failure, data: undefined };
		});
		expect(child.error).toBe(failure);
		return { error: undefined, data: undefined };
	});
	expect(result.error).toBeUndefined();
	expect(await exists("tx_reused")).toBe(true);
});

test.each([
	"returned",
	"thrown",
])("isolates a %s failure while the caller commits its own work", async (mode) => {
	const key = `tx_isolated_${mode}`;
	const error = new Error("Unexpected savepoint failure.");
	const result = await withTransaction(context, async (parent) => {
		await insert(parent, `${key}_before`);
		const child = withTransaction(
			parent,
			async (transaction) => {
				await insert(transaction, key);
				if (mode === "thrown") throw error;

				return { error: failure, data: undefined };
			},
			{ isolate: true },
		);
		if (mode === "thrown") {
			await expect(child).rejects.toBe(error);
		} else {
			expect((await child).error).toBe(failure);
		}
		await insert(parent, `${key}_after`);
		return { error: undefined, data: undefined };
	});
	expect(result.error).toBeUndefined();
	expect(await exists(key)).toBe(false);
	expect(await exists(`${key}_before`)).toBe(true);
	expect(await exists(`${key}_after`)).toBe(true);
});

test("an isolated success still rolls back when the caller's transaction fails", async () => {
	const result = await withTransaction(context, async (parent) => {
		const child = await withTransaction(
			parent,
			async (transaction) => {
				await insert(transaction, "tx_child_success");
				return { error: undefined, data: undefined };
			},
			{ isolate: true },
		);
		expect(child.error).toBeUndefined();
		return { error: failure, data: undefined };
	});
	expect(result.error).toBe(failure);
	expect(await exists("tx_child_success")).toBe(false);
});

test("uses the supplied context without promising rollback on nontransactional adapters", async () => {
	const supports = context.config.db.supports.bind(context.config.db);
	const capability = vi
		.spyOn(context.config.db, "supports")
		.mockImplementation((feature) =>
			feature === "transaction" ? false : supports(feature),
		);
	try {
		const result = await withTransaction(
			context,
			async (received) => {
				expect(received).toBe(context);
				expect(received.db.isTransaction).toBe(false);
				await insert(received, "tx_unsupported");
				return { error: failure, data: undefined };
			},
			{ isolate: true },
		);
		expect(result.error).toBe(failure);
		expect(await exists("tx_unsupported")).toBe(true);
	} finally {
		capability.mockRestore();
	}
});
