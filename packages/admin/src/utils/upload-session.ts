import type {
	ErrorResponse,
	ResponseBody,
	UploadSessionPart,
	UploadSessionResponse,
} from "@types";
import {
	completeUploadSessionReq,
	getUploadPartUrlsReq,
	getUploadSessionReq,
} from "@/services/api/media/uploadSessionRequests";
import T from "@/translations";
import { LucidError } from "@/utils/error-handling";

const CONCURRENCY = 3;
const RETRY_DELAYS = [0, 1000, 3000, 5000];
const STORAGE_PREFIX = "lucid-upload-session";

type StartUploadSession = () => Promise<ResponseBody<UploadSessionResponse>>;
type MultipartUploadSession = Extract<
	UploadSessionResponse,
	{ protocol: "multipart-parts" }
>;
type TusUploadSession = Extract<UploadSessionResponse, { protocol: "tus" }>;

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
	tusUploadUrl?: string;
};

type ResolvedUploadSession = {
	session: UploadSessionResponse;
	tusUploadUrl?: string;
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
	name: T()("media.upload.error.title"),
	message,
});

const toUploadError = (error: unknown): ErrorResponse => {
	if (error instanceof LucidError) return error.errorRes;
	if (error instanceof Error) return uploadError(error.message);
	return uploadError(T()("media.upload.error.description"));
};

/**
 * Uses XMLHttpRequest so uploads can report byte-level progress while still
 * supporting cancellation.
 */
const uploadWithXhr = (props: {
	url: string;
	method?: "PUT" | "POST" | "PATCH";
	body: XMLHttpRequestBodyInit;
	headers?: Record<string, string>;
	onProgress?: (_loaded: number) => void;
	signal?: AbortSignal;
}): Promise<UploadResult<XMLHttpRequest>> => {
	return new Promise((resolve) => {
		if (props.signal?.aborted) {
			resolve({
				error: uploadError(T()("media.upload.aborted")),
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
				error: uploadError(T()("media.upload.aborted")),
				data: undefined,
			});
		};

		props.signal?.addEventListener("abort", abort, { once: true });
		xhr.open(props.method ?? "PUT", props.url);
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
					xhr.responseText || xhr.statusText || T()("media.upload.failed"),
				),
				data: undefined,
			});
		};
		xhr.onerror = () => {
			cleanup();
			resolve({
				error: uploadError(xhr.statusText || T()("media.upload.failed")),
				data: undefined,
			});
		};
		xhr.onabort = () => {
			cleanup();
			resolve({
				error: uploadError(T()("media.upload.aborted")),
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
		error: lastError ?? uploadError(T()("media.upload.failed")),
		data: undefined,
	};
};

/**
 * Reconciles a local resume pointer with the server before creating a new
 * session, keeping the server as the source of truth.
 */
const getUploadSession = async (
	storageKey: string,
	start: StartUploadSession,
): Promise<ResolvedUploadSession> => {
	const stored = getStoredSession(storageKey);
	if (stored) {
		try {
			const existing = await getUploadSessionReq(stored.sessionId);
			if (existing.data.canResume) {
				return {
					session: existing.data,
					tusUploadUrl:
						existing.data.protocol === "tus" ? stored.tusUploadUrl : undefined,
				};
			}
			localStorage.removeItem(storageKey);
		} catch {
			localStorage.removeItem(storageKey);
		}
	}

	const created = await start();
	if (created.data.protocol !== "http") {
		putStoredSession(storageKey, {
			sessionId: created.data.sessionId,
			key: created.data.key,
			expiresAt: created.data.expiresAt,
		});
	} else {
		localStorage.removeItem(storageKey);
	}
	return { session: created.data };
};

/**
 * Uploads only missing chunks, reconciles hidden ETags with the server, and
 * completes the session after every part is accounted for.
 */
const uploadMultipart = async (
	file: File,
	session: MultipartUploadSession,
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
					error: uploadError(T()("media.upload.aborted")),
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
					error: uploadError(T()("media.upload.parts.url.missing")),
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
		if (
			!reconciled.data.canResume ||
			reconciled.data.protocol !== "multipart-parts"
		) {
			return {
				error: uploadError(T()("media.upload.session.not.resumable")),
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
			error: uploadError(T()("media.upload.parts.not.reconciled")),
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

/** Uploads a direct HTTP request and only then marks its Lucid session complete. */
const uploadHttp = async (
	file: File,
	session: Extract<UploadSessionResponse, { protocol: "http" }>,
	onProgress?: (_progress: number) => void,
	signal?: AbortSignal,
): Promise<UploadResult<string>> => {
	let body: XMLHttpRequestBodyInit = file;
	if (session.request.body.type === "form-data") {
		const form = new FormData();
		for (const [key, value] of Object.entries(session.request.body.fields)) {
			form.append(key, value);
		}
		form.append(session.request.body.fileField, file);
		body = form;
	}

	const uploadRes = await uploadWithXhr({
		url: session.request.url,
		method: session.request.method,
		body,
		headers: {
			...(session.request.body.type === "raw" && file.type
				? { "content-type": file.type }
				: {}),
			...session.request.headers,
		},
		signal,
		onProgress: (loaded) => {
			onProgress?.(
				file.size === 0 ? 99 : Math.min((loaded / file.size) * 100, 99),
			);
		},
	});
	if (uploadRes.error) return uploadRes;

	const complete = await completeUploadSessionReq({
		sessionId: session.sessionId,
	});
	onProgress?.(100);
	return { error: undefined, data: complete.data.key };
};

/** Encodes metadata values using the UTF-8 base64 format required by TUS. */
const encodeTusMetadata = (metadata: Record<string, string>) =>
	Object.entries(metadata)
		.map(([key, value]) => {
			const bytes = new TextEncoder().encode(value);
			let binary = "";
			for (const byte of bytes) binary += String.fromCharCode(byte);
			return `${key} ${btoa(binary)}`;
		})
		.join(",");

/** Creates a provider upload resource from its TUS creation endpoint. */
const createTusUpload = async (
	file: File,
	session: TusUploadSession,
	storageKey: string,
	signal?: AbortSignal,
): Promise<UploadResult<string>> => {
	const metadata = encodeTusMetadata(session.metadata ?? {});
	const response = await fetch(session.endpoint, {
		method: "POST",
		headers: {
			...session.headers,
			"Tus-Resumable": "1.0.0",
			"Upload-Length": String(file.size),
			...(metadata ? { "Upload-Metadata": metadata } : {}),
		},
		signal,
	});
	if (!response.ok) {
		return {
			error: uploadError(
				response.statusText || T()("media.upload.failed"),
				response.status,
			),
			data: undefined,
		};
	}

	const location = response.headers.get("location");
	if (!location) {
		return {
			error: uploadError(T()("media.upload.failed")),
			data: undefined,
		};
	}

	const uploadUrl = new URL(location, session.endpoint).toString();
	putStoredSession(storageKey, {
		sessionId: session.sessionId,
		key: session.key,
		expiresAt: session.expiresAt,
		tusUploadUrl: uploadUrl,
	});
	return { error: undefined, data: uploadUrl };
};

/** Creates or resumes a TUS resource using the standard POST/HEAD/PATCH flow. */
const uploadTus = async (
	file: File,
	session: TusUploadSession,
	storageKey: string,
	existingUploadUrl?: string,
	onProgress?: (_progress: number) => void,
	signal?: AbortSignal,
): Promise<UploadResult<string>> => {
	let uploadUrl = existingUploadUrl;
	if (!uploadUrl) {
		const createRes = await createTusUpload(file, session, storageKey, signal);
		if (createRes.error) return createRes;
		uploadUrl = createRes.data;
	}

	const headers = {
		...session.headers,
		"Tus-Resumable": "1.0.0",
	};
	const head = await fetch(uploadUrl, {
		method: "HEAD",
		headers,
		signal,
	});
	if (!head.ok) {
		return {
			error: uploadError(
				head.statusText || T()("media.upload.failed"),
				head.status,
			),
			data: undefined,
		};
	}

	const offset = Number(head.headers.get("upload-offset") ?? "0");
	if (!Number.isSafeInteger(offset) || offset < 0 || offset > file.size) {
		return {
			error: uploadError(T()("media.upload.failed")),
			data: undefined,
		};
	}

	if (offset < file.size) {
		const uploadRes = await uploadWithXhr({
			url: uploadUrl,
			method: "PATCH",
			body: file.slice(offset),
			headers: {
				...headers,
				"Upload-Offset": String(offset),
				"Content-Type": "application/offset+octet-stream",
			},
			signal,
			onProgress: (loaded) => {
				onProgress?.(
					file.size === 0
						? 99
						: Math.min(((offset + loaded) / file.size) * 100, 99),
				);
			},
		});
		if (uploadRes.error) return uploadRes;
	}

	const complete = await completeUploadSessionReq({
		sessionId: session.sessionId,
	});
	onProgress?.(100);
	return { error: undefined, data: complete.data.key };
};

/**
 * Shared admin upload entry point that hides protocol differences while
 * exposing progress, abort, retry, and resume behavior.
 */
export const uploadMediaFile = async (
	props: UploadMediaFileProps,
): Promise<UploadResult<string>> => {
	try {
		props.onProgress?.(0);
		const storageKey = fingerprint(props.scope, props.file);
		const { session, tusUploadUrl } = await getUploadSession(
			storageKey,
			props.start,
		);

		const key =
			session.protocol === "http"
				? await uploadHttp(props.file, session, props.onProgress, props.signal)
				: session.protocol === "tus"
					? await uploadTus(
							props.file,
							session,
							storageKey,
							tusUploadUrl,
							props.onProgress,
							props.signal,
						)
					: await uploadMultipart(
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
