import {
	Button,
	DocumentSidebarSection,
	Skeleton,
	StateNote,
	ViewAllLink,
} from "@lucidcms/admin/components";
import { useTranslation } from "@lucidcms/admin/hooks";
import type { SlotComponent } from "@lucidcms/admin/types";
import { TbOutlineHistory } from "solid-icons/tb";
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js";
import usePreviousPaths from "../../hooks/use-previous-paths.js";
import PreviousPathsDrawer from "../PreviousPathsDrawer/PreviousPathsDrawer.jsx";
import type previousPathsSectionConfig from "./config.js";

/** How many previous paths the sidebar lists, leaving the rest to the drawer. */
const PREVIEW_COUNT = 3;

/**
 * Shows recent previous paths in the sidebar and all paths in a drawer. Reserves loading space
 * once the page is saved.
 */
const PreviousPathsSection: SlotComponent<
	ReturnType<typeof previousPathsSectionConfig>
> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const previous = usePreviousPaths();
	const [open, setOpen] = createSignal(false);

	// ----------------------------------
	// Memos
	const paths = createMemo(() => previous.paths.data ?? []);
	const items = createMemo(() =>
		paths()
			.slice(0, PREVIEW_COUNT)
			.map((path) => ({
				path: path.path,
				//* the language and, on latest, environment tell a path's rows apart
				meta: [
					path.locale?.toUpperCase(),
					previous.showEnvironment()
						? previous.environmentLabel(path.environment)
						: undefined,
				]
					.filter(Boolean)
					.join(" · "),
			})),
	);

	// ----------------------------------
	// Render
	return (
		<>
			<Show when={previous.saved()}>
				<DocumentSidebarSection
					title={t("plugin.pages.previous.paths.title")}
					icon={<TbOutlineHistory size={12} />}
					preferenceKey={props.preferenceKey}
					meta={paths().length || undefined}
				>
					<Switch>
						<Match when={previous.paths.isLoading}>
							<Skeleton>
								<span class="skeleton block h-4" />
							</Skeleton>
						</Match>
						<Match when={previous.paths.isError && paths().length === 0}>
							<StateNote
								variant="danger"
								action={
									<Button
										variant="ghost"
										size="xs"
										onClick={() => void previous.paths.refetch()}
									>
										{t("common.try.again")}
									</Button>
								}
							>
								{t("plugin.pages.previous.paths.load.failed")}
							</StateNote>
						</Match>
						<Match when={paths().length === 0}>
							<p class="text-xs text-muted">
								{t("plugin.pages.previous.paths.none")}
							</p>
						</Match>
						<Match when={paths().length > 0}>
							<ul>
								<For each={items()}>
									{(item) => (
										<li class="mb-2 flex min-w-0 items-baseline justify-between gap-3 border-b border-border pb-2 last:mb-0 last:border-b-0 last:pb-0">
											<span class="min-w-0 break-all text-sm font-medium text-subtitle">
												{item.path}
											</span>
											<Show when={item.meta}>
												<span class="shrink-0 text-xs font-medium text-muted">
													{item.meta}
												</span>
											</Show>
										</li>
									)}
								</For>
							</ul>
							<ViewAllLink
								class="mt-3.5 -ms-1 w-fit"
								onClick={() => setOpen(true)}
							/>
						</Match>
					</Switch>
				</DocumentSidebarSection>
			</Show>
			<PreviousPathsDrawer open={open()} onOpenChange={setOpen} />
		</>
	);
};

export default PreviousPathsSection;
