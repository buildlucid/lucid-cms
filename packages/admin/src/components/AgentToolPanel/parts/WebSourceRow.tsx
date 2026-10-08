import { TbOutlineLink } from "solid-icons/tb";
import { type Component, type JSXElement, Show } from "solid-js";
import { webSiteName } from "@/utils/agent-tools";

/** Only web links open, so a saved value can never run script. */
const isWebLink = (url: string) => /^https?:\/\//i.test(url);

/**
 * One webpage as a compact row, shaped like the chat's document references: a
 * page with a link mark, its title, and its site with any detail below. The row
 * opens the page in a new tab. No favicon loads, as that would tell a third
 * party what people view.
 */
const WebSourceRow: Component<{
	url: string;
	title?: string;
	meta?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<a
			href={isWebLink(props.url) ? props.url : undefined}
			target="_blank"
			rel="noopener noreferrer"
			title={props.url}
			class="-mx-1.5 flex min-w-0 items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
		>
			<span
				aria-hidden="true"
				class="flex h-9 w-7 shrink-0 items-center justify-center rounded border border-border bg-input text-muted"
			>
				<TbOutlineLink size={10} />
			</span>
			<span class="flex min-w-0 grow flex-col">
				<span class="truncate text-xs text-title">
					{props.title || webSiteName(props.url)}
				</span>
				<span class="truncate text-[11px] leading-4 text-muted">
					{webSiteName(props.url)}
					<Show when={props.meta}>{(meta) => <> · {meta()}</>}</Show>
				</span>
			</span>
		</a>
	);
};

export default WebSourceRow;
