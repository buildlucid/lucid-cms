import {
	children,
	createMemo,
	For,
	type ParentComponent,
	Show,
} from "solid-js";
import { fieldSlots } from "virtual:lucid-admin";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import { FieldMarkersContext } from "@/components/Field/FieldContext";
import type { FieldLabelMarkersProps } from "@/components/FieldLabelMarkers/FieldLabelMarkers";
import { matchSlots } from "@/extensions/match-slots";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import { useFieldRenderState } from "@/hooks/useFieldRenderState/useFieldRenderState";
import { useFieldScope } from "@/hooks/useFieldScope/useFieldScope";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import hasRenderedContent from "@/utils/has-rendered-content";
import type { FieldSlot } from "./types";

const slotClasses: Record<FieldSlot, string | undefined> = {
	"field.input": undefined,
	"field.before": "mb-2",
	"field.after": "mt-2",
};

/** Renders the extensions matching a field. For `field.input`, `children` is the built-in input, shown when nothing replaces it. */
const FieldSlots: ParentComponent<{
	slot: FieldSlot;
	config?: CollectionLeafFieldConfig;
	/** The built-in input's label markers, which `Field.Label` shows when an input slot replaces it. */
	markers?: FieldLabelMarkersProps;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const brickStore = useBrickStore();
	const context = useFieldRenderState();
	const scope = useFieldScope()?.scope;
	if (!scope) {
		throw new Error(
			"Field slots must be rendered inside a FieldScopeProvider.",
		);
	}

	// ----------------------------------
	// Memos
	const field = createMemo(() =>
		props.config ? scope.get(props.config.key, props.config.type) : undefined,
	);
	const contributions = createMemo(() => {
		const config = props.config;
		if (!config || !field()) return [];

		return matchSlots(
			fieldSlots.filter((entry) => entry.slot === props.slot),
			{
				collection: context.collectionKey(),
				brick: context.brickKey(),
				kind: brickStore.get.bricks[context.brickIndex()]?.type,
				field: config.key,
				fieldType: config.type,
			},
		);
	});

	// ----------------------------------
	// Render
	return (
		<For each={contributions()} fallback={props.children}>
			{(entry) => {
				const content = children(() => (
					<Show when={field()}>
						{(field) => (
							<FieldMarkersContext.Provider
								value={
									props.slot === "field.input"
										? { key: field().key, markers: () => props.markers ?? {} }
										: undefined
								}
							>
								<AdminExtensionBoundary name={entry.key} placement="content">
									<entry.component
										slot={props.slot}
										key={entry.key}
										field={field()}
										fields={scope}
										options={entry.options}
									/>
								</AdminExtensionBoundary>
							</FieldMarkersContext.Provider>
						)}
					</Show>
				));

				//* an input slot that renders nothing keeps the built-in input
				return (
					<Show
						when={hasRenderedContent(content.toArray())}
						fallback={props.slot === "field.input" ? props.children : undefined}
					>
						<div class={slotClasses[props.slot]} data-admin-slot={entry.key}>
							{content()}
						</div>
					</Show>
				);
			}}
		</For>
	);
};

export default FieldSlots;
