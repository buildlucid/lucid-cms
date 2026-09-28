import { type Component, type JSXElement, Show } from "solid-js";
import { webSiteName } from "@/utils/agent-chat";

/** Only web links open, so a saved value can never run script. */
const isWebLink = (url: string) => /^https?:\/\//i.test(url);

/**
 * One webpage as a compact row: a site initial, its title, and its site with
 * any detail below. The row opens the page in a new tab. The initial stands in
 * for a favicon, which would tell a third party what people view.
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
			class="-mx-2 flex min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-input focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
		>
			<span
				aria-hidden="true"
				class="flex size-5 shrink-0 items-center justify-center rounded bg-input text-[10px] font-medium uppercase text-muted"
			>
				{webSiteName(props.url).charAt(0)}
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
