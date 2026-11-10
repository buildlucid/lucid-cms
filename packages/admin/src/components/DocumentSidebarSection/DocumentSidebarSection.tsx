import { Collapsible } from "@kobalte/core";
import classNames from "classnames";
import { TbOutlineChevronRight } from "solid-icons/tb";
import { type Component, type JSXElement, Show } from "solid-js";
import useUserPreference from "@/hooks/useUserPreference/useUserPreference";
import userPreferencesStore, {
	type SectionPreferenceKey,
} from "@/store/userPreferencesStore/userPreferencesStore";

export interface DocumentSidebarSectionProps {
	title: string;
	icon: JSXElement;
	/** Remembers whether the section is open. Slot sections use the one their props give. */
	preferenceKey: SectionPreferenceKey;
	/** A short fact shown beside the title, such as a count. */
	meta?: string | number;
	children: JSXElement;
}

/**
 * A collapsible section of the document sidebar. Plugins render one from a
 * `document.sidebar` slot component.
 *
 * @example
 * ```tsx
 * import { DocumentSidebarSection } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 * import { TbOutlineChartBar } from "solid-icons/tb";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<DocumentSidebarSection
 * 		title={t("analytics.views.title")}
 * 		icon={<TbOutlineChartBar size={12} />}
 * 		preferenceKey={props.preferenceKey}
 * 	>
 * 		<p>{t("analytics.views.summary", { count: views() })}</p>
 * 	</DocumentSidebarSection>
 * );
 * ```
 */
const DocumentSidebarSection: Component<DocumentSidebarSectionProps> = (
	props,
) => {
	// ----------------------------------
	// State & Hooks
	const [open, setOpen] = useUserPreference({
		value: () => userPreferencesStore.getSectionOpen(props.preferenceKey),
		setValue: (value) =>
			userPreferencesStore.setSectionOpen(props.preferenceKey, value),
		defaultValue: true,
	});

	// ----------------------------------
	// Render
	return (
		<Collapsible.Root open={open()} onOpenChange={setOpen}>
			<section>
				<Collapsible.Trigger class="group flex w-full items-center gap-2 rounded-md text-left focus:outline-hidden focus-visible:ring-1 ring-primary">
					<span class="flex size-4 shrink-0 items-center justify-center text-icon transition-colors group-hover:text-icon-hover [&_svg]:size-3">
						{props.icon}
					</span>
					<h3 class="min-w-0 flex-1 truncate text-sm font-medium text-title">
						{props.title}
					</h3>
					<Show when={props.meta !== undefined}>
						<span class="text-xs font-medium text-body">{props.meta}</span>
					</Show>
					<TbOutlineChevronRight
						size={12}
						class={classNames(
							"shrink-0 text-body transition-transform duration-200",
							{
								"rotate-90": open(),
							},
						)}
					/>
				</Collapsible.Trigger>
				<Collapsible.Content class="mt-4">{props.children}</Collapsible.Content>
			</section>
		</Collapsible.Root>
	);
};

export default DocumentSidebarSection;
