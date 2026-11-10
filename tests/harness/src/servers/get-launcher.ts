import cloudflareLauncher from "./cloudflare.ts";
import nodeLauncher from "./node.ts";
import type { RuntimeKey, ServerLauncher } from "./types.ts";

const launchers: Record<RuntimeKey, ServerLauncher> = {
	node: nodeLauncher,
	cloudflare: cloudflareLauncher,
};

/** Finds how to build and start servers for a runtime. */
const getLauncher = (runtime: RuntimeKey): ServerLauncher => launchers[runtime];

export default getLauncher;
