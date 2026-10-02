import classnames from "classnames";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import Button from "@/components/Button/Button";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import DragDrop from "@/components/DragDrop/DragDrop";
import EmptyState from "@/components/EmptyState/EmptyState";
import type { HomeWidget } from "@/components/HomeWidgets/types";
import { homeWidgets } from "@/components/HomeWidgets/widgets";
import api from "@/services/api";
import userPreferencesStore, {
	type HomeWidgetPreference,
} from "@/store/userPreferencesStore/userPreferencesStore";
import T from "@/translations";
import { type HomeLayoutItem, resolveHomeLayout } from "@/utils/home-layout";
import HomeCustomizeBar from "./HomeCustomizeBar";
import HomeWidgetControls from "./HomeWidgetControls";

const dragKey = "home-widgets";

const spans: Record<DashboardWidgetSize, string> = {
	sm: "md:col-span-6 xl:col-span-4",
	md: "md:col-span-6",
	lg: "md:col-span-12 xl:col-span-8",
	full: "md:col-span-12",
};

/**
 * The widget grid on Home's Overview view. While `editing`, changes go into a
 * draft that is only saved when the user is done.
 */
const HomeOverview: Component<{
	editing: boolean;
	onEditingChange: (editing: boolean) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	//* undefined is unchanged, `{ widgets: undefined }` is a reset to the defaults
	const [draft, setDraft] = createSignal<{
		widgets: HomeWidgetPreference[] | undefined;
	}>();

	// ----------------------------------------
	// Queries
	const collections = api.collections.useGetAll({ queryParams: {} });

	// ----------------------------------------
	// Memos
	const available = createMemo(() =>
		homeWidgets.filter((widget) =>
			widget.available({ collections: collections.data?.data }),
		),
	);
	const layout = createMemo(() => {
		const current = draft();
		return resolveHomeLayout(
			available(),
			props.editing && current
				? current.widgets
				: userPreferencesStore.getHomeWidgets(),
		);
	});
	const items = createMemo(
		() => new Map(layout().map((item) => [item.widget.key, item])),
	);
	//* keys keep each widget mounted while the layout around it changes
	const shownKeys = createMemo(() =>
		layout()
			.filter((item) => !item.hidden)
			.map((item) => item.widget.key),
	);

	// ----------------------------------------
	// Functions
	const toPreferences = (layoutItems: HomeLayoutItem<HomeWidget>[]) =>
		layoutItems.map(
			(item): HomeWidgetPreference => ({
				key: item.widget.key,
				size: item.size,
				hidden: item.hidden,
			}),
		);
	const change = (
		update: (widgets: HomeWidgetPreference[]) => HomeWidgetPreference[],
	) => {
		setDraft({ widgets: update(toPreferences(layout())) });
	};
	const swap = (key: string, targetKey: string) => {
		change((widgets) => {
			const from = widgets.findIndex((widget) => widget.key === key);
			const to = widgets.findIndex((widget) => widget.key === targetKey);
			if (from === -1 || to === -1) return widgets;
			const next = [...widgets];
			[next[from], next[to]] = [next[to], next[from]];
			return next;
		});
	};
	const move = (key: string, offset: -1 | 1) => {
		const keys = shownKeys();
		const target = keys[keys.indexOf(key) + offset];
		if (!target) return;
		swap(key, target);
		//* the widget's cell moves in the document, which drops focus from its grip
		queueMicrotask(() => {
			document
				.querySelector<HTMLElement>(`[data-home-widget-grip="${key}"]`)
				?.focus();
		});
	};
	const update = (key: string, values: Partial<HomeWidgetPreference>) => {
		change((widgets) =>
			widgets.map((widget) =>
				widget.key === key ? { ...widget, ...values } : widget,
			),
		);
	};
	//* widgets turned on go to the end, where they are easy to spot
	const toggle = (key: string, shown: boolean) => {
		if (!shown) {
			update(key, { hidden: true });
			return;
		}
		change((widgets) => [
			...widgets.filter((widget) => widget.key !== key),
			{ ...widgets.find((widget) => widget.key === key), key, hidden: false },
		]);
	};
	const finish = (save: boolean) => {
		const current = draft();
		if (save && current) userPreferencesStore.setHomeWidgets(current.widgets);
		setDraft(undefined);
		props.onEditingChange(false);
	};

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames("flex grow flex-col gap-6", {
				"pb-20": props.editing,
			})}
		>
			<Show
				when={shownKeys().length > 0}
				fallback={
					<EmptyState
						class="grow"
						title={T()("home.overview.empty.title")}
						description={T()("home.overview.empty.description")}
						actions={
							<Show when={!props.editing}>
								<Button
									type="button"
									variant="primary"
									size="sm"
									onClick={() => props.onEditingChange(true)}
								>
									{T()("home.customize")}
								</Button>
							</Show>
						}
					/>
				}
			>
				<DragDrop sortOrder={swap} animationMode="web-animation">
					{({ dragDrop }) => (
						<div class="grid grid-cols-1 gap-4 md:grid-cols-12">
							<For each={shownKeys()}>
								{(key) => (
									<Show when={items().get(key)}>
										{(item) => (
											// biome-ignore lint/a11y/noStaticElementInteractions: the grip button is the keyboard control
											<div
												data-dragkey={dragKey}
												data-dragref={key}
												draggable={props.editing}
												class={classnames(
													"flex min-w-0 flex-col gap-1.5",
													spans[item().size],
													{
														"opacity-50": dragDrop.getDragging()?.ref === key,
													},
												)}
												onDragStart={(event) =>
													dragDrop.onDragStart(event, {
														ref: key,
														key: dragKey,
													})
												}
												onDragEnd={(event) => dragDrop.onDragEnd(event)}
												onDragEnter={(event) =>
													dragDrop.onDragEnter(event, {
														ref: key,
														key: dragKey,
													})
												}
												onDragOver={(event) => dragDrop.onDragOver(event)}
											>
												<Show when={props.editing}>
													<HomeWidgetControls
														widgetKey={key}
														label={item().widget.label()}
														size={item().size}
														sizes={item().widget.sizes}
														dropTarget={
															dragDrop.getDraggingTarget()?.ref === key &&
															dragDrop.getDragging()?.ref !== key
														}
														onMove={(offset) => move(key, offset)}
														onResize={(size) => update(key, { size })}
														onHide={() => update(key, { hidden: true })}
													/>
												</Show>
												{/* widgets size themselves with container queries on this wrapper */}
												<div
													class={classnames("@container grow", {
														"pointer-events-none opacity-70": props.editing,
													})}
													inert={props.editing}
												>
													<Dynamic
														component={item().widget.component}
														size={item().size}
													/>
												</div>
											</div>
										)}
									</Show>
								)}
							</For>
						</div>
					)}
				</DragDrop>
			</Show>

			<Show when={props.editing}>
				<HomeCustomizeBar
					widgets={layout()}
					onToggle={toggle}
					onReset={() => setDraft({ widgets: undefined })}
					onCancel={() => finish(false)}
					onDone={() => finish(true)}
				/>
			</Show>
		</div>
	);
};

export default HomeOverview;
