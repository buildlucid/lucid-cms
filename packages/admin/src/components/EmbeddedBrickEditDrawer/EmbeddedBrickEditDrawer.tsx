import type { Collection, InternalDocumentField } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	onCleanup,
	Show,
} from "solid-js";
import { unwrap } from "solid-js/store";
import { BrickBody } from "@/components/BrickBody/BrickBody";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import brickStore from "@/store/brickStore/brickStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

const EmbeddedBrickEditDrawer: Component<{
	state: {
		open: boolean;
		setOpen: (open: boolean) => void;
		brickRef?: string;
		zIndex?: number;
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
			value: config()?.details.label,
			fallback: brick()?.key ?? T()("editor.rich.text.brick.edit"),
		}),
	);
	const summary = createMemo(() =>
		helpers.getLocaleValue({
			value: config()?.details.description,
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
		<Drawer.Root
			open={props.state.open}
			onOpenChange={(open) => {
				if (!open) cancel();
			}}
			zIndex={props.state.zIndex}
		>
			{(contentLocale) => (
				<>
					<Drawer.Header>
						<Drawer.Title>{title()}</Drawer.Title>
						<Drawer.Description>{summary()}</Drawer.Description>
					</Drawer.Header>
					<Drawer.Form onSubmit={save}>
						<Drawer.Body>
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
										brickConfig={config()}
										open={true}
										brick={resolvedBrick()}
										brickIndex={brickIndex()}
										configFields={config()?.fields ?? []}
										fieldErrors={fieldErrors()}
										missingFieldColumns={missingFieldColumns()}
										collectionKey={props.collection?.key}
										documentId={props.documentId}
										contentLocale={contentLocale}
										options={{}}
									/>
								)}
							</Show>
						</Drawer.Body>
						<Drawer.Footer>
							<Drawer.Actions>
								<Button
									size="md"
									variant="outline"
									onClick={() =>
										((open) => {
											if (!open) cancel();
										})(false)
									}
								>
									{T()("common.cancel")}
								</Button>
								<Button type="submit" variant="primary" size="md">
									{T()("common.save")}
								</Button>
							</Drawer.Actions>
						</Drawer.Footer>
					</Drawer.Form>
				</>
			)}
		</Drawer.Root>
	);
};

export default EmbeddedBrickEditDrawer;
