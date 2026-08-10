import type { Collection, InternalDocumentField } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	onCleanup,
	Show,
} from "solid-js";
import { unwrap } from "solid-js/store";
import { BrickBody } from "@/components/Groups/Builder";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import brickStore from "@/store/brick-store";
import T from "@/translations";
import helpers from "@/utils/helpers";

const EmbeddedBrickEditPanel: Component<{
	state: {
		open: boolean;
		setOpen: (open: boolean) => void;
		brickRef?: string;
		zIndex?: number;
		localised?: boolean;
	};
	collection?: Collection;
	documentId?: number;
}> = (props) => {
	// ----------------------------------------
	// State
	let fieldSnapshot: InternalDocumentField[] | undefined;
	let capturedBrickRef: string | undefined;

	// ----------------------------------------
	// Memos
	const brickIndex = createMemo(() =>
		brickStore.get.bricks.findIndex(
			(brick) =>
				brick.type === "embedded" && brick.ref === props.state.brickRef,
		),
	);
	const brick = createMemo(() => brickStore.get.bricks[brickIndex()]);
	const config = createMemo(() =>
		props.collection?.embeddedBricks?.find((item) => item.key === brick()?.key),
	);
	const editableBrick = createMemo(() =>
		brickIndex() >= 0 && config() ? brick() : undefined,
	);
	const fieldErrors = createMemo(
		() =>
			brickStore.get.brickErrors.find(
				(error) =>
					error.ref === props.state.brickRef && error.key === brick()?.key,
			)?.fields ?? [],
	);
	const missingFieldColumns = createMemo(
		() =>
			props.collection?.migrationStatus?.missingColumns[brick()?.key ?? ""] ??
			[],
	);
	const title = createMemo(() =>
		helpers.getLocaleValue({
			value: config()?.details.name,
			fallback: brick()?.key ?? T()("editor.rich.text.brick.edit"),
		}),
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open || !brick() || capturedBrickRef === brick()?.ref)
			return;
		fieldSnapshot = structuredClone(unwrap(brick()?.fields ?? []));
		capturedBrickRef = brick()?.ref;
		brickStore.set("autoSavePaused", true);
	});

	onCleanup(() => {
		brickStore.set("autoSavePaused", false);
	});

	// ----------------------------------------
	// Functions
	const resetTransaction = () => {
		fieldSnapshot = undefined;
		capturedBrickRef = undefined;
		brickStore.set("autoSavePaused", false);
	};

	const cancel = () => {
		if (fieldSnapshot && brickIndex() >= 0) {
			brickStore.get.replaceBrickFields({
				brickIndex: brickIndex(),
				fields: fieldSnapshot,
			});
		}
		resetTransaction();
		props.state.setOpen(false);
	};

	const save = () => {
		resetTransaction();
		props.state.setOpen(false);
	};

	// ----------------------------------------
	// Render
	return (
		<BottomPanel
			zIndex={props.state.zIndex}
			state={{
				open: props.state.open,
				setOpen: (open) => {
					if (!open) cancel();
				},
			}}
			fetchState={{ isLoading: false, isError: false }}
			langauge={{ contentLocale: props.state.localised === true }}
			options={{ padding: "24", growContent: true, fullHeight: true }}
			copy={{
				title: title(),
				submit: T()("common.save"),
				cancel: T()("common.cancel"),
			}}
			callbacks={{ onSubmit: save }}
		>
			{(language) => (
				<Show
					when={editableBrick()}
					fallback={
						<p class="text-sm text-subtitle">
							{T()("editor.rich.text.brick.unavailable")}
						</p>
					}
				>
					{(resolvedBrick) => (
						<BrickBody
							open={true}
							brick={resolvedBrick()}
							brickIndex={brickIndex()}
							configFields={config()?.fields ?? []}
							fieldErrors={fieldErrors()}
							missingFieldColumns={missingFieldColumns()}
							collectionKey={props.collection?.key}
							documentId={props.documentId}
							contentLocale={language?.contentLocale}
							options={{}}
						/>
					)}
				</Show>
			)}
		</BottomPanel>
	);
};

export default EmbeddedBrickEditPanel;
