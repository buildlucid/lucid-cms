import fs from "node:fs/promises";
import path from "node:path";
import z from "zod";
import constants from "../../constants/constants.js";
import LucidError from "../../utils/errors/lucid-error.js";
import {
	mergeTranslationBundles,
	normalizeTranslationBundles,
} from "./translations.js";
import type { TranslationBundles } from "./types.js";

const translationFileSchema = z.record(z.string(), z.string());

const readTranslationFile = async (
	filePath: string,
): Promise<TranslationBundles> => {
	const entryName = path.basename(filePath);
	const match = entryName.match(constants.i18n.fileName);
	if (!match) {
		throw new LucidError({
			message: `Invalid translation file name "${entryName}". Expected "<locale>.<scope>.json", such as "en.admin.json" or "en.site.json".`,
			data: { filePath },
		});
	}

	const [, locale, scope] = match as [string, string, string];
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

	return { [locale]: { admin: {}, server: {}, [scope]: parsed } };
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
