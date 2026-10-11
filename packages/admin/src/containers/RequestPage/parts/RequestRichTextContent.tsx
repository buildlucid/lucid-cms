import { Popover } from "@kobalte/core";
import type { RichTextJSON } from "@lucidcms/rich-text";
import type { RequestDetail } from "@types";
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
 * A request's description or comment text. Hovering a mention shows who it
 * is, while they can still see the request.
 */
export const RequestRichTextContent: Component<{
	request: RequestDetail;
	value: RichTextJSON;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [anchor, setAnchor] = createSignal<HTMLElement>();
	const [open, setOpen] = createSignal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// ----------------------------------------
	// Queries
	const users = api.requests.useGetMentionableUsers({
		queryParams: { location: { id: () => props.request.id } },
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
					class="z-60 w-max max-w-72 rounded-md border border-border bg-popover px-2.5 py-2 shadow-md animate-dropdown focus:outline-hidden"
					onMouseEnter={() => clearTimeout(timer)}
					onMouseLeave={() => schedule(false, CLOSE_DELAY)}
					onOpenAutoFocus={(event) => event.preventDefault()}
					onCloseAutoFocus={(event) => event.preventDefault()}
				>
					<Show when={user()}>
						{(user) => (
							<div class="flex items-center gap-2.5">
								<UserDisplay user={user()} variant="icon" size="sm" />
								<div class="min-w-0">
									<p class="truncate text-sm leading-5 font-medium text-title">
										{helpers.formatUserName(user(), "name")}
									</p>
									<Show when={user().username}>
										<p class="truncate text-xs leading-4 text-body">
											@{user().username}
										</p>
									</Show>
									<Show when={user().email}>
										<p class="truncate text-xs leading-4 text-muted">
											{user().email}
										</p>
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
