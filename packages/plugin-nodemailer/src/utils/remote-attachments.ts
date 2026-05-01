import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import type { EmailAttachment, ServiceResponse } from "@lucidcms/core/types";
import ipaddr from "ipaddr.js";
import T from "../translations/index.js";

const DEFAULT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;

type ResolvedAddress = {
	address: string;
	family: 4 | 6;
};

type NodemailerAttachment = {
	content: Buffer;
	filename: string;
	contentType?: string;
	contentDisposition: "attachment" | "inline";
	cid?: string;
};

type RemoteAttachmentsOptions = {
	maxBytes?: number;
	timeoutMs?: number;
};

type RemoteAttachmentFetchResult = {
	content: Buffer;
	finalUrl: URL;
};

const createPinnedLookup = (resolvedAddress: ResolvedAddress) =>
	((_hostname, optionsOrCallback, callback) => {
		const resolver =
			typeof optionsOrCallback === "function" ? optionsOrCallback : callback;

		if (
			typeof optionsOrCallback === "object" &&
			optionsOrCallback !== null &&
			optionsOrCallback.all
		) {
			resolver?.(null, [resolvedAddress]);
			return;
		}

		resolver?.(null, resolvedAddress.address, resolvedAddress.family);
	}) as LookupFunction;

const normalizeHostname = (hostname: string) =>
	hostname.replace(/^\[|\]$/g, "").toLowerCase();

/**
 * Returns true only for globally routable IPv4/IPv6 addresses.
 *
 * Nodemailer fetches remote attachments from the application runtime. This
 * check blocks SSRF targets such as loopback, private networks, link-local
 * metadata services, multicast, reserved/documentation ranges, and IPv4-mapped
 * IPv6 forms of those addresses.
 */
export const isPublicIpAddress = (address: string) => {
	if (!ipaddr.isValid(address)) return false;

	return ipaddr.process(address).range() === "unicast";
};

/**
 * Resolves an attachment URL and returns an error value if any DNS answer points
 * at a non-public address.
 *
 * The returned address is later pinned into the HTTP request's lookup callback
 * so a hostname cannot resolve safely during validation and then resolve to an
 * internal address during the actual fetch.
 */
const resolvePublicAddress = async (
	url: URL,
): Promise<Awaited<ServiceResponse<ResolvedAddress>>> => {
	const hostname = normalizeHostname(url.hostname);
	const addresses = await lookup(hostname, {
		all: true,
		verbatim: true,
	}).catch(() => null);

	if (!addresses || addresses.length === 0) {
		return {
			error: {
				type: "plugin",
				name: T("email_attachment_error_name"),
				message: T("email_attachment_url_resolve_failed"),
				status: 400,
			},
			data: undefined,
		};
	}

	for (const address of addresses) {
		if (!isPublicIpAddress(address.address)) {
			return {
				error: {
					type: "plugin",
					name: T("email_attachment_error_name"),
					message: T("email_attachment_url_blocked_address"),
					status: 400,
				},
				data: undefined,
			};
		}
	}

	return {
		error: undefined,
		data: addresses[0] as ResolvedAddress,
	};
};

const parseAttachmentUrl = (url: string): Awaited<ServiceResponse<URL>> => {
	try {
		return {
			error: undefined,
			data: new URL(url),
		};
	} catch {
		return {
			error: {
				type: "plugin",
				name: T("email_attachment_error_name"),
				message: T("email_attachment_url_invalid"),
				status: 400,
			},
			data: undefined,
		};
	}
};

/**
 * Fetches or preflights a remote URL attachment with the controls Nodemailer
 * does not apply for us: HTTP/S only, public DNS resolution, redirect
 * revalidation, request timeout, and a hard response size limit.
 *
 * The result is returned as a service response so attachment policy failures can
 * flow through the email adapter without throwing generic errors.
 */
const fetchRemoteAttachment = async (
	url: URL,
	redirects = 0,
	options: RemoteAttachmentsOptions = {},
): Promise<Awaited<ServiceResponse<RemoteAttachmentFetchResult>>> => {
	if (!["http:", "https:"].includes(url.protocol)) {
		return {
			error: {
				type: "plugin",
				name: T("email_attachment_error_name"),
				message: T("email_attachment_url_must_use_http"),
				status: 400,
			},
			data: undefined,
		};
	}

	if (redirects > MAX_REDIRECTS) {
		return {
			error: {
				type: "plugin",
				name: T("email_attachment_error_name"),
				message: T("email_attachment_url_too_many_redirects"),
				status: 400,
			},
			data: undefined,
		};
	}

	const resolvedAddressRes = await resolvePublicAddress(url);
	if (resolvedAddressRes.error) return resolvedAddressRes;

	const resolvedAddress = resolvedAddressRes.data;
	const client = url.protocol === "https:" ? https : http;
	const maxBytes =
		typeof options.maxBytes === "number" &&
		Number.isFinite(options.maxBytes) &&
		options.maxBytes > 0
			? options.maxBytes
			: DEFAULT_MAX_ATTACHMENT_BYTES;
	const timeoutMs =
		typeof options.timeoutMs === "number" &&
		Number.isFinite(options.timeoutMs) &&
		options.timeoutMs > 0
			? options.timeoutMs
			: DEFAULT_REQUEST_TIMEOUT_MS;

	return new Promise<Awaited<ServiceResponse<RemoteAttachmentFetchResult>>>(
		(resolve) => {
			let settled = false;

			try {
				const request = client.request(
					url,
					{
						lookup: createPinnedLookup(resolvedAddress),
						timeout: timeoutMs,
					},
					(response) => {
						const statusCode = response.statusCode ?? 0;

						if (
							statusCode >= 300 &&
							statusCode < 400 &&
							response.headers.location
						) {
							response.resume();

							let redirectUrl: URL;
							try {
								redirectUrl = new URL(response.headers.location, url);
							} catch {
								if (settled) return;
								settled = true;
								resolve({
									error: {
										type: "plugin",
										name: T("email_attachment_error_name"),
										message: T("email_attachment_url_redirect_invalid"),
										status: 400,
									},
									data: undefined,
								});
								return;
							}

							const redirectUrlRes = parseAttachmentUrl(redirectUrl.toString());
							if (redirectUrlRes.error) {
								if (settled) return;
								settled = true;
								resolve(redirectUrlRes);
								return;
							}

							fetchRemoteAttachment(redirectUrlRes.data, redirects + 1, {
								maxBytes,
								timeoutMs,
							}).then((redirectRes) => {
								if (redirectRes.error) {
									if (settled) return;
									settled = true;
									resolve(redirectRes);
									return;
								}

								if (settled) return;
								settled = true;
								resolve({
									error: undefined,
									data: redirectRes.data,
								});
							});
							return;
						}

						if (statusCode < 200 || statusCode >= 300) {
							response.resume();
							if (settled) return;
							settled = true;
							resolve({
								error: {
									type: "plugin",
									name: T("email_attachment_error_name"),
									message: T("email_attachment_url_unsuccessful_response"),
									status: 400,
								},
								data: undefined,
							});
							return;
						}

						const contentLength = Number(response.headers["content-length"]);
						if (Number.isFinite(contentLength) && contentLength > maxBytes) {
							response.resume();
							if (settled) return;
							settled = true;
							resolve({
								error: {
									type: "plugin",
									name: T("email_attachment_error_name"),
									message: T("email_attachment_too_large"),
									status: 400,
								},
								data: undefined,
							});
							return;
						}

						const chunks: Buffer[] = [];
						let receivedBytes = 0;

						response.on("data", (chunk: Buffer) => {
							receivedBytes += chunk.length;

							if (receivedBytes > maxBytes) {
								if (settled) return;
								settled = true;
								resolve({
									error: {
										type: "plugin",
										name: T("email_attachment_error_name"),
										message: T("email_attachment_too_large"),
										status: 400,
									},
									data: undefined,
								});
								response.destroy();
								request.destroy();
								return;
							}

							chunks.push(chunk);
						});
						response.on("end", () => {
							if (settled) return;
							settled = true;
							resolve({
								error: undefined,
								data: {
									content: Buffer.concat(chunks),
									finalUrl: url,
								},
							});
						});
						response.on("error", () => {
							if (settled) return;
							settled = true;
							resolve({
								error: {
									type: "plugin",
									name: T("email_attachment_error_name"),
									message: T("email_attachment_url_fetch_failed"),
									status: 400,
								},
								data: undefined,
							});
						});
					},
				);

				request.on("timeout", () => {
					if (settled) return;
					settled = true;
					resolve({
						error: {
							type: "plugin",
							name: T("email_attachment_error_name"),
							message: T("email_attachment_url_timeout"),
							status: 400,
						},
						data: undefined,
					});
					request.destroy();
				});
				request.on("error", () => {
					if (settled) return;
					settled = true;
					resolve({
						error: {
							type: "plugin",
							name: T("email_attachment_error_name"),
							message: T("email_attachment_url_fetch_failed"),
							status: 400,
						},
						data: undefined,
					});
				});
				request.end();
			} catch {
				if (settled) return;
				settled = true;
				resolve({
					error: {
						type: "plugin",
						name: T("email_attachment_error_name"),
						message: T("email_attachment_url_fetch_failed"),
						status: 500,
					},
					data: undefined,
				});
			}
		},
	);
};

/**
 * Converts a stored Lucid attachment into the Nodemailer shape after fetching
 * the remote file through the guarded attachment fetcher.
 */
const resolveNodemailerAttachment = async (
	attachment: EmailAttachment,
	options?: RemoteAttachmentsOptions,
): Promise<Awaited<ServiceResponse<NodemailerAttachment>>> => {
	const urlRes = parseAttachmentUrl(attachment.url);
	if (urlRes.error) return urlRes;

	const contentRes = await fetchRemoteAttachment(urlRes.data, 0, options);
	if (contentRes.error) return contentRes;

	const attachmentBase = {
		filename: attachment.filename,
		contentType: attachment.contentType,
		contentDisposition: attachment.disposition ?? "attachment",
		cid: attachment.disposition === "inline" ? attachment.contentId : undefined,
	};

	return {
		error: undefined,
		data: {
			content: contentRes.data.content,
			...attachmentBase,
		},
	};
};

/**
 * Converts Lucid's stored URL attachment config into Nodemailer attachment
 * objects.
 *
 * This passes `content` so Nodemailer does not make its own outbound URL
 * request. Lucid owns remote fetching here so it can apply SSRF checks,
 * redirect revalidation, timeout handling, and a maximum response size.
 */
export const resolveNodemailerAttachments = async (
	attachments?: EmailAttachment[],
	options?: RemoteAttachmentsOptions,
): Promise<Awaited<ServiceResponse<NodemailerAttachment[] | undefined>>> => {
	if (!attachments || attachments.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const resolvedAttachments: NodemailerAttachment[] = [];

	for (const attachment of attachments) {
		const attachmentRes = await resolveNodemailerAttachment(
			attachment,
			options,
		);
		if (attachmentRes.error) return attachmentRes;

		resolvedAttachments.push(attachmentRes.data);
	}

	return {
		error: undefined,
		data: resolvedAttachments,
	};
};
