import type { DocumentRef } from "@types";
import { FaSolidPen, FaSolidXmark } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	Show,
	useContext,
} from "solid-js";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import { PanelLayerContext } from "@/components/Groups/Panel/PanelLayerContext";
import {
	type AnimatedTabItem,
	AnimatedTabs,
} from "@/components/Partials/AnimatedTabs";
import Button from "@/components/Partials/Button";
import T from "@/translations";
import { Input } from "../Input";
import { Label } from "../Label";
import { Switch } from "../Switch";
import type { RichTextOptions } from "./types";

export type RichTextLinkUpdate =
	| {
			kind: "external";
			label: string;
			url: string;
			openInNewTab: boolean;
	  }
	| {
			kind: "document";
			label: string;
			document?: Pick<DocumentRef, "collectionKey" | "id">;
			openInNewTab: boolean;
	  };

const LinkModal: Component<{
	state: {
		open: boolean;
		setOpen: (open: boolean) => void;
		initialLabel: string;
		initialUrl: string;
		initialKind: "external" | "document";
		initialDocument?: DocumentRef;
		initialOpenInNewTab: boolean;
		canRemove: boolean;
	};
	options?: RichTextOptions;
	callbacks: {
		onUpdate: (values: RichTextLinkUpdate) => void;
		onRemove: () => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [label, setLabel] = createSignal("");
	const [url, setUrl] = createSignal("");
	const [kind, setKind] = createSignal<"external" | "document">("external");
	const [documentRef, setDocumentRef] = createSignal<DocumentRef>();
	const [openInNewTab, setOpenInNewTab] = createSignal(false);
	const parentLayer = useContext(PanelLayerContext);

	// ----------------------------------------
	// Memos
	const modalLayer = createMemo(
		() =>
			props.options?.linkModalZIndex ?? (parentLayer ? parentLayer() + 20 : 70),
	);
	const internalLinkCollectionKeys = createMemo(
		() => props.options?.internalLinkCollectionKeys ?? [],
	);
	const externalEnabled = createMemo(
		() => props.options?.links?.external !== false,
	);
	const internalEnabled = createMemo(
		() => internalLinkCollectionKeys().length > 0,
	);
	const linkKindTabs = createMemo<AnimatedTabItem[]>(() => [
		{
			key: "external",
			label: T()("editor.rich.text.link.external"),
			class: "w-full justify-center px-2.5 py-1.5",
		},
		{
			key: "document",
			label: T()("editor.rich.text.link.document"),
			class: "w-full justify-center px-2.5 py-1.5",
		},
	]);
	const selectedDocumentLabel = createMemo(() => {
		const document = documentRef();
		if (!document) return "";

		const routeLabel = document.route?.label;
		const resolvedLabel =
			typeof routeLabel === "string"
				? routeLabel
				: ((props.options?.locale
						? routeLabel?.[props.options.locale]
						: undefined) ??
					Object.values(routeLabel ?? {}).find(
						(value): value is string => typeof value === "string",
					));

		return (
			resolvedLabel ||
			T()("editor.rich.text.document.fallback", {
				collection: document.collectionKey,
				id: document.id,
			})
		);
	});
	const selectedDocumentPath = createMemo(() => {
		const document = documentRef();
		if (!document) return "";

		const routePath = document.route?.path;
		if (typeof routePath === "string") return routePath;
		return (
			(props.options?.locale ? routePath?.[props.options.locale] : undefined) ??
			Object.values(routePath ?? {}).find(
				(value): value is string => typeof value === "string",
			) ??
			""
		);
	});
	// ----------------------------------------
	// Functions
	const closeModal = () => props.state.setOpen(false);
	const changeKind = (nextKind: "external" | "document") => {
		setKind(nextKind);
	};
	const selectDocument = () => {
		props.options?.callbacks?.selectDocument?.({
			collectionKeys: internalLinkCollectionKeys(),
			current: documentRef(),
			zIndex: modalLayer() + 20,
			onSelect: (document) => {
				setDocumentRef(document);
				if (!label().trim()) {
					setLabel(selectedDocumentLabel());
				}
			},
		});
	};
	const updateLink = () => {
		if (kind() === "document") {
			const document = documentRef();
			props.callbacks.onUpdate({
				kind: "document",
				label: label(),
				document,
				openInNewTab: openInNewTab(),
			});
			return;
		}

		props.callbacks.onUpdate({
			kind: "external",
			label: label(),
			url: url(),
			openInNewTab: openInNewTab(),
		});
	};

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.state.open,
			(open) => {
				if (!open) return;
				setLabel(props.state.initialLabel);
				setUrl(props.state.initialUrl);
				setDocumentRef(props.state.initialDocument);
				setOpenInNewTab(props.state.initialOpenInNewTab);
				const initialKind =
					props.state.initialKind === "document" && internalEnabled()
						? "document"
						: externalEnabled()
							? "external"
							: "document";
				setKind(initialKind);
			},
		),
	);

	// ----------------------------------------
	// Render
	return (
		<Modal
			state={{ open: props.state.open, setOpen: closeModal }}
			options={{ noPadding: true, nested: true, zIndex: modalLayer() }}
		>
			<div class="flex flex-col gap-0 p-4 md:p-6">
				<Show when={externalEnabled() && internalEnabled()}>
					<AnimatedTabs
						items={linkKindTabs()}
						activeKey={kind()}
						onSelect={(key) => {
							if (key === "external" || key === "document") changeKind(key);
						}}
						class="mb-4"
						listClass="w-full gap-1 [&>li]:grow"
						indicatorClass="shadow-xs"
						fullWidth
					/>
				</Show>

				<Input
					id="rich_text_link_label"
					value={label()}
					onChange={setLabel}
					name="label"
					type="text"
					copy={{ label: T()("common.label") }}
					required={false}
					hideOptionalText
				/>

				<Show when={kind() === "external"}>
					<Input
						id="rich_text_link_url"
						value={url()}
						onChange={setUrl}
						name="url"
						type="text"
						copy={{ label: T()("common.url") }}
						required={false}
						hideOptionalText
					/>
				</Show>

				<Show when={kind() === "document"}>
					<Label
						id="rich_text_link_document"
						label={T()("common.document")}
						required={false}
						theme="basic"
						hideOptionalText
					/>
					<div class="mb-3 flex items-center justify-between gap-3 rounded-md border border-border bg-card-base p-3">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-title">
								{documentRef()
									? selectedDocumentLabel()
									: T()("editor.rich.text.link.document.none")}
							</p>
							<Show when={selectedDocumentPath()}>
								<p class="truncate text-xs text-subtitle">
									{selectedDocumentPath()}
								</p>
							</Show>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							<Show
								when={documentRef()}
								fallback={
									<Button
										type="button"
										theme="secondary"
										size="small"
										onClick={selectDocument}
									>
										{T()("common.select")}
									</Button>
								}
							>
								<Button
									type="button"
									theme="secondary-subtle"
									size="icon-subtle"
									onClick={selectDocument}
									aria-label={T()("common.edit")}
								>
									<FaSolidPen size={12} />
								</Button>
								<Button
									type="button"
									theme="danger-subtle"
									size="icon-subtle"
									onClick={() => setDocumentRef(undefined)}
									aria-label={T()("common.remove")}
								>
									<FaSolidXmark size={14} />
								</Button>
							</Show>
						</div>
					</div>
				</Show>

				<Switch
					id="rich_text_open_in_new_tab"
					value={openInNewTab()}
					onChange={setOpenInNewTab}
					name="open_in_new_tab"
					copy={{
						label: T()("common.open.in.new.tab"),
						true: T()("common.yes"),
						false: T()("common.no"),
					}}
					required={false}
					hideOptionalText
					labelLeft
				/>
			</div>
			<ModalFooter>
				<div>
					<Show when={props.state.canRemove}>
						<Button
							type="button"
							theme="danger-outline"
							size="medium"
							onClick={props.callbacks.onRemove}
						>
							{T()("editor.rich.text.link.remove")}
						</Button>
					</Show>
				</div>
				<div class="flex gap-2.5">
					<Button
						type="button"
						theme="border-outline"
						size="medium"
						onClick={closeModal}
					>
						{T()("common.cancel")}
					</Button>
					<Button
						type="button"
						theme="primary"
						size="medium"
						onClick={updateLink}
						disabled={
							kind() === "document"
								? Boolean(documentRef()) && !selectedDocumentPath()
								: !url().trim()
						}
					>
						{T()("common.update")}
					</Button>
				</div>
			</ModalFooter>
		</Modal>
	);
};

export default LinkModal;
