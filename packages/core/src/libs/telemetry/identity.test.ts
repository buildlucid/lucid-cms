import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { getOrCreateTelemetryId } from "./identity.js";

const directories: string[] = [];

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

const createProject = async () => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "lucid-telemetry-"));
	directories.push(directory);
	return directory;
};

describe("telemetry identity", () => {
	test("persists one project-scoped random identifier", async () => {
		const projectRoot = await createProject();
		const first = await getOrCreateTelemetryId(projectRoot);
		const second = await getOrCreateTelemetryId(projectRoot);

		expect(second).toBe(first);
		expect(
			await readFile(path.join(projectRoot, ".lucid", "telemetry-id"), "utf8"),
		).toBe(`${first}\n`);
	});

	test("replaces invalid generated state", async () => {
		const projectRoot = await createProject();
		const filePath = path.join(projectRoot, ".lucid", "telemetry-id");
		await getOrCreateTelemetryId(projectRoot);
		await writeFile(filePath, "invalid\n", "utf8");

		const recovered = await getOrCreateTelemetryId(projectRoot);

		expect(recovered).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
		expect(await readFile(filePath, "utf8")).toBe(`${recovered}\n`);
	});
});
