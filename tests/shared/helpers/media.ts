import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Media, UploadSessionResponse } from "@lucidcms/core/types";
import {
	type ApiResponse,
	files,
	type Lucid,
	type MediaFile,
	type Session,
} from "#harness/client";

export { files, type MediaFile } from "#harness/client";

type UploadOptions = { public?: boolean };

/** An upload session the browser sends the whole file to in one request, as the harness's storage gives. */
type UploadSession = Extract<UploadSessionResponse, { protocol: "http" }>;

/** Throws with the response's details when a step of an upload is refused. */
const expectStatus = (
	action: string,
	response: { status: number; body: unknown },
	status: number,
) => {
	if (response.status !== status) {
		throw new Error(
			`${action} gave ${response.status}, not ${status}: ${JSON.stringify(response.body)}`,
		);
	}
};

/** Starts an upload session, as the admin's upload drawer does, and returns the raw response. */
export const startUpload = (
	session: Session,
	file: MediaFile,
	options: UploadOptions = {},
): Promise<ApiResponse<{ data: UploadSession }>> =>
	session.request<{ data: UploadSession }>({
		method: "POST",
		path: "/api/v1/media/upload-session",
		body: {
			fileName: file.name,
			mimeType: file.mimeType,
			size: file.bytes.byteLength,
			public: options.public ?? true,
		},
	});

/** Sends a file to the address an upload session gave. */
export const sendUpload = async (
	session: Session,
	upload: UploadSession,
	file: MediaFile,
): Promise<Response> => {
	const url = new URL(upload.request.url);
	return session.fetch(url.pathname + url.search, {
		method: upload.request.method,
		headers: { "content-type": file.mimeType },
		body: file.bytes.slice(),
	});
};

/** Completes an upload session, after which its key can be made into media. */
export const completeUpload = (session: Session, sessionId: string) =>
	session.request<{ data: { key: string } }>({
		method: "POST",
		path: `/api/v1/media/upload-session/${sessionId}/complete`,
		body: {},
	});

/**
 * Uploads a file through an upload session and returns its key, ready to create or replace
 * media with. Requires `feature:mediaStorage`, `media:create` and `media:update`.
 */
export const uploadFile = async (
	session: Session,
	file: MediaFile,
	options: UploadOptions = {},
): Promise<string> => {
	const started = await startUpload(session, file, options);
	expectStatus("Starting an upload", started, 200);

	const sent = await sendUpload(session, started.body.data, file);
	if (!sent.ok) {
		throw new Error(
			`Uploading the file gave ${sent.status}: ${await sent.text()}`,
		);
	}

	const completed = await completeUpload(session, started.body.data.sessionId);
	expectStatus("Completing the upload", completed, 200);
	return started.body.data.key;
};

/** Creates media from an uploaded key and returns the raw response. */
export const createMedia = (
	session: Session,
	key: string,
	options: {
		title: string;
		fileName: string;
		owned?: boolean;
		folderId?: number;
		body?: Record<string, unknown>;
	},
) =>
	session.request<{ data: Media }>({
		method: "POST",
		path: "/api/v1/media",
		body: {
			key,
			fileName: options.fileName,
			origin: "human",
			title: [{ localeCode: null, value: options.title }],
			owned: options.owned,
			folderId: options.folderId,
			...options.body,
		},
	});

/**
 * Uploads a file and returns its media ID. The file defaults to a text note. Requires
 * `feature:mediaStorage`, `media:create` and `media:update`. `owned` creates personal media,
 * which is always private, instead of library media.
 */
export const uploadMedia = async (
	session: Session,
	options: {
		title: string;
		owned?: boolean;
		file?: MediaFile;
		public?: boolean;
		folderId?: number;
	},
): Promise<number> => {
	const file = options.file ?? files.text(`${options.title}\n`);
	const key = await uploadFile(session, file, {
		//* personal media must be private
		public: options.public ?? !options.owned,
	});

	const created = await createMedia(session, key, {
		title: options.title,
		fileName: file.name,
		owned: options.owned,
		folderId: options.folderId,
	});
	expectStatus("Creating the media", created, 201);
	return created.body.data.id;
};

/** Reads one media item as the session sees it. */
export const getMedia = async (session: Session, id: number) => {
	const response = await session.request<{ data: Media }>({
		path: `/api/v1/media/${id}`,
	});
	expectStatus(`Reading media ${id}`, response, 200);
	return response.body.data;
};

/**
 * Replaces the media file and returns the raw response. The media URL stays unchanged. Uploads
 * default to public unless `public` is set.
 */
export const replaceMedia = async (
	session: Session,
	id: number,
	file: MediaFile,
	options: UploadOptions & { body?: Record<string, unknown> } = {},
) => {
	const key = await uploadFile(session, file, { public: options.public });
	return session.request({
		method: "PATCH",
		path: `/api/v1/media/${id}`,
		body: { key, fileName: file.name, ...options.body },
	});
};

/** Creates a media folder and returns its ID. Creating one answers with no body, so it is found by title. */
export const createFolder = async (
	session: Session,
	title: string,
	parentFolderId?: number,
): Promise<number> => {
	const created = await session.request({
		method: "POST",
		path: "/api/v1/media/folders",
		body: { title, parentFolderId },
	});
	expectStatus(`Creating folder "${title}"`, created, 204);

	const listed = await session.request<{
		data: { folders: Array<{ id: number; title: string }> };
	}>({
		path: "/api/v1/media/folders",
		query: {
			"filter[title]": title,
			...(parentFolderId !== undefined && {
				"filter[parentFolderId]": parentFolderId,
			}),
		},
	});
	const folder = listed.body.data.folders.find((item) => item.title === title);
	if (!folder) {
		throw new Error(`Folder "${title}" wasn't listed after creating it.`);
	}
	return folder.id;
};

/**
 * Fetches a media URL, such as a media item's `url`, from the CDN without following a redirect.
 * `query` is added to the URL, such as to ask for a preset.
 */
export const fetchCdn = (
	session: Session,
	url: string,
	init: RequestInit & { query?: Record<string, string> } = {},
) => {
	const target = new URL(url, "http://cms.invalid");
	for (const [name, value] of Object.entries(init.query ?? {})) {
		target.searchParams.set(name, value);
	}
	return session.fetch(target.pathname + target.search, {
		redirect: "manual",
		...init,
	});
};

/** The keys of every file stored in a folder, such as `lucid.uploads`, sorted. */
export const listStoredKeys = async (folder: string): Promise<string[]> => {
	const entries = await readdir(folder, {
		recursive: true,
		withFileTypes: true,
	}).catch((error: NodeJS.ErrnoException) => {
		if (error.code === "ENOENT") {
			return [];
		}
		throw error;
	});
	return entries
		.filter((entry) => entry.isFile())
		.map((entry) =>
			path.relative(folder, path.join(entry.parentPath, entry.name)),
		)
		.map((key) => key.split(path.sep).join("/"))
		.toSorted();
};

/**
 * What the CMS has counted as stored, which the storage limit is checked against. Host mode only.
 */
export const readStorageCounter = (lucid: Lucid) =>
	lucid.query(async (kysely) => {
		const row = await kysely
			.selectFrom("lucid_options")
			.select("value_int")
			.where("name", "=", "media_storage_used")
			.executeTakeFirst();
		return Number(row?.value_int ?? 0);
	});

/** The sizes of every media row and processed image, which the counter should equal. Host mode only. */
export const sumStoredSizes = (lucid: Lucid) =>
	lucid.query(async (kysely) => {
		const [media, processed] = await Promise.all([
			kysely.selectFrom("lucid_media").select("file_size").execute(),
			kysely.selectFrom("lucid_processed_images").select("file_size").execute(),
		]);
		return [...media, ...processed].reduce(
			(sum, row) => sum + Number(row.file_size),
			0,
		);
	});

/** How many image variants the CMS has stored for a key. Host mode only. */
export const countVariants = (lucid: Lucid, key: string) =>
	lucid.query(async (kysely) => {
		const rows = await kysely
			.selectFrom("lucid_processed_images")
			.select("key")
			.where("media_key", "=", key)
			.execute();
		return rows.length;
	});

/**
 * Returns missing and orphaned files by comparing disk with database records, including pending
 * uploads, for a host mode CMS or a migration database. Requires filesystem storage.
 */
export const findStorageDrift = async (
	lucid: Pick<Lucid, "query" | "uploads">,
) => {
	const [rows, onDisk] = await Promise.all([
		lucid.query(async (kysely) => {
			const [media, processed, pending] = await Promise.all([
				kysely.selectFrom("lucid_media").select("key").execute(),
				kysely.selectFrom("lucid_processed_images").select("key").execute(),
				kysely.selectFrom("lucid_media_awaiting_sync").select("key").execute(),
			]);
			return {
				expected: [...media, ...processed].map((row) => row.key),
				pending: pending.map((row) => row.key),
			};
		}),
		listStoredKeys(lucid.uploads),
	]);
	const stored = new Set(onDisk);
	const known = new Set([...rows.expected, ...rows.pending]);

	return {
		missing: rows.expected.filter((key) => !stored.has(key)).toSorted(),
		orphaned: onDisk.filter((key) => !known.has(key)),
	};
};
