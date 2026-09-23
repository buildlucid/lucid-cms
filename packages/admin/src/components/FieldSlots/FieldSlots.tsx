import { fieldSlots } from "virtual:lucid-admin";
import type { InternalDocumentField } from "@lucidcms/types";
import type { FieldError } from "@types";
import { type Component, children, createMemo, For, Show } from "solid-js";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import {
	createFieldState,
	readFieldValue,
} from "@/extensions/editor/field-state";
import { resolveSlots } from "@/extensions/slot-policy";
import { useDocumentRoute } from "@/hooks/useDocumentRoute/useDocumentRoute";
import { useFieldRenderState } from "@/hooks/useFieldRenderState/useFieldRenderState";
import brickStore from "@/store/brickStore/brickStore";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import type { FieldConditionScope } from "@/utils/field-condition-helpers";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";
import { fieldSlotKeys } from "./constants";
import type { FieldSlot } from "./types";

/** Uses the current field instance, including its repeater group and content locale. */
const FieldSlots: Component<{
	slot: FieldSlot;
	config?: CollectionLeafFieldConfig;
	data?: InternalDocumentField;
	errors?: FieldError[];
	scope?: FieldConditionScope;
	groupRef?: string;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const context = useFieldRenderState();
	const route = useDocumentRoute(context.contentLocale);

	// ----------------------------------
	// Memos
	const contributions = createMemo(() => {
		if (!props.config) return [];
		const target = {
			collection: context.collectionKey(),
			brick: context.brickKey(),
			kind: brickStore.get.bricks[context.brickIndex()]?.type,
			field: props.config.key,
		};
		return resolveSlots(
			fieldSlots.filter((entry) => entry.slot === props.slot),
			target,
		);
	});

	// ----------------------------------
	// Render
	return (
		<Show when={props.config}>
			{(config) => (
				<For each={contributions()}>
					{(entry) => {
						const content = children(() => (
							<AdminExtensionBoundary name={entry.key} placement="content">
								<entry.component
									slot={props.slot}
									field={createFieldState({
										config: config(),
										data: props.data,
										errors: props.errors,
										contentLocale: context.contentLocale(),
										localized: brickStore.get.collectionLocalized,
										readOnly: brickStore.get.locked,
									})}
									context={{
										route: route(),
										collectionKey: context.collectionKey(),
										documentId: context.documentId(),
										contentLocale: context.contentLocale(),
										readOnly: brickStore.get.locked,
										get brick() {
											const brick = brickStore.get.bricks[context.brickIndex()];
											return brick && brick.type !== "collection-fields"
												? { key: brick.key, ref: brick.ref, kind: brick.type }
												: undefined;
										},
										groupRef: props.groupRef,
										getValue: (key) => {
											const config = flattenStructuralScopeConfigs(
												props.scope?.configFields ?? [],
											).find((field) => field.key === key);

											return config
												? readFieldValue(
														config,
														props.scope?.fields.find(
															(field) => field.key === key,
														),
														context.contentLocale(),
														brickStore.get.collectionLocalized,
													)
												: undefined;
										},
									}}
								/>
							</AdminExtensionBoundary>
						));

						return (
							<Show when={content.toArray().length > 0}>
								<div
									class={props.slot === fieldSlotKeys.before ? "mb-2" : "mt-2"}
									data-admin-slot={entry.key}
								>
									{content()}
								</div>
							</Show>
						);
					}}
				</For>
			)}
		</Show>
	);
};

export default FieldSlots;
