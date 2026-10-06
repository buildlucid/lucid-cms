import { Popover } from "@kobalte/core";
import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Release } from "@types";
import {
	type Component,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import RichTextContent from "@/components/RichTextContent/RichTextContent";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import api from "@/services/api";
import helpers from "@/utils/helpers";

const OPEN_DELAY = 300;
const CLOSE_DELAY = 150;

const mentionFrom = (target: EventTarget | null) =>
	target instanceof Element
		? target.closest<HTMLElement>("[data-lucid-mention]")
		: null;

/**
 * A release's description or comment text. Hovering a mention shows who it
 * is, while they can still see the release.
 */
export const ReleaseRichTextContent: Component<{
	release: Release;
	value: RichTextJSON;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [anchor, setAnchor] = createSignal<HTMLElement>();
	const [open, setOpen] = createSignal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// ----------------------------------------
	// Queries
	const users = api.releases.useGetMentionableUsers({
		queryParams: { location: { id: () => props.release.id } },
	});

	// ----------------------------------------
	// Memos
	const user = createMemo(() => {
		const id = Number(anchor()?.dataset.lucidUserId);
		return users.data?.data.find((user) => user.id === id);
	});

	// ----------------------------------------
	// Functions
	const schedule = (next: boolean, delay: number) => {
		clearTimeout(timer);
		timer = setTimeout(() => setOpen(next), delay);
	};
	const enter = (event: PointerEvent) => {
		const mention = mentionFrom(event.target);
		if (!mention) return;
		if (mention !== anchor()) setOpen(false);
		setAnchor(mention);
		schedule(true, OPEN_DELAY);
	};
	const leave = (event: PointerEvent) => {
		const mention = mentionFrom(event.target);
		if (!mention || mention.contains(event.relatedTarget as Node | null)) {
			return;
		}
		schedule(false, CLOSE_DELAY);
	};

	// ----------------------------------------
	// Effects
	onCleanup(() => clearTimeout(timer));

	// ----------------------------------------
	// Render
	return (
		<Popover.Root
			open={open() && user() !== undefined}
			onOpenChange={setOpen}
			anchorRef={anchor}
			placement="bottom-start"
			gutter={6}
			modal={false}
		>
			<div onPointerOver={enter} onPointerOut={leave}>
				<RichTextContent value={props.value} class="text-subtitle" />
			</div>
			<Popover.Portal>
				<Popover.Content
					class="z-60 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover p-3 shadow-md animate-dropdown focus:outline-hidden"
					onMouseEnter={() => clearTimeout(timer)}
					onMouseLeave={() => schedule(false, CLOSE_DELAY)}
					onOpenAutoFocus={(event) => event.preventDefault()}
					onCloseAutoFocus={(event) => event.preventDefault()}
				>
					<Show when={user()}>
						{(user) => (
							<div class="flex items-center gap-3">
								<UserDisplay user={user()} variant="icon" size="md" />
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-title">
										{helpers.formatUserName(user(), "name")}
									</p>
									<Show when={user().username}>
										<p class="truncate text-xs text-body">@{user().username}</p>
									</Show>
									<Show when={user().email}>
										<p class="truncate text-xs text-muted">{user().email}</p>
									</Show>
								</div>
							</div>
						)}
					</Show>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};
