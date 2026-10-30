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
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import { useDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import T from "@/translations";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

const EmbeddedBrickEditDrawer: Component<{
	state: {
		open: boolean;
		setOpen: (open: boolean) => void;
		brickRef?: string;
		/** Locks the drawer to this locale. Unset lets it switch between the document's locales. */
		locale?: string;
		zIndex?: number;
	};
	collection?: Collection;
	documentId?: number;
}> = (props) => {
	// ----------------------------------------
	// State
	const brickStore = useBrickStore();
	const documentLocalization = useDocumentLocalization();
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
	const locales = createMemo(() =>
		props.state.locale === undefined
			? documentLocalization.locales()
			: documentLocalization
					.locales()
					.filter((locale) => locale.code === props.state.locale),
	);
	const localeCodes = createMemo(() => locales().map((locale) => locale.code));
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
	//* the edits made while the drawer is open become one undo step, or none when they're cancelled
	createEffect(() => {
		if (!props.state.open || !brick() || capturedBrickRef === brick()?.ref) {
			return;
		}
		//* a brick opened from inside another one, or returning to it, ends the last brick's step first
		if (capturedBrickRef !== undefined) brickStore.edits.endBatch();
		fieldSnapshot = structuredClone(unwrap(brick()?.fields ?? []));
		capturedBrickRef = brick()?.ref;
		brickStore.set("autoSavePaused", true);
		brickStore.edits.beginBatch();
	});

	onCleanup(() => {
		resetTransaction();
	});

	// ----------------------------------------
	// Functions
	const resetTransaction = () => {
		if (capturedBrickRef !== undefined) brickStore.edits.endBatch();
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
			locales={locales()}
		>
			{(contentLocale) => (
				<>
					<Drawer.Header>
						<Drawer.Title>{title()}</Drawer.Title>
						<Drawer.Description>{summary()}</Drawer.Description>
						<Drawer.LocaleSelect
							invalid={brickHelpers.hasErrorsOnOtherLocale({
								currentLocale: contentLocale() ?? "",
								fieldErrors: fieldErrors(),
								brickErrors: [],
							})}
						/>
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
										contentLocales={localeCodes}
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
