import type { HostedLucid, LucidBuild } from "@lucidcms/core/types";
import { createRequestHandler } from "./handler.js";
import getForwardedConnInfo from "./services/get-forwarded-conn-info.js";

/** Runs Lucid inside a host's Node server, which `lucid:hosted` creates from the project's build. */
export const createHostedLucid = (build: LucidBuild): HostedLucid =>
	createRequestHandler(build, {
		compiled: build.dev === undefined,
		runtimeContext: {
			getConnectionInfo: getForwardedConnInfo,
			// The host's build doesn't emit Lucid's build module, so nothing can load the project in another thread.
			buildModule: null,
		},
	});
