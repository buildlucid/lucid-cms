import type { TransferFile, TransferMediaEntry } from "@types";
import { strFromU8, strToU8, unzip, type Zippable, zip } from "fflate";
import { isObjectRecord } from "@/utils/type-guards";

/** Where an export's JSON sits in its zip. */
const manifestPath = "export.json";

export type TransferUpload = {
	name: string;
	file: TransferFile;
	/** Bundled files keyed by their path in the zip, eg. `files/<uid>.webp`. */
	files: Map<string, Uint8Array<ArrayBuffer>>;
};

/** Narrows fflate's output to bytes Blob and File accept, copying only when it's backed by shared memory. */
const toArrayBufferBytes = (bytes: Uint8Array): Uint8Array<ArrayBuffer> =>
	bytes.buffer instanceof ArrayBuffer
		? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
		: bytes.slice();

const isTransferFile = (value: unknown): value is TransferFile =>
	isObjectRecord(value) && "lucid" in value && isObjectRecord(value.resources);

const serializeTransferFile = (file: TransferFile) =>
	JSON.stringify(file, null, "\t");

//* entries from uploaded files may be malformed, so names are checked rather than assumed
const fileExtension = (fileName: unknown) => {
	if (typeof fileName !== "string") return "bin";
	const extension = fileName.split(".").at(-1);
	return extension && extension !== fileName ? extension.toLowerCase() : "bin";
};

/** Downloads a media file from this site's CDN path, with the admin session for private files. */
const fetchSiteFile = async (url: string) => {
	try {
		const { pathname } = new URL(url);
		const response = await fetch(pathname, { credentials: "include" });
		if (!response.ok) return undefined;
		return new Uint8Array(await response.arrayBuffer());
	} catch {
		return undefined;
	}
};

type TransferArchiveOptions = {
	files?: Map<string, Uint8Array<ArrayBuffer>>;
	fetch?: boolean;
	onProgress?: (_done: number, _total: number) => void;
};

/**
 * Bundles supplied or downloaded media in a zip. Failed files retain source URLs for the importing
 * site to try.
 */
const createTransferArchive = async (
	file: TransferFile,
	options: TransferArchiveOptions,
): Promise<{ blob: Blob; missing: number }> => {
	const media = file.resources.media ?? [];
	const bundled: Zippable = {};
	let missing = 0;

	const entries: TransferMediaEntry[] = [];
	for (const [index, entry] of media.entries()) {
		options.onProgress?.(index, media.length);
		const path =
			typeof entry.file === "string"
				? entry.file
				: `files/${entry.uid}.${fileExtension(entry.fileName)}`;
		const bytes =
			options.files?.get(path) ??
			(options.fetch && entry.url ? await fetchSiteFile(entry.url) : undefined);
		if (!bytes) {
			missing++;
			const { file: _, ...linked } = entry;
			entries.push(linked);
			continue;
		}

		//* files are mostly compressed already, so they're stored as they are
		bundled[path] = [bytes, { level: 0 }];
		entries.push({ ...entry, file: path });
	}
	options.onProgress?.(media.length, media.length);

	const manifest: TransferFile = {
		...file,
		resources: { ...file.resources, media: entries },
	};
	const zipped = await new Promise<Uint8Array>((resolve, reject) => {
		zip(
			{
				[manifestPath]: strToU8(serializeTransferFile(manifest)),
				...bundled,
			},
			(error, data) => (error ? reject(error) : resolve(data)),
		);
	});

	return {
		blob: new Blob([toArrayBufferBytes(zipped)], { type: "application/zip" }),
		missing,
	};
};

/** Builds a zip with bundled media, otherwise JSON. `missing` counts files left as source URLs. */
export const createTransferDownload = async (
	file: TransferFile,
	options: TransferArchiveOptions & { bundle: boolean },
): Promise<{ blob: Blob; extension: "zip" | "json"; missing: number }> => {
	if (!options.bundle) {
		return {
			blob: new Blob([serializeTransferFile(file)], {
				type: "application/json",
			}),
			extension: "json",
			missing: 0,
		};
	}

	const archive = await createTransferArchive(file, options);
	return { ...archive, extension: "zip" };
};

/** Reads an export downloaded from Lucid: a JSON file, or a zip with its media files. Throws when it isn't one. */
export const readTransferUpload = async (
	upload: File,
): Promise<TransferUpload> => {
	const bytes = new Uint8Array(await upload.arrayBuffer());
	//* zip files start with "PK"
	const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;

	const entries = isZip
		? await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
				unzip(bytes, (error, data) => (error ? reject(error) : resolve(data)));
			})
		: { [manifestPath]: bytes };
	const manifest = entries[manifestPath];
	const file: unknown = manifest ? JSON.parse(strFromU8(manifest)) : undefined;
	if (!isTransferFile(file)) throw new Error("Not a Lucid export file.");

	return {
		name: upload.name,
		file,
		files: new Map(
			Object.entries(entries).flatMap(([path, bytes]) =>
				path === manifestPath ? [] : [[path, toArrayBufferBytes(bytes)]],
			),
		),
	};
};
