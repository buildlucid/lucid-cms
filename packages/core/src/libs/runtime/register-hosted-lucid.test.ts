import { expect, test, vi } from "vitest";
import destroyHostedLucids from "./destroy-hosted-lucids.js";
import registerHostedLucid from "./register-hosted-lucid.js";
import type { HostedLucid } from "./types.js";

const createHostedLucid = (): HostedLucid => ({
	handle: async () => new Response(),
	createInvocation: vi.fn(),
	destroy: vi.fn(async () => {}),
});

test("destroys the instance a reload replaces and a project's instances when its server closes", async () => {
	const ssr = { configPath: "/project/lucid.config.ts", environment: "ssr" };
	const first = createHostedLucid();
	const reloaded = createHostedLucid();
	const prerender = createHostedLucid();
	const otherProject = createHostedLucid();

	registerHostedLucid(ssr, first);
	registerHostedLucid(ssr, reloaded);
	registerHostedLucid({ ...ssr, environment: "prerender" }, prerender);
	registerHostedLucid(
		{ configPath: "/other/lucid.config.ts", environment: "ssr" },
		otherProject,
	);
	expect(first.destroy).toHaveBeenCalledOnce();
	expect(reloaded.destroy).not.toHaveBeenCalled();

	await destroyHostedLucids(ssr.configPath);
	expect(reloaded.destroy).toHaveBeenCalledOnce();
	expect(prerender.destroy).toHaveBeenCalledOnce();
	expect(otherProject.destroy).not.toHaveBeenCalled();
});
