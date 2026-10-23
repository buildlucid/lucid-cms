import { logger } from "@lucidcms/core";
import { KilnRenderError } from "@lucidkiln/core";
import { PLUGIN_KEY } from "../constants.js";
import { SiteNotFoundError, SiteRedirectError } from "../errors.js";
import type { SiteData } from "../types.js";
import createDevErrorPage from "./create-dev-error-page.js";

type StreamProps = {
	path: string;
	development: boolean;
	data: SiteData;
	/** The request's signal: a failure after the client went away isn't worth logging. */
	signal: AbortSignal;
};

const reportFailure = (error: unknown, props: StreamProps) => {
	logger.error({
		scope: PLUGIN_KEY,
		event: "plugin-site.render.failed",
		message: `Failed to render ${props.path} after the response started`,
		error,
	});
	if (!props.development) return;

	const cause = error instanceof KilnRenderError ? error.cause : error;
	const call =
		cause instanceof SiteNotFoundError
			? "notFound()"
			: cause instanceof SiteRedirectError
				? "redirect()"
				: null;
	if (call === null) return;
	logger.warn({
		scope: PLUGIN_KEY,
		event: "plugin-site.render.late-status",
		message: `${props.path} called ${call} after its layout's {% flush %} sent the response, so the status can't change. Call it before the flush.`,
	});
};

/**
 * Kiln rejects before the response starts only for early failures; a later one errors the stream, which nobody would see.
 * Logs it and, in development, appends the error page so the developer sees it instead of a cut-off page.
 */
const guardRenderStream = (
	stream: ReadableStream<Uint8Array>,
	props: StreamProps,
): ReadableStream<Uint8Array> => {
	const reader = stream.getReader();
	let cancelled = false;

	return new ReadableStream<Uint8Array>({
		// Reads ahead rather than on demand: erroring a stream drops its queued chunks, so a waiting read is what keeps the part sent before a failure.
		async start(controller) {
			try {
				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					controller.enqueue(value);
				}
				if (!cancelled) controller.close();
			} catch (error) {
				// The client leaving aborts the render, which isn't a failure worth reporting.
				if (!props.signal.aborted) reportFailure(error, props);
				if (props.signal.aborted || !props.development) {
					controller.error(error);
					return;
				}
				controller.enqueue(
					new TextEncoder().encode(
						createDevErrorPage({ error, data: props.data }),
					),
				);
				controller.close();
			}
		},
		cancel: (reason) => {
			cancelled = true;
			return reader.cancel(reason);
		},
	});
};

export default guardRenderStream;
