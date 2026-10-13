import { LucidMention } from "@lucidcms/rich-text";
import { PluginKey } from "@tiptap/pm/state";
import {
	exitSuggestion,
	Suggestion,
	type SuggestionProps,
} from "@tiptap/suggestion";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import MentionMenu from "./parts/MentionMenu";
import type { RichTextMentionOption } from "./types";

const mentionPluginKey = new PluginKey("lucidMentionSuggestion");

/** Adds `@` mentions with a menu that searches for people as the query changes. */
export const createMentionExtension = (
	search: (query: string) => Promise<RichTextMentionOption[]>,
) =>
	LucidMention.extend({
		addProseMirrorPlugins() {
			return [
				Suggestion<RichTextMentionOption, RichTextMentionOption>({
					editor: this.editor,
					pluginKey: mentionPluginKey,
					char: "@",
					items: ({ query }) => search(query),
					command: ({ editor, range, props }) => {
						editor
							.chain()
							.focus()
							.insertContentAt(range, [
								{
									type: this.name,
									attrs: { userId: props.id, label: props.label },
								},
								{ type: "text", text: " " },
							])
							.run();
					},
					render: () => {
						const [suggestion, setSuggestion] =
							createSignal<
								SuggestionProps<RichTextMentionOption, RichTextMentionOption>
							>();
						const [active, setActive] = createSignal(0);
						let cleanup: (() => void) | undefined;

						const select = (index: number) => {
							const current = suggestion();
							const option = current?.items[index];
							if (current && option) current.command(option);
						};

						return {
							onStart: (props) => {
								setSuggestion(props);
								setActive(0);
								const element = document.createElement("div");
								element.className = "z-60";
								const dispose = render(
									() => (
										<MentionMenu
											options={suggestion()?.items ?? []}
											active={active()}
											onActive={setActive}
											onSelect={select}
										/>
									),
									element,
								);
								const unmount = props.mount(element);
								cleanup = () => {
									unmount();
									dispose();
								};
							},
							onUpdate: (props) => {
								setSuggestion(props);
								setActive(0);
							},
							onKeyDown: ({ event, view }) => {
								if (event.key === "Escape") {
									//* closes the menu without reaching forms or modals around the editor
									event.stopPropagation();
									exitSuggestion(view, mentionPluginKey);
									return true;
								}
								const count = suggestion()?.items.length ?? 0;
								if (count === 0) return false;
								if (event.key === "ArrowDown") {
									setActive((active() + 1) % count);
									return true;
								}
								if (event.key === "ArrowUp") {
									setActive((active() - 1 + count) % count);
									return true;
								}
								if (event.key === "Enter" || event.key === "Tab") {
									select(active());
									return true;
								}
								return false;
							},
							onExit: () => {
								cleanup?.();
								cleanup = undefined;
								setSuggestion(undefined);
							},
						};
					},
				}),
			];
		},
	});
