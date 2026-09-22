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
import Button from "@/components/Button/Button";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import Switch from "@/components/Switch/Switch";
import Tabs, { type TabsItem } from "@/components/Tabs/Tabs";
import { LayerContext } from "@/hooks/useLayer/useLayer";
import T from "@/translations";
import type { RichTextOptions } from "../types";

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
	const parentLayer = useContext(LayerContext);

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
	const linkKindTabs = createMemo<TabsItem[]>(() => [
		{
			value: "external",
			label: T()("editor.rich.text.link.external"),
		},
		{
			value: "document",
			label: T()("editor.rich.text.link.document"),
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
		<Modal.Root
			open={props.state.open}
			onOpenChange={closeModal}
			zIndex={modalLayer()}
		>
			<Modal.Body>
				<div class="flex flex-col gap-3">
					<Show when={externalEnabled() && internalEnabled()}>
						<Tabs.Root
							items={linkKindTabs()}
							value={kind()}
							onChange={(value) => {
								if (value === "external" || value === "document")
									changeKind(value);
							}}
							stretch={true}
							class="mb-4"
						/>
					</Show>

					<Input
						id="rich_text_link_label"
						value={label()}
						onChange={setLabel}
						name="label"
						type="text"
						label={T()("common.label")}
						required={false}
					/>

					<Show when={kind() === "external"}>
						<Input
							id="rich_text_link_url"
							value={url()}
							onChange={setUrl}
							name="url"
							type="text"
							label={T()("common.url")}
							required={false}
						/>
					</Show>

					<Show when={kind() === "document"}>
						<FormLabel
							id="rich_text_link_document"
							label={T()("common.document")}
							required={false}
							theme="basic"
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
											variant="secondary"
											size="sm"
											onClick={selectDocument}
										>
											{T()("common.select")}
										</Button>
									}
								>
									<Button
										type="button"
										variant="background-subtle"
										size="xs"
										shape="square"
										onClick={selectDocument}
										aria-label={T()("common.edit")}
									>
										<FaSolidPen size={12} />
									</Button>
									<Button
										type="button"
										variant="danger-subtle"
										size="xs"
										shape="square"
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
						label={T()("common.open.in.new.tab")}
						trueLabel={T()("common.yes")}
						falseLabel={T()("common.no")}
						required={false}
					/>
				</div>
			</Modal.Body>
			<Modal.Footer>
				<div>
					<Show when={props.state.canRemove}>
						<Button
							type="button"
							variant="danger-outline"
							size="md"
							onClick={props.callbacks.onRemove}
						>
							{T()("editor.rich.text.link.remove")}
						</Button>
					</Show>
				</div>
				<Modal.Actions>
					<Button
						type="button"
						variant="outline"
						size="md"
						onClick={closeModal}
					>
						{T()("common.cancel")}
					</Button>
					<Button
						type="button"
						variant="primary"
						size="md"
						onClick={updateLink}
						disabled={
							kind() === "document"
								? Boolean(documentRef()) && !selectedDocumentPath()
								: !url().trim()
						}
					>
						{T()("common.update")}
					</Button>
				</Modal.Actions>
			</Modal.Footer>
		</Modal.Root>
	);
};

export default LinkModal;
