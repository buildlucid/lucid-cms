import { type Component, For, Show } from "solid-js";
import { menuItemClasses } from "@/components/Menu/itemClasses";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import T from "@/translations";
import type { RichTextMentionOption } from "../types";

/**
 * The people offered while typing an `@` mention. Arrow keys move the active
 * option from the editor, and choosing one keeps focus in the editor.
 */
const MentionMenu: Component<{
	options: RichTextMentionOption[];
	active: number;
	onActive: (index: number) => void;
	onSelect: (index: number) => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			role="listbox"
			aria-label={T()("editor.rich.text.mentions")}
			class="scrollbar max-h-60 w-64 overflow-y-auto rounded-md border border-border bg-popover p-1.5 shadow-md animate-dropdown"
		>
			<Show
				when={props.options.length > 0}
				fallback={
					<p class="px-2 py-1 text-sm text-muted">
						{T()("editor.rich.text.mentions.empty")}
					</p>
				}
			>
				<For each={props.options}>
					{(option, index) => (
						<button
							type="button"
							role="option"
							aria-selected={index() === props.active}
							class={menuItemClasses({ selected: index() === props.active })}
							onMouseDown={(event) => event.preventDefault()}
							onMouseEnter={() => props.onActive(index())}
							onClick={() => props.onSelect(index())}
						>
							<Show when={option.user}>
								{(user) => (
									<UserDisplay user={user()} variant="icon" size="xs" />
								)}
							</Show>
							<span class="truncate text-title">{option.label}</span>
							<Show when={option.hint}>
								<span class="ml-auto truncate text-xs text-muted">
									{option.hint}
								</span>
							</Show>
						</button>
					)}
				</For>
			</Show>
		</div>
	);
};

export default MentionMenu;
