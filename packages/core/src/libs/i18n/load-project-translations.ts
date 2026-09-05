import fs from "node:fs/promises";
import path from "node:path";
import z from "zod";
import LucidError from "../../utils/errors/lucid-error.js";
import {
	mergeTranslationBundles,
	normalizeTranslationBundles,
} from "./translations.js";
import type { TranslationBundles } from "./types.js";

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

/** Reads resolved translation files in their configured override order. */
export const loadTranslationSources = async (props: {
	files?: import("../resources/types.js").ResourceFile[];
}): Promise<TranslationBundles> => {
	const files =
		props.files?.filter((file) => file.path.endsWith(".json")) ?? [];
	const bundles = await Promise.all(
		files.map((file) => readTranslationFile(file.path)),
	);
	return normalizeTranslationBundles(mergeTranslationBundles(...bundles));
};
