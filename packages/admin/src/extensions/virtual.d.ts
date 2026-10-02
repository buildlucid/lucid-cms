/** Compiled route and slot registrations emitted by adminExtensionsPlugin. */
declare module "virtual:lucid-admin" {
	import type {
		AdminOptions,
		AdminRoute,
		AdminSlot,
		AgentTranscriptRowSlotComponent,
		AgentTranscriptRowSlotProps,
		AgentWidgetComponent,
		AgentWidgetProps,
		BrickSlot,
		BrickSlotComponent,
		DashboardWidgetComponent,
		DashboardWidgetSlot,
		DocumentListSlot,
		DocumentListSlotComponent,
		FieldSlot,
		FieldSlotComponent,
		RouteComponent,
	} from "@lucidcms/admin/types";

	/** Compilation replaces module paths with components and supplies a default match. */
	type SlotRegistration<
		Slot extends AdminSlot,
		Component,
	> = Slot extends AdminSlot
		? Omit<Slot, "component" | "match"> & {
				component: Component;
				match: NonNullable<Slot["match"]>;
			}
		: never;

	/** Compilation fills in the default shell and access. */
	type RouteRegistration<Route extends AdminRoute> = Route extends AdminRoute
		? Omit<Route, "component"> & {
				shell: NonNullable<Route["shell"]>;
				access: NonNullable<Route["access"]>;
				component: RouteComponent<AdminOptions | undefined>;
			}
		: never;

	export const routes: Array<RouteRegistration<AdminRoute>>;

	/** Each agent slot has its own component props, so entries narrow by `slot`. */
	export const agentSlots: Array<
		| SlotRegistration<
				Extract<AdminSlot, { slot: AgentWidgetProps["slot"] }>,
				AgentWidgetComponent<AdminOptions | undefined>
		  >
		| SlotRegistration<
				Extract<AdminSlot, { slot: AgentTranscriptRowSlotProps["slot"] }>,
				AgentTranscriptRowSlotComponent<AdminOptions | undefined>
		  >
	>;

	export const brickSlots: Array<
		SlotRegistration<
			Extract<AdminSlot, { slot: BrickSlot }>,
			BrickSlotComponent<AdminOptions | undefined>
		>
	>;

	export const dashboardSlots: Array<
		Omit<Extract<AdminSlot, { slot: DashboardWidgetSlot }>, "component"> & {
			component: DashboardWidgetComponent<AdminOptions | undefined>;
		}
	>;

	export const documentListSlots: Array<
		SlotRegistration<
			Extract<AdminSlot, { slot: DocumentListSlot }>,
			DocumentListSlotComponent<AdminOptions | undefined>
		>
	>;

	export const fieldSlots: Array<
		SlotRegistration<
			Extract<AdminSlot, { slot: FieldSlot }>,
			FieldSlotComponent<AdminOptions | undefined>
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
