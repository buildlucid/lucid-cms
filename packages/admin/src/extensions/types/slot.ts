import type { PermissionRequirement } from "@lucidcms/types";
import type { Component } from "solid-js";
import type {
	AgentSlotPlacement,
	AgentTranscriptRowSlotProps,
	AgentWidgetProps,
} from "../../components/AgentWidget/types.js";
import type {
	BrickSlot,
	BrickSlotMatch,
	BrickSlotPlacement,
	BrickSlotProps,
} from "../../components/BrickSlots/types.js";
import type {
	CaptchaSlotPlacement,
	CaptchaWidgetProps,
} from "../../components/CaptchaWidget/types.js";
import type {
	DocumentSidebarSlotPlacement,
	DocumentSidebarSlotProps,
} from "../../components/DocumentSidebarSlots/types.js";
import type {
	DocumentListSlot,
	DocumentListSlotPlacement,
	DocumentListSlotProps,
} from "../../components/DocumentSlotCell/types.js";
import type {
	FieldSlot,
	FieldSlotMatch,
	FieldSlotProps,
} from "../../components/FieldSlots/types.js";
import type {
	HomeWidgetPlacement,
	HomeWidgetProps,
} from "../../components/HomeWidgets/types.js";
import type {
	MaintenanceSlotPlacement,
	MaintenanceSlotProps,
} from "../../components/MaintenanceSlots/types.js";
import type { ValueFieldType } from "../editor/types.js";
import type { AdminComponentReference, AdminOptions } from "./config.js";

/** What every slot registration takes, whichever slot it fills. */
type AdminSlotBase = {
	key: string;
	/**
	 * Higher priorities render first or win exclusive slots. Defaults to zero.
	 * At equal priority, an exclusive slot goes to the more specific `match`.
	 */
	priority?: number;
	/** Component module. Its directory and subdirectories are scanned for Tailwind classes. */
	component: AdminComponentReference;
	options?: AdminOptions;
};

/** Slots shown to signed-in users can be limited to those with access. */
type AdminSlotAccess = {
	/** Leaves the slot out for users without access. */
	permission?: PermissionRequirement;
};

export type AdminSlot = AdminSlotBase &
	(
		| (AdminSlotAccess &
				(
					| AgentSlotPlacement
					| HomeWidgetPlacement
					| DocumentListSlotPlacement
					| DocumentSidebarSlotPlacement
					| (BrickSlotPlacement & { match?: BrickSlotMatch })
					| { slot: FieldSlot; match?: FieldSlotMatch }
					| MaintenanceSlotPlacement
				))
		//* captcha widgets render on public forms, where there is no user to check
		| CaptchaSlotPlacement
	);

/** The parts of a slot or route definition that decide its component's props. */
type ComponentConfig = { options?: AdminOptions };

/** The `options` a definition passes to its component. */
export type SlotOptions<TConfig extends ComponentConfig> = TConfig extends {
	options: infer TOptions extends AdminOptions;
}
	? TOptions
	: undefined;

type MatchedFieldType<TConfig> = TConfig extends {
	match: { fieldType: infer TType extends ValueFieldType };
}
	? TType
	: ValueFieldType;

/** Each slot's component props. A slot missing here fails `SlotProps`. */
type SlotPropsMap<
	TOptions extends AdminOptions | undefined,
	TFieldType extends ValueFieldType,
> = {
	"agent.widget": AgentWidgetProps<TOptions>;
	"agent.transcriptRow": AgentTranscriptRowSlotProps<TOptions>;
	"home.widget": HomeWidgetProps<TOptions>;
	"document.sidebar": DocumentSidebarSlotProps<TOptions>;
	"captcha.widget": CaptchaWidgetProps<TOptions>;
	"maintenance.action": MaintenanceSlotProps<TOptions>;
} & {
	[Slot in BrickSlot]: BrickSlotProps<TOptions> & { readonly slot: Slot };
} & {
	[Slot in FieldSlot]: FieldSlotProps<TOptions, TFieldType> & {
		readonly slot: Slot;
	};
} & {
	[Slot in DocumentListSlot]: Extract<
		DocumentListSlotProps<TOptions>,
		{ slot: Slot }
	>;
};

/** The props a slot definition's component receives. */
export type SlotProps<
	TConfig extends ComponentConfig & { slot: AdminSlot["slot"] },
> = SlotPropsMap<
	SlotOptions<TConfig>,
	MatchedFieldType<TConfig>
>[TConfig["slot"]];

/**
 * Types a slot component from its definition, so `options`, the slot's props and a matched
 * field type follow the registration.
 *
 * @example
 * ```tsx
 * import type { SlotComponent } from "@lucidcms/admin/types";
 * import type slugPreview from "./config.js";
 *
 * const SlugPreview: SlotComponent<typeof slugPreview> = (props) => (
 * 	<p>{props.field.value}</p>
 * );
 * ```
 */
export type SlotComponent<
	TConfig extends ComponentConfig & { slot: AdminSlot["slot"] },
> = Component<SlotProps<TConfig>>;
