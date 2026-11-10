import { Popover } from "@kobalte/core";
import classNames from "classnames";
import { TbOutlineBox, TbOutlineSearch } from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	on,
	Show,
} from "solid-js";
import Kbd from "@/components/Kbd/Kbd";
import T from "@/translations";
import type { PreviewBrickOption } from "@/utils/preview-editing";

/** A searchable list of bricks to add, opened from a brick's handle in the preview. */
export const PreviewBrickPicker: Component<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** What the search says it's for, eg. "Add a brick below Hero…". */
	label: string;
	/** Where the picker opens from, such as the handle that opened it. */
	anchorRect: () => DOMRect | undefined;
	bricks: PreviewBrickOption[];
	onPick: (brickKey: string) => void;
	/** Where focus goes back to when the picker closes, unless it moved on, eg. into the page. */
	returnFocus: () => HTMLElement | null | undefined;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const listId = createUniqueId();
	const [query, setQuery] = createSignal("");
	const [active, setActive] = createSignal(0);

	// ----------------------------------------
	// Memos
	const matches = createMemo(() => {
		const search = query().trim().toLowerCase();
		if (!search) return props.bricks;
		return props.bricks.filter((brick) =>
			[brick.label, brick.key, brick.description ?? ""].some((value) =>
				value.toLowerCase().includes(search),
			),
		);
	});
	const optionId = (index: number) => `${listId}-${index}`;

	// ----------------------------------------
	// Functions
	const pick = (index: number) => {
		const brick = matches()[index];
		if (brick) props.onPick(brick.key);
	};
	const highlight = (index: number) => {
		const count = matches().length;
		if (count === 0) return;
		const next = (index + count) % count;
		setActive(next);
		document.getElementById(optionId(next))?.scrollIntoView({
			block: "nearest",
		});
	};
	const onKeyDown = (event: KeyboardEvent) => {
		switch (event.key) {
			case "ArrowDown":
				highlight(active() + 1);
				break;
			case "ArrowUp":
				highlight(active() - 1);
				break;
			case "Home":
				highlight(0);
				break;
			case "End":
				highlight(matches().length - 1);
				break;
			case "Enter":
				pick(active());
				break;
			default:
				return;
		}
		event.preventDefault();
	};

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.open,
			(open) => {
				if (open) setQuery("");
			},
		),
	);
	createEffect(on(matches, () => setActive(0)));

	// ----------------------------------------
	// Render
	return (
		<Popover.Root
			open={props.open}
			onOpenChange={props.onOpenChange}
			//* modal, so a press anywhere else closes it, the preview's page included
			modal
			placement="bottom-start"
			gutter={6}
			getAnchorRect={props.anchorRect}
		>
			<Popover.Portal>
				<Popover.Content
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						queueMicrotask(() => {
							if (document.activeElement === document.body) {
								props.returnFocus()?.focus({ preventScroll: true });
							}
						});
					}}
					class="z-70 flex w-96 max-w-[calc(100vw-2rem)] max-h-[min(26rem,var(--kb-popper-content-available-height))] flex-col overflow-hidden floating-panel focus:outline-hidden"
				>
					<div class="relative shrink-0 border-b border-border">
						<TbOutlineSearch
							size={14}
							class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
						/>
						<input
							type="text"
							role="combobox"
							class="h-11 w-full bg-transparent pr-3.5 pl-9.5 text-sm text-title placeholder:text-muted focus:outline-hidden"
							placeholder={props.label}
							aria-label={props.label}
							aria-expanded="true"
							aria-controls={listId}
							aria-activedescendant={
								matches().length > 0 ? optionId(active()) : undefined
							}
							value={query()}
							onInput={(event) => setQuery(event.currentTarget.value)}
							onKeyDown={onKeyDown}
						/>
					</div>
					<div
						id={listId}
						role="listbox"
						class="min-h-0 overflow-y-auto overscroll-contain p-1.5 scrollbar"
					>
						<For
							each={matches()}
							fallback={
								<p class="px-3 py-6 text-center text-sm text-muted">
									{T()("preview.edit.bricks.empty")}
								</p>
							}
						>
							{(brick, index) => (
								<div
									id={optionId(index())}
									role="option"
									//* focus stays in the search, which points at the active option
									tabIndex={-1}
									aria-selected={index() === active()}
									class={classNames(
										"flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-100",
										index() === active()
											? "bg-card-hover text-title"
											: "text-subtitle",
									)}
									onPointerMove={() => setActive(index())}
									onClick={() => pick(index())}
									onKeyDown={onKeyDown}
								>
									<TbOutlineBox size={14} class="shrink-0 text-muted" />
									<span class="shrink-0 font-medium">{brick.label}</span>
									<Show when={brick.description}>
										<span class="ml-auto min-w-0 truncate pl-2 text-xs text-muted">
											{brick.description}
										</span>
									</Show>
								</div>
							)}
						</For>
					</div>
					<div
						class="flex shrink-0 items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted"
						aria-hidden="true"
					>
						<span class="flex items-center gap-1.5">
							<Kbd>↑↓</Kbd>
							{T()("preview.edit.bricks.keys.move")}
						</span>
						<span class="flex items-center gap-1.5">
							<Kbd>↵</Kbd>
							{T()("preview.edit.bricks.keys.add")}
						</span>
						<span class="flex items-center gap-1.5">
							<Kbd>esc</Kbd>
							{T()("preview.edit.bricks.keys.close")}
						</span>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};
