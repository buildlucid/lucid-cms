import type { AgentWidgetMatch } from "../../components/AgentWidget/types.js";
import type {
	BrickSlotMatch,
	BrickSlotPlacement,
} from "../../components/BrickSlots/types.js";
import type { DocumentListSlotPlacement } from "../../components/DocumentSlotCell/types.js";
import type {
	FieldSlot,
	FieldSlotMatch,
} from "../../components/FieldSlots/types.js";
import type { AdminRoute } from "./route.js";

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

export type AdminSlot = {
	key: string;
	/** Higher priorities render first or win exclusive slots. Defaults to zero. */
	priority?: number;
	/** Component module. Its directory and subdirectories are scanned for Tailwind classes. */
	component: AdminComponentReference;
	options?: AdminOptions;
} & (
	| { slot: "agent.widget"; match: AgentWidgetMatch }
	| DocumentListSlotPlacement
	| (BrickSlotPlacement & { match?: BrickSlotMatch })
	| { slot: FieldSlot; match?: FieldSlotMatch }
);

export type AdminConfig = {
	slots?: AdminSlot[];
	routes?: AdminRoute[];
	/** Local browser modules, or HTTPS classic scripts loaded with defer. */
	scripts?: AdminModulePath[];
	/** Local stylesheets compiled with the admin CSS, or HTTPS stylesheet URLs. */
	stylesheets?: AdminModulePath[];
};
