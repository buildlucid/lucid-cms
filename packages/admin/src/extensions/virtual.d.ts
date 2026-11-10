/** Compiled route and slot registrations emitted by adminExtensionsPlugin. */
declare module "virtual:lucid-admin" {
	import type {
		AdminOptions,
		AdminRoute,
		AdminSlot,
		AgentTranscriptRowSlotProps,
		AgentWidgetProps,
		BrickSlot,
		BrickSlotProps,
		CaptchaSlot,
		CaptchaWidgetProps,
		DocumentListSlot,
		DocumentListSlotProps,
		DocumentSidebarSlot,
		DocumentSidebarSlotProps,
		FieldSlot,
		FieldSlotProps,
		HomeWidgetProps,
		HomeWidgetSlot,
		MaintenanceSlot,
		MaintenanceSlotProps,
	} from "@lucidcms/admin/types";
	import type { Component } from "solid-js";

	/** Compilation replaces module paths with lazy components, which `preload` loads ahead, and supplies a default match. */
	type SlotRegistration<
		Slot extends AdminSlot,
		Component,
	> = Slot extends AdminSlot
		? Omit<Slot, "component" | "match"> & {
				component: Component & { preload: () => Promise<unknown> };
				match: NonNullable<Slot["match"]>;
			}
		: never;

	/** Compilation fills in the default shell and access. */
	type RouteRegistration<Route extends AdminRoute> = Route extends AdminRoute
		? Omit<Route, "component"> & {
				shell: NonNullable<Route["shell"]>;
				access: NonNullable<Route["access"]>;
				component: Component<{ readonly options: AdminOptions | undefined }>;
			}
		: never;

	export const routes: Array<RouteRegistration<AdminRoute>>;

	/** Each agent slot has its own component props, so entries narrow by `slot`. */
	export const agentSlots: Array<
		| SlotRegistration<
				Extract<AdminSlot, { slot: AgentWidgetProps["slot"] }>,
				Component<AgentWidgetProps<AdminOptions | undefined>>
		  >
		| SlotRegistration<
				Extract<AdminSlot, { slot: AgentTranscriptRowSlotProps["slot"] }>,
				Component<AgentTranscriptRowSlotProps<AdminOptions | undefined>>
		  >
	>;

	export const brickSlots: Array<
		SlotRegistration<
			Extract<AdminSlot, { slot: BrickSlot }>,
			Component<BrickSlotProps<AdminOptions | undefined>>
		>
	>;

	export const homeSlots: Array<
		Omit<Extract<AdminSlot, { slot: HomeWidgetSlot }>, "component"> & {
			component: Component<HomeWidgetProps<AdminOptions | undefined>>;
		}
	>;

	export const documentListSlots: Array<
		SlotRegistration<
			Extract<AdminSlot, { slot: DocumentListSlot }>,
			Component<DocumentListSlotProps<AdminOptions | undefined>>
		>
	>;

	export const documentSidebarSlots: Array<
		SlotRegistration<
			Extract<AdminSlot, { slot: DocumentSidebarSlot }>,
			Component<DocumentSidebarSlotProps<AdminOptions | undefined>>
		>
	>;

	export const captchaSlots: Array<
		SlotRegistration<
			Extract<AdminSlot, { slot: CaptchaSlot }>,
			Component<CaptchaWidgetProps<AdminOptions | undefined>>
		>
	>;

	export const fieldSlots: Array<
		SlotRegistration<
			Extract<AdminSlot, { slot: FieldSlot }>,
			Component<FieldSlotProps<AdminOptions | undefined>>
		>
	>;

	export const maintenanceSlots: Array<
		SlotRegistration<
			Extract<AdminSlot, { slot: MaintenanceSlot }>,
			Component<MaintenanceSlotProps<AdminOptions | undefined>>
		>
	>;
}

/** Side-effect imports emitted by adminExtensionsPlugin for local browser scripts. */
declare module "virtual:lucid-admin-assets" {}

/** Public config emitted by adminClientConfigPlugin for useAdminConfig. */
declare module "virtual:lucid-admin-config" {
	import type { AdminClientConfig } from "@lucidcms/admin/types";

	const config: AdminClientConfig;
	export default config;
}
