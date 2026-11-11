import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "@lucidcms/core";
import { pluginDirectory } from "@lucidcms/core/extension";
import { PLUGIN_KEY } from "../constants.js";

/** What a metadata file holds. Values that aren't text read as null. */
const storedMetadataSchema = z.object({
	mimeType: z.string().nullable().catch(null),
	extension: z.string().nullable().catch(null),
});

type StoredFileMetadata = z.infer<typeof storedMetadataSchema>;

/**
 * Where a file's metadata is kept: one JSON file per key in the plugin's folder, so uploads at the
 * same time never overwrite each other's, and the upload folder only holds media.
 */
export const getStoredMetadataPath = (key: string) =>
	path.join(pluginDirectory(PLUGIN_KEY), "metadata", `${key}.json`);

/** Reads the MIME type and extension a file was uploaded with, or null when none were kept. */
export const readStoredMetadata = async (
	key: string,
): Promise<StoredFileMetadata | null> => {
	let raw: string;
	try {
		raw = await readFile(getStoredMetadataPath(key), "utf8");
	} catch {
		return null;
	}

	try {
		return storedMetadataSchema.parse(JSON.parse(raw));
	} catch {
		return null;
	}
};

/** Keeps a file's metadata. Written to a temporary file and moved into place, so readers never see half of it. */
export const writeStoredMetadata = async (
	key: string,
	metadata: StoredFileMetadata,
) => {
	const target = getStoredMetadataPath(key);
	const temporary = `${target}.${randomUUID()}.tmp`;
	await mkdir(path.dirname(target), { recursive: true });
	await writeFile(temporary, JSON.stringify(metadata), "utf8");
	await rename(temporary, target);
};

export const deleteStoredMetadata = async (key: string) => {
	await rm(getStoredMetadataPath(key), { force: true });
};

/** Gives `toKey` the metadata `fromKey` has, or none when it has none. */
export const copyStoredMetadata = async (fromKey: string, toKey: string) => {
	const metadata = await readStoredMetadata(fromKey);
	if (!metadata) {
		await deleteStoredMetadata(toKey);
		return;
	}
	await writeStoredMetadata(toKey, metadata);
};
