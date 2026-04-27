import type { ErrorResponse, ResponseBody } from "@types";
import {
	completeUploadSessionReq,
	getUploadPartUrlsReq,
	getUploadSessionReq,
} from "@/services/api/media/uploadSessionRequests";
import type {
	UploadSessionPart,
	UploadSessionResponse,
} from "@/services/api/media/useCreateUploadSession";
import T from "@/translations";
import { LucidError } from "@/utils/error-handling";

const CONCURRENCY = 3;
const RETRY_DELAYS = [0, 1000, 3000, 5000];
const STORAGE_PREFIX = "lucid-upload-session";

type StartUploadSession = () => Promise<ResponseBody<UploadSessionResponse>>;

type UploadMediaFileProps = {
	file: File;
	scope: string;
	start: StartUploadSession;
	onProgress?: (_progress: number) => void;
	signal?: AbortSignal;
};

type UploadResult<T> =
	| {
			error: ErrorResponse;
			data: undefined;
	  }
	| {
			error: undefined;
			data: T;
	  };

type StoredUploadSession = {
	sessionId: string;
	key: string;
	expiresAt: string;
};

/**
 * Builds a stable local resume key so the same file and surface can reuse an
 * unfinished server upload session after a refresh or transient failure.
 */
const fingerprint = (scope: string, file: File) =>
	`${STORAGE_PREFIX}:${scope}:${file.name}:${file.size}:${file.lastModified}`;

/**
 * Reads cached sessions defensively because browser storage can be stale,
 * expired, or manually edited.
 */
const getStoredSession = (key: string): StoredUploadSession | null => {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const value = JSON.parse(raw) as StoredUploadSession;
		if (new Date(value.expiresAt).getTime() < Date.now()) {
			localStorage.removeItem(key);
			return null;
		}
		return value;
	} catch {
		localStorage.removeItem(key);
		return null;
	}
};

/** Stores only the server identifiers needed to ask Lucid whether resume is valid. */
const putStoredSession = (key: string, session: StoredUploadSession) => {
	localStorage.setItem(key, JSON.stringify(session));
};

/** Normalizes upload failures into the admin error shape used by form flows. */
const uploadError = (message: string, status = 500): ErrorResponse => ({
	status,
	name: T()("media_upload_error"),
	message,
});

const toUploadError = (error: unknown): ErrorResponse => {
	if (error instanceof LucidError) return error.errorRes;
	if (error instanceof Error) return uploadError(error.message);
	return uploadError(T()("media_upload_error_description"));
};

/**
 * Uses XMLHttpRequest so uploads can report byte-level progress while still
 * supporting cancellation.
 */
const uploadWithXhr = (props: {
	url: string;
	body: Blob | File;
	headers?: Record<string, string>;
	onProgress?: (_loaded: number) => void;
	signal?: AbortSignal;
}): Promise<UploadResult<XMLHttpRequest>> => {
	return new Promise((resolve) => {
		if (props.signal?.aborted) {
			resolve({
				error: uploadError(T()("upload_aborted")),
				data: undefined,
			});
			return;
		}

		const xhr = new XMLHttpRequest();
		const cleanup = () => {
			props.signal?.removeEventListener("abort", abort);
		};
		const abort = () => {
			xhr.abort();
			cleanup();
			resolve({
				error: uploadError(T()("upload_aborted")),
				data: undefined,
			});
		};

		props.signal?.addEventListener("abort", abort, { once: true });
		xhr.open("PUT", props.url);
		for (const [key, value] of Object.entries(props.headers ?? {})) {
			xhr.setRequestHeader(key, value);
		}
		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) props.onProgress?.(event.loaded);
		};
		xhr.onload = () => {
			cleanup();
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve({
					error: undefined,
					data: xhr,
				});
				return;
			}
			resolve({
				error: uploadError(
					xhr.responseText || xhr.statusText || T()("media_upload_failed"),
				),
				data: undefined,
			});
		};
		xhr.onerror = () => {
			cleanup();
			resolve({
				error: uploadError(xhr.statusText || T()("media_upload_failed")),
				data: undefined,
			});
		};
		xhr.onabort = () => {
			cleanup();
			resolve({
				error: uploadError(T()("upload_aborted")),
				data: undefined,
			});
		};
		xhr.send(props.body);
	});
};

/**
 * Reads exposed response headers without triggering browser console errors when
 * storage CORS rules hide headers like ETag.
 */
const getReadableResponseHeader = (xhr: XMLHttpRequest, headerName: string) => {
	const normalizedHeaderName = headerName.toLowerCase();
	const headerLine = xhr
		.getAllResponseHeaders()
		.split(/\r?\n/)
		.find((line) => line.toLowerCase().startsWith(`${normalizedHeaderName}:`));
	if (!headerLine) return null;
	return headerLine.slice(headerLine.indexOf(":") + 1).trim();
};

/** Retries transient upload failures with small backoffs before returning an error value. */
const withRetries = async <T>(
	fn: () => Promise<UploadResult<T>>,
): Promise<UploadResult<T>> => {
	let lastError: ErrorResponse | undefined;
	for (const delay of RETRY_DELAYS) {
		if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
		const result = await fn();
		if (!result.error) return result;
		lastError = result.error;
	}
	return {
		error: lastError ?? uploadError(T()("media_upload_failed")),
		data: undefined,
	};
};

/**
 * Reconciles a local resume pointer with the server before creating a new
 * session, keeping the server as the source of truth.
 */
const getResumableSession = async (
	storageKey: string,
	start: StartUploadSession,
) => {
	const stored = getStoredSession(storageKey);
	if (stored) {
		try {
			const existing = await getUploadSessionReq(stored.sessionId);
			if (existing.data.mode === "resumable") return existing.data;
		} catch {
			localStorage.removeItem(storageKey);
		}
	}

	const created = await start();
	if (created.data.mode === "resumable") {
		putStoredSession(storageKey, {
			sessionId: created.data.sessionId,
			key: created.data.key,
			expiresAt: created.data.expiresAt,
		});
	}
	return created.data;
};

/**
 * Uploads only missing chunks, reconciles hidden ETags with the server, and
 * completes the session after every part is accounted for.
 */
const uploadResumable = async (
	file: File,
	session: Extract<UploadSessionResponse, { mode: "resumable" }>,
	onProgress?: (_progress: number) => void,
	signal?: AbortSignal,
): Promise<UploadResult<string>> => {
	const uploaded = new Map<number, UploadSessionPart>();
	for (const part of session.uploadedParts) uploaded.set(part.partNumber, part);

	const totalParts = Math.max(1, Math.ceil(file.size / session.partSize));
	let completedBytes = session.uploadedParts.reduce(
		(total, part) => total + (part.size ?? session.partSize),
		0,
	);
	const inFlight = new Map<number, number>();
	const updateProgress = () => {
		const activeBytes = Array.from(inFlight.values()).reduce(
			(total, bytes) => total + bytes,
			0,
		);
		onProgress?.(
			Math.min(((completedBytes + activeBytes) / file.size) * 100, 99),
		);
	};

	const missingPartNumbers = Array.from(
		{ length: totalParts },
		(_, index) => index + 1,
	).filter((partNumber) => !uploaded.has(partNumber));

	const urlByPart =
		missingPartNumbers.length > 0
			? new Map(
					(
						await getUploadPartUrlsReq({
							sessionId: session.sessionId,
							partNumbers: missingPartNumbers,
						})
					).data.parts.map((part) => [part.partNumber, part]),
				)
			: new Map<
					number,
					{
						partNumber: number;
						url: string;
						headers?: Record<string, string>;
					}
				>();
	let nextIndex = 0;
	let needsServerReconcile = false;

	const worker = async () => {
		while (nextIndex < missingPartNumbers.length) {
			if (signal?.aborted) {
				return {
					error: uploadError(T()("upload_aborted")),
					data: undefined,
				} satisfies UploadResult<undefined>;
			}
			const partNumber = missingPartNumbers[nextIndex];
			nextIndex += 1;
			if (partNumber === undefined) continue;

			const start = (partNumber - 1) * session.partSize;
			const end = Math.min(start + session.partSize, file.size);
			const chunk = file.slice(start, end);
			const partUrl = urlByPart.get(partNumber);
			if (!partUrl) {
				return {
					error: uploadError(T()("missing_upload_part_url")),
					data: undefined,
				} satisfies UploadResult<undefined>;
			}

			const xhrRes = await withRetries(() =>
				uploadWithXhr({
					url: partUrl.url,
					body: chunk,
					headers: partUrl.headers,
					signal,
					onProgress: (loaded) => {
						inFlight.set(partNumber, loaded);
						updateProgress();
					},
				}),
			);
			if (xhrRes.error) return xhrRes;
			inFlight.delete(partNumber);
			const etag = getReadableResponseHeader(xhrRes.data, "etag")?.replace(
				/"/g,
				"",
			);
			if (!etag) needsServerReconcile = true;
			completedBytes += chunk.size;
			uploaded.set(partNumber, {
				partNumber,
				etag: etag ?? "",
				size: chunk.size,
			});
			updateProgress();
		}

		return {
			error: undefined,
			data: undefined,
		} satisfies UploadResult<undefined>;
	};

	const workerResults = await Promise.all(
		Array.from(
			{ length: Math.min(CONCURRENCY, missingPartNumbers.length) },
			() => worker(),
		),
	);
	const workerError = workerResults.find((result) => result.error)?.error;
	if (workerError) {
		return {
			error: workerError,
			data: undefined,
		};
	}

	if (
		needsServerReconcile ||
		Array.from(uploaded.values()).some((part) => part.etag.length === 0)
	) {
		const reconciled = await getUploadSessionReq(session.sessionId);
		if (reconciled.data.mode !== "resumable") {
			return {
				error: uploadError(T()("upload_session_no_longer_resumable")),
				data: undefined,
			};
		}
		for (const part of reconciled.data.uploadedParts) {
			uploaded.set(part.partNumber, part);
		}
	}

	const completedParts = Array.from(uploaded.values()).sort(
		(a, b) => a.partNumber - b.partNumber,
	);
	if (
		completedParts.length !== totalParts ||
		completedParts.some((part) => part.etag.length === 0)
	) {
		return {
			error: uploadError(T()("uploaded_parts_not_reconciled")),
			data: undefined,
		};
	}

	const complete = await completeUploadSessionReq({
		sessionId: session.sessionId,
		parts: completedParts,
	});
	onProgress?.(100);
	return {
		error: undefined,
		data: complete.data.key,
	};
};

/**
 * Shared admin upload entry point that hides adapter mode differences while
 * exposing progress, abort, retry, and resume behavior.
 */
export const uploadMediaFile = async (
	props: UploadMediaFileProps,
): Promise<UploadResult<string>> => {
	try {
		props.onProgress?.(0);
		const storageKey = fingerprint(props.scope, props.file);
		const session = await getResumableSession(storageKey, props.start);

		if (session.mode === "single") {
			const uploadRes = await uploadWithXhr({
				url: session.url,
				body: props.file,
				headers: {
					...(props.file.type ? { "content-type": props.file.type } : {}),
					...session.headers,
				},
				signal: props.signal,
				onProgress: (loaded) => {
					props.onProgress?.(
						props.file.size === 0 ? 100 : (loaded / props.file.size) * 100,
					);
				},
			});
			if (uploadRes.error) {
				return {
					error: uploadRes.error,
					data: undefined,
				};
			}
			props.onProgress?.(100);
			return {
				error: undefined,
				data: session.key,
			};
		}

		const key = await uploadResumable(
			props.file,
			session,
			props.onProgress,
			props.signal,
		);
		if (key.error) return key;
		localStorage.removeItem(storageKey);
		return key;
	} catch (error) {
		return {
			error: toUploadError(error),
			data: undefined,
		};
	}
};
