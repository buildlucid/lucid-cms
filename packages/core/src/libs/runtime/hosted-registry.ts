import type { HostedLucid } from "./types.js";

const registrySymbol = Symbol.for("@lucidcms/core:hosted");

type HostedRegistry = Map<string, Map<string, HostedLucid>>;

const globalState = globalThis as typeof globalThis & {
	[registrySymbol]?: HostedRegistry;
};

globalState[registrySymbol] ??= new Map();

/** Hosted instances keyed by config path and server environment on `globalThis`, shared by Node dev module copies and Lucid's Vite plugin. */
const hostedRegistry = globalState[registrySymbol];

export default hostedRegistry;
