import classNames from "classnames";
import { FaSolidCheck, FaSolidRotate } from "solid-icons/fa";
import type { Accessor } from "solid-js";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import Spinner from "@/components/Partials/Spinner";
import type { UseDocumentAutoSave } from "@/hooks/document/useDocumentAutoSave";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import T from "@/translations";

const MIN_SAVING_STATE_MS = 200;
const SAVED_STATE_MS = 2200;

export const AutoSaveStatusPill: Component<{
	ui: UseDocumentUIState;
	autoSave?: UseDocumentAutoSave;
	autoSaveUserEnabled?: Accessor<boolean>;
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	let autoSaveStatusTimeout: ReturnType<typeof setTimeout> | undefined;
	let autoSaveSavingMinTimeout: ReturnType<typeof setTimeout> | undefined;
	let autoSaveSavingStartedAt = 0;
	let wasAutoSaving = false;

	const [showAutoSaveSavedState, setShowAutoSaveSavedState] =
		createSignal(false);
	const [showAutoSaveSavingState, setShowAutoSaveSavingState] =
		createSignal(false);

	// ----------------------------------
	// Memos
	const showAutoSaveStatus = createMemo(() => {
		return (
			props.ui.hasAutoSavePermission?.() === true &&
			!!props.autoSaveUserEnabled?.()
		);
	});
	const autoSaveStatusLabel = createMemo(() => {
		if (showAutoSaveSavingState()) return T()("saving");
		if (showAutoSaveSavedState()) return T()("saved");
		return T()("auto_save");
	});
	const isAutoSaveDebouncePending = createMemo(() => {
		return props.autoSave?.isDebouncePending?.() || false;
	});
	const autoSaveDebounceProgress = createMemo(() => {
		return props.autoSave?.debounceProgress?.() || 0;
	});
	const autoSaveDebounceRingOffset = createMemo(() => {
		const circumference = 2 * Math.PI * 6.5;
		return circumference * (1 - autoSaveDebounceProgress());
	});
	const showDebounceRing = createMemo(() => {
		return (
			isAutoSaveDebouncePending() &&
			!showAutoSaveSavingState() &&
			!showAutoSaveSavedState()
		);
	});

	// ----------------------------------
	// Effects
	createEffect(() => {
		const isAutoSaving = props.ui.isAutoSaving?.() || false;

		if (isAutoSaving) {
			autoSaveSavingStartedAt = performance.now();
			wasAutoSaving = true;
			setShowAutoSaveSavingState(true);
			setShowAutoSaveSavedState(false);

			if (autoSaveStatusTimeout) {
				clearTimeout(autoSaveStatusTimeout);
				autoSaveStatusTimeout = undefined;
			}

			if (autoSaveSavingMinTimeout) {
				clearTimeout(autoSaveSavingMinTimeout);
				autoSaveSavingMinTimeout = undefined;
			}
			return;
		}

		if (wasAutoSaving) {
			const elapsed = performance.now() - autoSaveSavingStartedAt;
			const remaining = Math.max(0, MIN_SAVING_STATE_MS - elapsed);

			autoSaveSavingMinTimeout = setTimeout(() => {
				wasAutoSaving = false;
				setShowAutoSaveSavingState(false);
				setShowAutoSaveSavedState(true);

				autoSaveStatusTimeout = setTimeout(() => {
					setShowAutoSaveSavedState(false);
				}, SAVED_STATE_MS);
			}, remaining);
		}
	});

	onCleanup(() => {
		if (autoSaveStatusTimeout) clearTimeout(autoSaveStatusTimeout);
		if (autoSaveSavingMinTimeout) clearTimeout(autoSaveSavingMinTimeout);
	});

	// ----------------------------------
	// Render
	return (
		<Show when={showAutoSaveStatus()}>
			<div class="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 pointer-events-none">
				<div class="relative">
					<div
						class={classNames(
							"inline-flex items-center rounded-full border px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-[opacity,transform,background-color,border-color,color] duration-300",
							{
								"border-primary-base/25 bg-primary-base/10 text-primary-base opacity-100":
									showAutoSaveSavingState(),
								"border-border bg-success-base/10 text-success-base opacity-100":
									showAutoSaveSavedState(),
								"border-border bg-background-base/90 text-body opacity-85":
									showDebounceRing(),
								"border-border bg-background-base/85 text-body opacity-45":
									!showDebounceRing() &&
									!showAutoSaveSavingState() &&
									!showAutoSaveSavedState(),
							},
						)}
						aria-live="polite"
					>
						<div
							class={classNames(
								"relative flex items-center justify-center h-4 w-4 mr-1.5",
							)}
						>
							<Show when={showDebounceRing()}>
								<svg
									class="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 -rotate-90"
									viewBox="0 0 20 20"
									aria-hidden="true"
								>
									<circle
										cx="10"
										cy="10"
										r="6.5"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-dasharray={String(2 * Math.PI * 6.5)}
										stroke-dashoffset={autoSaveDebounceRingOffset()}
										class="opacity-70"
									/>
								</svg>
							</Show>
							<div
								class={classNames(
									"absolute inset-0 flex items-center justify-center transition-opacity duration-150",
									{
										"opacity-0": showDebounceRing(),
										"opacity-100": !showDebounceRing(),
									},
								)}
							>
								<Show
									when={showAutoSaveSavingState()}
									fallback={
										<Show
											when={showAutoSaveSavedState()}
											fallback={<FaSolidRotate size={10} class="opacity-70" />}
										>
											<FaSolidCheck size={10} />
										</Show>
									}
								>
									<Spinner size="sm" />
								</Show>
							</div>
						</div>
						<span>{autoSaveStatusLabel()}</span>
					</div>
				</div>
			</div>
		</Show>
	);
};
