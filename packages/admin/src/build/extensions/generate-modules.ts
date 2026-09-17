import type { HtmlTagDescriptor } from "vite";
import { brickSlotKeys } from "../../components/BrickSlots/constants.js";
import { fieldSlotKeys } from "../../components/FieldSlots/constants.js";
import type {
	AdminConfig,
	AdminModulePath,
} from "../../extensions/types/config.js";

type ResolveModule = (
	reference: AdminModulePath,
	label: string,
) => Promise<string>;

/** Serializes metadata while leaving the lazy browser import as executable code. */
const componentEntry = (metadata: object, moduleId: string) =>
	`{ ...${JSON.stringify(metadata)}, component: lazy(() => import(${JSON.stringify(moduleId)})) }`;

/** Generates the registry without importing any user components on the server. */
export const generateRegistry = async (
	admin: AdminConfig,
	resolve: ResolveModule,
) => {
	const routes = await Promise.all(
		(admin.routes ?? []).map(async ({ component, key, path, navigation }) =>
			componentEntry(
				{ key, path: `/lucid/e/${path}`, navigation },
				await resolve(component, `route "${key}"`),
			),
		),
	);
	const slots = await Promise.all(
		(admin.slots ?? []).map(async ({ component, key, slot, match = {} }) => ({
			slot,
			entry: componentEntry(
				{ key, slot, match },
				await resolve(component, `slot "${key}"`),
			),
		})),
	);
	const brickSlots = slots.filter(
		({ slot }) =>
			slot === brickSlotKeys.beforeFields || slot === brickSlotKeys.afterFields,
	);
	const fieldSlots = slots.filter(
		({ slot }) => slot === fieldSlotKeys.before || slot === fieldSlotKeys.after,
	);
	return [
		'import { lazy } from "solid-js";',
		`export const routes = [${routes.join(",\n")}];`,
		`export const brickSlots = [${brickSlots.map(({ entry }) => entry).join(",\n")}];`,
		`export const fieldSlots = [${fieldSlots.map(({ entry }) => entry).join(",\n")}];`,
	].join("\n");
};

/** Local CSS joins the admin stylesheet; scripts are modules and HTTPS assets are HTML tags. */
export const generateAssets = async (
	admin: AdminConfig,
	resolve: ResolveModule,
) => {
	const imports: string[] = [];
	const stylesheets: string[] = [];
	const tags: HtmlTagDescriptor[] = [];
	for (const kind of ["stylesheets", "scripts"] as const) {
		for (const reference of admin[kind] ?? []) {
			const source = String(reference);
			if (/^https:\/\//i.test(source)) {
				tags.push(
					kind === "scripts"
						? {
								tag: "script",
								attrs: { src: source, defer: true },
								injectTo: "head",
							}
						: {
								tag: "link",
								attrs: { rel: "stylesheet", href: source },
								injectTo: "head",
							},
				);
			} else {
				const id = await resolve(reference, kind);
				if (kind === "stylesheets") stylesheets.push(id);
				else imports.push(`import ${JSON.stringify(id)};`);
			}
		}
	}
	return { code: imports.join("\n"), stylesheets, tags };
};
