// TODO: integrate with hono logger and config options, this is just a placeholder so we have somthing that works with cloudflare workers

/**
 * Get the current active pino logger instance
 */
const getLogger = () => ({
	error: (data: Record<string, unknown>, message: string) => {
		console.error(JSON.stringify(data), message);
	},
	warn: (data: Record<string, unknown>, message: string) => {
		console.warn(JSON.stringify(data), message);
	},
	info: (data: Record<string, unknown>, message: string) => {
		console.info(JSON.stringify(data), message);
	},
	debug: (data: Record<string, unknown>, message: string) => {
		console.debug(JSON.stringify(data), message);
	},
});

export default getLogger;
