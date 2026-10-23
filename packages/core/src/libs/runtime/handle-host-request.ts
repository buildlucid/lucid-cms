import type { LucidHost, LucidInvocation } from "./create-lucid-host.js";
import withResponseCleanup from "./with-response-cleanup.js";

/** Handles a runtime HTTP request in its own host invocation until the response body finishes, ending it immediately if handling throws. */
const handleHostRequest = async (
	host: LucidHost,
	options: Parameters<LucidInvocation["handle"]>[0] & {
		env?: Record<string, unknown>;
	},
): Promise<Response> => {
	const { env, ...request } = options;
	const invocation = host.createInvocation({ env });

	try {
		const response = await invocation.handle(request);
		return withResponseCleanup(response, () => invocation.destroy());
	} catch (error) {
		await invocation.destroy();
		throw error;
	}
};

export default handleHostRequest;
