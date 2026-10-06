import type { RichTextJSON } from "@lucidcms/rich-text";
import { Extension } from "@tiptap/core";
import type { Release } from "@types";
import classNames from "classnames";
import { FaSolidArrowUp, FaSolidXmark } from "solid-icons/fa";
import { type Component, createMemo, onMount, Show } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { richTextHasContent } from "@/components/RichText/helpers";
import RichText from "@/components/RichText/RichText";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";

/**
 * The box for writing a release's description, comments and replies. Typing
 * `@` mentions anyone who can see the release, and the round button or
 * Cmd/Ctrl+Enter sends it. It takes focus when it appears, and reports when
 * focus leaves it or Escape is pressed so callers can close it.
 */
export const ReleaseRichTextEditor: Component<{
	release: Release;
	id: string;
	value: RichTextJSON | undefined;
	onChange: (value: RichTextJSON) => void;
	onSubmit: () => void;
	submitting: boolean;
	/** Names the send button for screen readers and on hover. */
	submitLabel: string;
	placeholder?: string;
	error?: string;
	/** Lets it be sent empty, such as to clear a description. */
	allowEmpty?: boolean;
	/** `floating` is the card at the bottom of the release, `inline` sits in the page. */
	variant: "floating" | "inline";
	onFocusLeave?: () => void;
	onEscape?: () => void;
	onClose?: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	let form: HTMLFormElement | undefined;

	// ----------------------------------------
	// Queries
	const users = api.releases.useGetMentionableUsers({
		queryParams: { location: { id: () => props.release.id } },
	});

	// ----------------------------------------
	// Memos
	const mentions = createMemo(() =>
		(users.data?.data ?? []).map((user) => ({
			id: user.id,
			label: helpers.formatUserName(user, "name"),
			hint: user.username ? `@${user.username}` : null,
			user,
		})),
	);
	const blocked = createMemo(
		() => !props.allowEmpty && !richTextHasContent(props.value),
	);

	// ----------------------------------------
	// Functions
	const submit = () => {
		if (blocked() || props.submitting) return;
		props.onSubmit();
	};
	//* ahead of the hard break extension, which also binds Mod-Enter
	const submitShortcut = Extension.create({
		name: "releaseRichTextSubmit",
		priority: 1000,
		addKeyboardShortcuts: () => ({
			"Mod-Enter": () => {
				submit();
				return true;
			},
		}),
	});

	// ----------------------------------------
	// Effects
	onMount(async () => {
		await new Promise(requestAnimationFrame);
		form
			?.querySelector<HTMLElement>("[contenteditable=true]")
			?.focus({ preventScroll: true });
	});

	// ----------------------------------------
	// Render
	return (
		<form
			ref={form}
			class={classNames(
				"relative grid grid-cols-1 overflow-hidden border border-border transition-colors focus-within:border-primary",
				{
					"rounded-2xl bg-card shadow-sm": props.variant === "floating",
					"rounded-lg bg-input": props.variant === "inline",
				},
			)}
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
			onKeyDown={(event) => {
				if (event.key === "Escape") props.onEscape?.();
			}}
			onFocusOut={(event) => {
				const next = event.relatedTarget;
				if (next instanceof Node && form?.contains(next)) return;
				props.onFocusLeave?.();
			}}
		>
			<RichText
				id={props.id}
				name={props.id}
				value={props.value}
				onChange={props.onChange}
				placeholder={props.placeholder}
				headings={false}
				mentions={mentions()}
				extensions={[submitShortcut]}
				class={classNames(
					"[&_[data-rich-text]]:rounded-none [&_[data-rich-text]]:border-0 [&_[data-rich-text]]:bg-transparent [&_[data-rich-text-control]]:max-h-60 [&_[data-rich-text-control]]:overflow-y-auto",
					{ "[&_.rich-text-content]:min-h-16": props.variant === "inline" },
				)}
			/>
			<div class="flex items-end gap-1 px-3 pb-3">
				<ErrorMessage theme="basic" classes="grow me-2" message={props.error} />
				<Show when={props.onClose}>
					{(close) => (
						<Button
							type="button"
							shape="circle"
							size="xs"
							variant="ghost"
							class="ms-auto me-0.5 shrink-0 border border-border focus-visible:ring-inset"
							onClick={() => close()()}
							aria-label={T()("common.close")}
							title={T()("common.close")}
						>
							<FaSolidXmark size={12} />
						</Button>
					)}
				</Show>
				<Button
					type="submit"
					shape="circle"
					size="xs"
					variant="secondary"
					class={classNames("shrink-0 focus-visible:ring-inset", {
						"ms-auto": !props.onClose,
					})}
					loading={props.submitting}
					disabled={blocked()}
					aria-label={props.submitLabel}
					title={props.submitLabel}
				>
					<FaSolidArrowUp size={11} />
				</Button>
			</div>
		</form>
	);
};
