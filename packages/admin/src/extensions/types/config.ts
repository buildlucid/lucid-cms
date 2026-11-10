import type { AdminRoute } from "./route.js";
import type { AdminSlot } from "./slot.js";

/** Project-relative path, exported package subpath, absolute path or file URL. */
export type AdminModulePath = string | URL;
/** A default-exported module, or a named export from a component module. */
export type AdminComponentReference =
	| AdminModulePath
	| { module: AdminModulePath; export: string };

export type AdminOptionValue =
	| string
	| number
	| boolean
	| null
	| readonly AdminOptionValue[]
	| { readonly [key: string]: AdminOptionValue };

/** JSON passed to a component as `options`. It ships in the public admin bundle, so never include secrets. */
export type AdminOptions = {
	readonly [key: string]: AdminOptionValue | undefined;
};

export type AdminConfig = {
	agentHomescreen?: boolean;
	slots?: AdminSlot[];
	routes?: AdminRoute[];
	/** Local browser modules, or HTTPS classic scripts loaded with defer. */
	scripts?: AdminModulePath[];
	/** Local stylesheets compiled with the admin CSS, or HTTPS stylesheet URLs. */
	stylesheets?: AdminModulePath[];
};
