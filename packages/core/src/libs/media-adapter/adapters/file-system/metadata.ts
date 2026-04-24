import { constants } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import constantsConfig from "../../../../constants/constants.js";
import { ensureLucidDirectoryExists } from "../../../../utils/helpers/lucid-directory.js";

type StoredFileMetadata = {
	mimeType?: string | null;
	extension?: string | null;
};

type StoredMetadataIndex = Record<string, StoredFileMetadata>;

const METADATA_FILE_NAME = "file-system-meta.json";

const getMetadataFilePath = () =>
	path.join(
		process.cwd(),
		constantsConfig.directories.lucid,
		METADATA_FILE_NAME,
	);

const readStoredMetadataIndex = async (
	_uploadDir: string,
): Promise<StoredMetadataIndex> => {
	const metadataPath = getMetadataFilePath();

	try {
		await access(metadataPath, constants.F_OK);
	} catch {
		return {};
	}

	try {
		const raw = await readFile(metadataPath, "utf8");
		const parsed = JSON.parse(raw) as StoredMetadataIndex;

		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return {};
		}

		return parsed;
	} catch {
		return {};
	}
};

const writeStoredMetadataIndex = async (
	_uploadDir: string,
	index: StoredMetadataIndex,
) => {
	const metadataPath = path.join(
		await ensureLucidDirectoryExists(),
		METADATA_FILE_NAME,
	);

	await mkdir(path.dirname(metadataPath), { recursive: true });

	if (Object.keys(index).length === 0) {
		try {
			await rm(metadataPath);
		} catch {}
		return;
	}

	await writeFile(metadataPath, JSON.stringify(index, null, 2), "utf8");
};

export const readStoredMetadata = async (
	uploadDir: string,
	key: string,
): Promise<StoredFileMetadata | null> => {
	const index = await readStoredMetadataIndex(uploadDir);
	const storedMetadata = index[key];

	if (!storedMetadata || typeof storedMetadata !== "object") {
		return null;
	}

	return {
		mimeType:
			typeof storedMetadata.mimeType === "string"
				? storedMetadata.mimeType
				: null,
		extension:
			typeof storedMetadata.extension === "string"
				? storedMetadata.extension
				: null,
	};
};

export const writeStoredMetadata = async (
	uploadDir: string,
	key: string,
	metadata: StoredFileMetadata,
) => {
	const index = await readStoredMetadataIndex(uploadDir);

	index[key] = {
		mimeType: metadata.mimeType ?? null,
		extension: metadata.extension ?? null,
	};

	await writeStoredMetadataIndex(uploadDir, index);
};

export const deleteStoredMetadata = async (uploadDir: string, key: string) => {
	const index = await readStoredMetadataIndex(uploadDir);

	if (!(key in index)) return;

	delete index[key];
	await writeStoredMetadataIndex(uploadDir, index);
};

export const copyStoredMetadata = async (
	uploadDir: string,
	fromKey: string,
	toKey: string,
) => {
	const index = await readStoredMetadataIndex(uploadDir);
	const storedMetadata = index[fromKey];

	if (!storedMetadata) {
		delete index[toKey];
		await writeStoredMetadataIndex(uploadDir, index);
		return;
	}

	index[toKey] = {
		mimeType:
			typeof storedMetadata.mimeType === "string"
				? storedMetadata.mimeType
				: null,
		extension:
			typeof storedMetadata.extension === "string"
				? storedMetadata.extension
				: null,
	};

	await writeStoredMetadataIndex(uploadDir, index);
};

export const getStoredMetadataFilePath = getMetadataFilePath;
