import T from "@/translations";
import {
	type Component,
	Show,
	createSignal,
	onMount,
	onCleanup,
	type Accessor,
	createMemo,
	type JSXElement,
	createEffect,
} from "solid-js";
import { A } from "@solidjs/router";
import classNames from "classnames";
import {
	FaSolidChevronLeft,
	FaSolidTrash,
	FaSolidLanguage,
} from "solid-icons/fa";
import helpers from "@/utils/helpers";
import userStore from "@/store/userStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import Layout from "@/components/Groups/Layout";
import Button from "@/components/Partials/Button";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import { getDocumentRoute } from "@/utils/route-helpers";
import type { CollectionResponse } from "@lucidcms/core/types";

export const HeaderLayout: Component<{
	state: {
		mode: "create" | "edit" | "revisions";
		version?: "draft" | "published";
		collectionKey: Accessor<string>;
		documentId: Accessor<number | undefined>;
		collection?: CollectionResponse;
		brickTranslationErrors?: Accessor<boolean>;
		canSaveDocument?: Accessor<boolean>;
		canPublishDocument?: Accessor<boolean>;
		panelOpen?: Accessor<boolean>;
		isPublished?: Accessor<boolean>;
		isBuilderLocked?: Accessor<boolean>;
		selectedRevision?: Accessor<number | undefined>;
	};
	actions?: {
		upsertDocumentAction?: () => void;
		setPanelOpen?: (_open: boolean) => void;
		setDeleteOpen?: (_open: boolean) => void;
		publishDocumentAction?: () => void;
		restoreRevisionAction?: () => void;
	};
	children?: JSXElement;
}> = (props) => {
	// ---------------------------------
	// State
	let headerRef: HTMLElement | undefined;
	let contentRef: HTMLDivElement | undefined;
	const [getHasScrolled, setHasScrolled] = createSignal(false);
	const [headerHeight, setHeaderHeight] = createSignal(191);

	// ---------------------------------
	// Functions
	const windowScroll = () => {
		setHasScrolled(window.scrollY > headerHeight());
	};
	const updateHeaderHeight = () => {
		if (headerRef) {
			const newHeight = headerRef.offsetHeight;
			if (newHeight !== headerHeight()) {
				setHeaderHeight(newHeight);
			}
		}
	};

	// ---------------------------------
	// Memos
	const showUpsertButton = createMemo(() => {
		if (!props.actions?.upsertDocumentAction) return false;
		if (props.state.isBuilderLocked?.()) return false;

		if (props.state.mode === "create") return true;
		if (props.state.version === "draft") return true;
		if (
			props.state.version === "published" &&
			props.state.collection?.config.useDrafts === false
		)
			return true;
		return false;
	});
	const showPublishButton = createMemo(() => {
		if (!props.actions?.publishDocumentAction) return false;
		if (props.state.mode === "create" || props.state.isBuilderLocked?.())
			return false;
		if (props.state.version === "published") return false;
		return true;
	});
	const defaultLocale = createMemo(() => {
		return contentLocaleStore.get.locales.find(
			(locale) => locale.isDefault === 1,
		);
	});
	const showRevisions = createMemo(() => {
		if (props.state.mode === "create") return false;
		return props.state.collection?.config.useRevisions ?? false;
	});
	const isPublished = createMemo(() => {
		if (props.state.collection?.config.useDrafts) {
			return props.state.isPublished?.();
		}
		if (props.state.mode === "revisions") return true;
		return props.state.isPublished?.();
	});
	const showRestoreRevisionButton = createMemo(() => {
		if (props.state.mode !== "revisions") return false;
		if (props.state.selectedRevision?.() === undefined) return false;
		if (!props.actions?.restoreRevisionAction) return false;
		return true;
	});
	const hasUpdatePermission = createMemo(() => {
		if (props.state.mode === "create") {
			return userStore.get.hasPermission(["create_content"]).all;
		}
		return userStore.get.hasPermission(["update_content"]).all;
	});
	const hasPublishPermission = createMemo(() => {
		return userStore.get.hasPermission(["publish_content"]).all;
	});
	const hasRestorePermission = createMemo(() => {
		return userStore.get.hasPermission(["restore_content"]).all;
	});
	const hasDeletePermission = createMemo(() => {
		return userStore.get.hasPermission(["delete_content"]).all;
	});
	const collectionName = createMemo(() =>
		helpers.getLocaleValue({
			value: props.state.collection?.details.name,
		}),
	);
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: props.state.collection?.details.singularName,
			}) || T()("document"),
	);

	// ---------------------------------
	// Effects
	onMount(() => {
		updateHeaderHeight();
		window.addEventListener("resize", updateHeaderHeight);
		document.addEventListener("scroll", windowScroll, { passive: true });

		const resizeObserver = new ResizeObserver(updateHeaderHeight);
		if (headerRef) {
			resizeObserver.observe(headerRef);
		}

		onCleanup(() => {
			window.removeEventListener("resize", updateHeaderHeight);
			document.removeEventListener("scroll", windowScroll);
			resizeObserver.disconnect();
		});
	});
	createEffect(() => {
		if (contentRef) {
			contentRef.style.marginTop = `${headerHeight()}px`;
			contentRef.style.opacity = "1";
		}
	});

	// ----------------------------------
	// Render
	return (
		<>
			<header
				style={{
					"view-transition-name": "document-builder-header",
				}}
				ref={headerRef}
				class={classNames(
					"before:absolute before:inset-0 overflow-hidden border-x border-b border-border rounded-b-xl before:z-0 px-15 md:px-30 fixed top-0 left-[310px] right-15 z-40 duration-200 ease-in-out transition-all",
					{
						"py-15 md:py-15 before:bg-container-1/95": getHasScrolled(),
						"py-15 md:py-30 before:bg-container-3": !getHasScrolled(),
					},
				)}
			>
				{/* Breadcrumb Top Bar */}
				<div
					class={classNames(
						"overflow-hidden transform-gpu duration-200 transition-all ease-in-out",
						{
							"opacity-100": !getHasScrolled(),
							"opacity-0 -translate-y-full max-h-0 pointer-events-none":
								getHasScrolled(),
						},
					)}
				>
					<Layout.Breadcrumbs
						breadcrumbs={[
							{
								link: `/admin/collections/${props.state.collectionKey()}`,
								label: collectionName() || "",
								include: props.state.collection?.mode === "multiple",
							},
							{
								link:
									props.state.mode === "create"
										? getDocumentRoute("create", {
												collectionKey: props.state.collectionKey(),
												useDrafts: props.state.collection?.config.useDrafts,
											})
										: getDocumentRoute("edit", {
												collectionKey: props.state.collectionKey(),
												useDrafts: props.state.collection?.config.useDrafts,
												documentId: props.state.documentId(),
											}),
								label:
									props.state.mode === "create"
										? `${T()("create")} ${collectionSingularName()}`
										: `${T()("edit")} ${collectionSingularName()} (#${props.state.documentId()})`,
							},
						]}
						options={{
							noBorder: true,
							noPadding: true,
						}}
					/>
				</div>
				{/* Navigation */}
				<div
					class={classNames(
						"w-full border-b border-border flex items-center gap-15 relative z-10 transition-all duration-200 ease-in-out",
						{
							"opacity-100 mt-15": !getHasScrolled(),
							"opacity-0 -translate-y-full max-h-0 pointer-events-none":
								getHasScrolled(),
						},
					)}
				>
					<Show when={props.state.collection?.config.useDrafts}>
						<A
							href={
								props.state.mode !== "create"
									? getDocumentRoute("edit", {
											collectionKey: props.state.collectionKey(),
											useDrafts: props.state.collection?.config.useDrafts,
											documentId: props.state.documentId(),
										})
									: "#"
							}
							class={classNames(
								"text-lg font-display pr-1 py-2 font-semibold after:absolute after:-bottom-px after:left-0 after:right-0 after:h-px relative",
								{
									"opacity-50 cursor-not-allowed focus:ring-0 hover:text-inherit":
										props.state.mode === "create",
									"cursor-pointer": props.state.mode !== "create",
								},
							)}
							activeClass={classNames({
								"after:bg-primary-base": props.state.mode !== "create",
							})}
						>
							{T()("draft")}
						</A>
					</Show>
					<A
						href={
							isPublished()
								? `/admin/collections/${props.state.collectionKey()}/published/${props.state.documentId()}`
								: "#"
						}
						class={classNames(
							"text-lg font-display pr-1 py-2 font-semibold after:absolute after:-bottom-px after:left-0 after:right-0 after:h-px relative",
							{
								"opacity-50 cursor-not-allowed focus:ring-0 hover:text-inherit":
									!isPublished(),
								"cursor-pointer": isPublished(),
							},
						)}
						activeClass={classNames({
							"after:bg-primary-base": isPublished(),
						})}
						aria-disabled={!isPublished()}
						title={!isPublished() ? T()("document_not_published") : ""}
					>
						{T()("published")}
					</A>
					<Show when={showRevisions()}>
						<A
							href={`/admin/collections/${props.state.collectionKey()}/revisions/${props.state.documentId()}/latest`}
							class={classNames(
								"text-lg font-display pr-1 py-2 font-semibold after:absolute after:-bottom-px after:left-0 after:right-0 after:h-px relative",
								{
									"after:bg-primary-base": props.state.mode === "revisions",
								},
							)}
						>
							{T()("revisions")}
						</A>
					</Show>
					{/* <span
						class="text-lg font-display px-1 py-2 font-semibold opacity-50 cursor-not-allowed"
						title="Coming soon"
					>
						{T()("preview")}
					</span> */}
				</div>
				{/* Actions */}
				<div
					class={classNames(
						"w-full flex items-end gap-2.5 transition-all duration-200 ease-in-out",
						{
							"mt-15": !getHasScrolled(),
						},
					)}
				>
					<div class="w-full relative">
						<Show when={props.state.collection?.config.useTranslations}>
							<ContentLocaleSelect
								hasError={props.state.brickTranslationErrors?.()}
							/>
						</Show>
						<Show
							when={
								props.state.collection?.config.useTranslations !== true &&
								defaultLocale()
							}
						>
							<div class="flex items-center">
								<FaSolidLanguage size={20} />
								<span class="ml-2.5 text-base font-medium text-title">
									{defaultLocale()?.name} ({defaultLocale()?.code})
								</span>
							</div>
						</Show>
					</div>
					<Show when={showUpsertButton()}>
						<Button
							type="button"
							theme="primary"
							size="x-small"
							onClick={props.actions?.upsertDocumentAction}
							disabled={props.state.canSaveDocument?.()}
							permission={hasUpdatePermission()}
						>
							{T()("save")}
						</Button>
					</Show>
					<Show when={showPublishButton()}>
						<Button
							type="button"
							theme="primary"
							size="x-small"
							onClick={props.actions?.publishDocumentAction}
							disabled={!props.state.canPublishDocument?.()}
							permission={hasPublishPermission()}
						>
							{T()("publish")}
						</Button>
					</Show>
					<Show when={showRestoreRevisionButton()}>
						<Button
							type="button"
							theme="primary"
							size="x-small"
							onClick={props.actions?.restoreRevisionAction}
							disabled={props.state.selectedRevision?.() === undefined}
							permission={hasRestorePermission()}
						>
							{T()("restore_revision")}
						</Button>
					</Show>
					<Show
						when={
							props.state.mode === "edit" &&
							props.state.collection?.mode === "multiple"
						}
					>
						<Button
							theme="input-style"
							size="x-icon"
							type="button"
							onClick={() => props.actions?.setDeleteOpen?.(true)}
							permission={hasDeletePermission()}
						>
							<span class="sr-only">{T()("delete")}</span>
							<FaSolidTrash />
						</Button>
					</Show>
					<Show when={props.state.mode === "edit"}>
						<Button
							theme="input-style"
							size="x-icon"
							type="button"
							onClick={() =>
								props.actions?.setPanelOpen?.(!props.state.panelOpen?.())
							}
						>
							<span class="sr-only">{T()("toggle_panel")}</span>
							<FaSolidChevronLeft
								class={classNames(
									"transform-gpu transition-transform duration-200",
									{
										"rotate-180": props.state.panelOpen?.(),
									},
								)}
							/>
						</Button>
					</Show>
				</div>
			</header>
			<div
				ref={contentRef}
				class="w-full flex flex-col grow overflow-hidden bg-container-3 rounded-t-xl border-x border-t border-border z-10 relative mt-[191px] duration-75 ease-out opacity-0 transition-all"
			>
				{props.children}
			</div>
		</>
	);
};
