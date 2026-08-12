import classNames from "classnames";
import { type Component, For, type JSX, Show, splitProps } from "solid-js";
import type { DocumentListingPreviewField } from "@/utils/document-table-helpers";

interface DocumentReferencePreviewCardProps
	extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
	title: string;
	subtitle?: string;
	fields?: DocumentListingPreviewField[];
	actions?: JSX.Element;
	notice?: JSX.Element;
	footer?: JSX.Element;
	invalid?: boolean;
}

/** Shared document-reference summary used by relation and rich-text fields. */
const DocumentReferencePreviewCard: Component<
	DocumentReferencePreviewCardProps
> = (props) => {
	// ----------------------------------------
	// Props
	const [local, rootProps] = splitProps(props, [
		"title",
		"subtitle",
		"fields",
		"actions",
		"notice",
		"footer",
		"invalid",
		"class",
	]);

	// ----------------------------------------
	// Render
	return (
		<div
			{...rootProps}
			class={classNames(
				"overflow-hidden rounded-lg border bg-input-base",
				{
					"border-border": !local.invalid,
					"border-error-base/50": local.invalid,
				},
				local.class,
			)}
		>
			<div class="flex items-start justify-between gap-3 px-4 py-3">
				<div class="min-w-0 grow">
					<p class="truncate text-sm font-medium text-title mb-0!">
						{local.title}
					</p>
					<Show when={local.subtitle}>
						{(subtitle) => (
							<p class="mt-0.5 truncate text-xs text-subtitle mb-0!">
								{subtitle()}
							</p>
						)}
					</Show>
					<Show when={local.notice}>
						<div class="mt-1">{local.notice}</div>
					</Show>
				</div>
				<Show when={local.actions}>
					<div class="flex shrink-0 self-center items-center gap-1">
						{local.actions}
					</div>
				</Show>
			</div>
			<Show when={(local.fields?.length ?? 0) > 0}>
				<div
					class={classNames("grid grid-cols-1 border-border border-t", {
						"sm:grid-cols-2": local.fields?.length === 2,
						"sm:grid-cols-3": (local.fields?.length ?? 0) >= 3,
					})}
				>
					<For each={local.fields}>
						{(field, index) => (
							<div
								class="min-w-0 border-border px-4 py-2.5 sm:not-first:border-l"
								classList={{
									"border-t": index() > 0,
									"sm:border-t-0": index() > 0,
								}}
								title={`${field.label}: ${field.value}`}
							>
								<p class="truncate text-[11px] font-medium text-unfocused mb-0!">
									{field.label}
								</p>
								<p class="mt-0.5 truncate text-xs text-subtitle mb-0!">
									{field.value}
								</p>
							</div>
						)}
					</For>
				</div>
			</Show>
			{local.footer}
		</div>
	);
};

export default DocumentReferencePreviewCard;
