import fs from "node:fs/promises";
import path from "node:path";
import z from "zod";
import { LucidError } from "../../utils/errors/index.js";
import type { TranslationBundles } from "./types.js";

const translationFileSchema = z.record(z.string(), z.string());
const translationFileNameRegex = /^(.+)\.(admin|server)\.json$/;

const pathExists = async (targetPath: string) => {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
};

/**
 * Loads flat project translation files from `translations/`.
 *
 * Source/dev runtimes can read these files directly; build runtimes pre-render
 * the loaded bundle so hosts without filesystem access still receive the same
 * project overrides.
 */
export const loadProjectTranslations = async (props: {
	projectRoot?: string;
	directory?: string;
}): Promise<TranslationBundles> => {
	if (!props.projectRoot) return {};

	const directory = path.join(
		props.projectRoot,
		props.directory ?? "translations",
	);
	if (!(await pathExists(directory))) return {};

	const entries = await fs.readdir(directory, { withFileTypes: true });
	const bundles: TranslationBundles = {};

	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

		const match = entry.name.match(translationFileNameRegex);
		if (!match) {
			throw new LucidError({
				message: `Invalid translation file name "${entry.name}". Expected "<locale>.admin.json" or "<locale>.server.json".`,
				data: { directory },
			});
		}

		const [, locale, scope] = match as [string, string, "admin" | "server"];
		const filePath = path.join(directory, entry.name);
		let parsed: Record<string, string>;
		try {
			parsed = translationFileSchema.parse(
				JSON.parse(await fs.readFile(filePath, "utf-8")),
			);
		} catch (error) {
			throw new LucidError({
				message: `Invalid translation file "${entry.name}". Expected a flat JSON object of string keys and string values.`,
				data: {
					filePath,
					error: error instanceof Error ? error.message : error,
				},
			});
		}

		bundles[locale] = bundles[locale] ?? {
			admin: {},
			server: {},
		};
		bundles[locale][scope] = parsed;
	}

	return bundles;
};
