import { createAdminDevServer } from "@lucidcms/admin/build";
import { writeBufferedLog } from "../../logger/index.js";
import {
	createAdminShellResponse,
	isAdminPath,
	shouldServeAdminShell,
} from "../../runtime/admin.js";

type CliAdmin = Pick<
	Awaited<ReturnType<typeof createAdminDevServer>>,
	"middleware" | "close"
> & {
	handleResponse: (request: Request, response: Response) => Promise<Response>;
};

/** Adds admin development middleware to an adapter-owned HTTP server. */
const createCliAdmin = async (
	options: Parameters<typeof createAdminDevServer>[0],
): Promise<CliAdmin> => {
	const admin = await createAdminDevServer({
		...options,
		loggerConsole: {
			...console,
			log: (...args: unknown[]) => writeBufferedLog(() => console.log(...args)),
			warn: (...args: unknown[]) =>
				writeBufferedLog(() => console.warn(...args)),
			error: (...args: unknown[]) =>
				writeBufferedLog(() => console.error(...args)),
		},
	});

	const middleware: typeof admin.middleware = (request, response, next) => {
		const pathname = new URL(request.url ?? "/", "http://lucid.local").pathname;
		if (!isAdminPath(pathname)) return next();

		admin.middleware(request, response, (error: unknown) => {
			if (error) {
				response.statusCode = 500;
				response.end(
					error instanceof Error
						? error.message
						: "Admin development request failed.",
				);
				return;
			}
			next();
		});
	};

	return {
		middleware,
		/** Preserves application responses and renders HTML only for missing admin routes. */
		handleResponse: async (request: Request, response: Response) => {
			if (
				response.status !== 404 ||
				!shouldServeAdminShell(new URL(request.url).pathname, request.method)
			)
				return response;
			await response.body?.cancel();
			return createAdminShellResponse(
				await admin.renderHtml(request.url),
				request.method,
			);
		},
		close: admin.close,
	};
};

export default createCliAdmin;
