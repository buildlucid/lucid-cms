import { expect, test, vi } from "vitest";
import constants from "../../constants/constants.js";
import type { LucidHost } from "./create-lucid-host.js";
import handleDevTask from "./handle-dev-task.js";

const runSync = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./tasks/index.js", () => ({
	default: { sync: { execute: runSync } },
}));

// Neither case reaches the host, so it can be empty.
const host = {} as unknown as LucidHost;
const dev = { token: "task-token", migrations: [], seeds: [] };
// Enough of a host for a task that doesn't connect to the database.
const taskHost = {
	config: {
		db: { registerExternalMigrations: () => {} },
		migrations: { definitions: [] },
	},
} as unknown as LucidHost;

const taskRequest = (name: string, token?: string) =>
	new Request(`http://localhost${constants.dev.taskPath}${name}`, {
		method: "POST",
		headers: token ? { [constants.dev.taskTokenHeader]: token } : {},
		body: "{}",
	});

test("leaves task requests without the server's token to the app", async () => {
	await expect(
		handleDevTask({ request: taskRequest("migrate"), host, dev }),
	).resolves.toBeUndefined();
	await expect(
		handleDevTask({ request: taskRequest("migrate", "wrong"), host, dev }),
	).resolves.toBeUndefined();
});

test("rejects task names Lucid doesn't have", async () => {
	const response = await handleDevTask({
		request: taskRequest("deploy", dev.token),
		host,
		dev,
	});

	expect(response?.status).toBe(404);
	await expect(response?.json()).resolves.toEqual({
		message: 'Lucid has no "deploy" task.',
	});
});

test("returns an empty result once the task's work is done", async () => {
	const response = await handleDevTask({
		request: new Request(`http://localhost${constants.dev.taskPath}sync`, {
			method: "POST",
			headers: { [constants.dev.taskTokenHeader]: dev.token },
			body: "{}",
		}),
		host: taskHost,
		dev,
	});

	expect(runSync).toHaveBeenCalledOnce();
	expect(response?.status).toBe(200);
	await expect(response?.json()).resolves.toEqual({});
});
