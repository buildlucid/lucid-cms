import fs from "node:fs/promises";
import path from "node:path";
import z from "zod";
import { LucidError } from "../../utils/errors/index.js";
import {
	pathExists,
	resolveSourcePath,
} from "../../utils/helpers/resolve-source-path.js";
import {
	mergeTranslationBundles,
	normalizeTranslationBundles,
} from "./translations.js";
import type { TranslationBundles, TranslationSource } from "./types.js";

const translationFileSchema = z.record(z.string(), z.string());
const translationFileNameRegex = /^(.+)\.(admin|server)\.json$/;

const readTranslationFile = async (
	filePath: string,
): Promise<TranslationBundles> => {
	const entryName = path.basename(filePath);
	const match = entryName.match(translationFileNameRegex);
	if (!match) {
		throw new LucidError({
			message: `Invalid translation file name "${entryName}". Expected "<locale>.admin.json" or "<locale>.server.json".`,
			data: { filePath },
		});
	}

	const [, locale, scope] = match as [string, string, "admin" | "server"];
	let parsed: Record<string, string>;
	try {
		parsed = translationFileSchema.parse(
			JSON.parse(await fs.readFile(filePath, "utf-8")),
		);
	} catch (error) {
		throw new LucidError({
			message: `Invalid translation file "${entryName}". Expected a flat JSON object of string keys and string values.`,
			data: {
				filePath,
				error: error instanceof Error ? error.message : error,
			},
		});
	}

	return {
		[locale]: {
			admin: scope === "admin" ? parsed : {},
			server: scope === "server" ? parsed : {},
		},
	};
};

const loadTranslationSource = async (
	sourcePath: string,
	options?: {
		optional?: boolean;
	},
): Promise<TranslationBundles> => {
	if (!(await pathExists(sourcePath))) {
		if (options?.optional) return {};
		throw new LucidError({
			message: `Translation source "${sourcePath}" does not exist.`,
		});
	}

	const stats = await fs.stat(sourcePath);
	if (stats.isFile()) {
		return readTranslationFile(sourcePath);
	}
	if (!stats.isDirectory()) {
		throw new LucidError({
			message: `Translation source "${sourcePath}" must be a file or directory.`,
		});
	}

	const entries = await fs.readdir(sourcePath, { withFileTypes: true });
	const bundles = await Promise.all(
		entries
			.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
			.map((entry) => readTranslationFile(path.join(sourcePath, entry.name))),
	);

	return mergeTranslationBundles(...bundles);
};

/**
 * Loads configured translation files and the optional project `translations/`
 * directory, then returns one merged bundle in runtime precedence order. Core
 * translations are added by the translation store, not this loader.
 */
export const loadTranslationSources = async (props: {
	projectRoot?: string;
	sources?: TranslationSource[];
	includeProjectDirectory?: boolean;
	projectDirectory?: string;
}): Promise<TranslationBundles> => {
	const configuredBundles = await Promise.all(
		(props.sources ?? []).map(async (source) =>
			loadTranslationSource(
				await resolveSourcePath(source, {
					projectRoot: props.projectRoot,
					label: "Translation source",
				}),
			),
		),
	);

	const projectBundles =
		props.includeProjectDirectory === false || !props.projectRoot
			? {}
			: await loadTranslationSource(
					path.join(
						props.projectRoot,
						props.projectDirectory ?? "translations",
					),
					{ optional: true },
				);

	return normalizeTranslationBundles(
		mergeTranslationBundles(...configuredBundles, projectBundles),
	);
};
