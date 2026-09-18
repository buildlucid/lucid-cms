/** Compiled route and slot registrations emitted by adminExtensionsPlugin. */
declare module "virtual:lucid-admin" {
	import type {
		AdminRoute,
		AdminRouteNavigation,
		AdminSlot,
		BrickSlot,
		BrickSlotComponent,
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

	export const routes: Array<{
		key: string;
		path: string;
		layout: NonNullable<AdminRoute["layout"]>;
		access: NonNullable<AdminRoute["access"]>;
		component: RouteComponent;
		navigation?: AdminRouteNavigation;
	}>;
	export const brickSlots: Array<
		SlotRegistration<
			Extract<AdminSlot, { slot: BrickSlot }>,
			BrickSlotComponent
		>
	>;
	export const fieldSlots: Array<
		SlotRegistration<
			Extract<AdminSlot, { slot: FieldSlot }>,
			FieldSlotComponent
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
