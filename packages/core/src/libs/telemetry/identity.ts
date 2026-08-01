import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import constants from "../../constants/constants.js";

const telemetryIdPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const readTelemetryId = async (filePath: string) => {
	try {
		const value = (await readFile(filePath, "utf8")).trim().toLowerCase();
		return telemetryIdPattern.test(value) ? value : undefined;
	} catch {
		return undefined;
	}
};

/**
 * Returns a project-scoped telemetry identifier without depending on the CMS
 * database or the authenticated Lucid Remote connection identity.
 */
export const getOrCreateTelemetryId = async (projectRoot: string) => {
	const directory = path.join(projectRoot, constants.directories.lucid);
	const filePath = path.join(directory, "telemetry-id");
	const existing = await readTelemetryId(filePath);
	if (existing) return existing;

	const generated = crypto.randomUUID();

	try {
		await mkdir(directory, { recursive: true });
		try {
			await writeFile(filePath, `${generated}\n`, {
				encoding: "utf8",
				flag: "wx",
				mode: 0o600,
			});
			return generated;
		} catch {
			const concurrent = await readTelemetryId(filePath);
			if (concurrent) return concurrent;

			await writeFile(filePath, `${generated}\n`, {
				encoding: "utf8",
				mode: 0o600,
			});
			return generated;
		}
	} catch {
		return generated;
	}
};
