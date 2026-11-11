import type { LucidHonoContext } from "../../../types/hono.js";
import { formatETag } from "../../../utils/http/etag.js";

const SANDBOX_CONTENT_SECURITY_POLICY =
	"sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:";

/**
 * Identifies types safe to display without sandboxing. Sandboxes active content such as HTML and
 * SVG; excludes PDFs because browser viewers isolate scripts and reject sandboxing.
 */
const isPassiveType = (contentType: string | undefined) => {
	const type = contentType?.split(";", 1)[0]?.trim().toLowerCase();
	if (!type) return false;
	if (type === "image/svg+xml") return false;
	return (
		/^(image|video|audio|font)\//.test(type) ||
		type === "application/pdf" ||
		type === "text/plain"
	);
};

export const applyStreamingHeaders = (
	c: LucidHonoContext,
	opts: {
		contentLength?: number;
		contentType?: string;
		key?: string;
		etag?: string;
	},
) => {
	c.header("Accept-Ranges", "bytes");
	c.header("X-Content-Type-Options", "nosniff");
	if (!isPassiveType(opts.contentType)) {
		c.header("Content-Security-Policy", SANDBOX_CONTENT_SECURITY_POLICY);
	}
	if (opts.key)
		c.header("Content-Disposition", `inline; filename="${opts.key}"`);
	if (opts.contentLength !== undefined)
		c.header("Content-Length", String(opts.contentLength));
	if (opts.contentType) c.header("Content-Type", opts.contentType);
	if (opts.etag) c.header("ETag", formatETag(opts.etag));
};

/** Sets cache policy and, for partial responses, status and content range. */
export const applyRangeHeaders = (
	c: LucidHonoContext,
	info: {
		isPartial?: boolean;
		range?: { start: number; end: number };
		totalSize?: number;
		cacheControl: string;
	},
) => {
	c.header("Cache-Control", info.cacheControl);
	if (info.isPartial && info.range && info.totalSize !== undefined) {
		c.status(206);
		c.header(
			"Content-Range",
			`bytes ${info.range.start}-${info.range.end}/${info.totalSize}`,
		);
	}
};

export const parseRangeHeader = (header: string | undefined) => {
	if (!header) return undefined;
	const match = header.match(/bytes=(\d+)-(\d*)/);
	if (match?.[1]) {
		const start = Number.parseInt(match[1], 10);
		const end = match[2] ? Number.parseInt(match[2], 10) : undefined;
		return { start, end };
	}
	return undefined;
};
