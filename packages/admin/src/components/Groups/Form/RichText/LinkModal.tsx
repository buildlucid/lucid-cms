import { resolveRichTextDocumentPath } from "@lucidcms/rich-text";
import type { DocumentRef } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	Show,
} from "solid-js";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import T from "@/translations";
import { Input } from "../Input";
import { Label } from "../Label";
import { Switch } from "../Switch";
import { getRichTextDocumentLabel } from "./helpers";
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
			routeKey: string;
			collectionKey: string;
			documentId: number;
			openInNewTab: boolean;
	  };

const LinkModal: Component<{
	state: {
		open: boolean;
		setOpen: (open: boolean) => void;
		initialLabel: string;
		initialUrl: string;
		initialKind: "external" | "document";
		initialRouteKey?: string;
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
	const [routeKey, setRouteKey] = createSignal<string>();
	const [documentRef, setDocumentRef] = createSignal<DocumentRef>();
	const [openInNewTab, setOpenInNewTab] = createSignal(false);

	// ----------------------------------------
	// Memos
	const routes = createMemo(() => props.options?.routes ?? []);
	const externalEnabled = createMemo(
		() => props.options?.links?.external !== false,
	);
	const internalEnabled = createMemo(() => routes().length > 0);
	const activeRoute = createMemo(
		() =>
			routes().find((route) => route.key === routeKey()) ??
			routes().find(
				(route) => route.collectionKey === documentRef()?.collectionKey,
			) ??
			routes()[0],
	);
	const selectedDocumentLabel = createMemo(() => {
		const route = activeRoute();
		const document = documentRef();
		return route && document
			? getRichTextDocumentLabel(document, route, props.options?.locale)
			: "";
	});
	const selectedDocumentPath = createMemo(() => {
		const route = activeRoute();
		const document = documentRef();
		return route && document
			? resolveRichTextDocumentPath({
					route,
					reference: document,
					locale: props.options?.locale,
				})
			: "";
	});
	// ----------------------------------------
	// Functions
	const closeModal = () => props.state.setOpen(false);
	const changeKind = (nextKind: "external" | "document") => {
		setKind(nextKind);
		if (nextKind === "document" && !routeKey()) {
			setRouteKey(routes()[0]?.key);
		}
	};
	const selectDocument = () => {
		const currentRoute = activeRoute();
		props.options?.callbacks?.selectDocument?.({
			routes: currentRoute
				? [
						currentRoute,
						...routes().filter((route) => route.key !== currentRoute.key),
					]
				: routes(),
			current: documentRef(),
			onSelect: (document, route) => {
				setRouteKey(route.key);
				setDocumentRef(document);
				if (!label().trim()) {
					setLabel(
						getRichTextDocumentLabel(document, route, props.options?.locale),
					);
				}
			},
		});
	};
	const updateLink = () => {
		if (kind() === "document") {
			const route = activeRoute();
			const document = documentRef();
			if (!route || !document) return;
			props.callbacks.onUpdate({
				kind: "document",
				label: label(),
				routeKey: route.key,
				collectionKey: document.collectionKey,
				documentId: document.id,
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
				setRouteKey(
					routes().some((route) => route.key === props.state.initialRouteKey)
						? props.state.initialRouteKey
						: routes()[0]?.key,
				);
			},
		),
	);

	createEffect(() => {
		const route = activeRoute();
		const selected = documentRef();
		if (route && selected && selected.collectionKey !== route.collectionKey) {
			setDocumentRef(undefined);
		}
	});

	// ----------------------------------------
	// Render
	return (
		<Modal
			state={{ open: props.state.open, setOpen: closeModal }}
			options={{ noPadding: true, nested: true }}
		>
			<div class="flex flex-col gap-0 p-4 md:p-6">
				<Show when={externalEnabled() && internalEnabled()}>
					<div class="mb-4 flex rounded-md border border-border bg-card-base p-1">
						<Button
							type="button"
							theme={kind() === "external" ? "primary" : "secondary-subtle"}
							size="small"
							classes="grow"
							onClick={() => changeKind("external")}
						>
							{T()("editor.rich.text.link.external")}
						</Button>
						<Button
							type="button"
							theme={kind() === "document" ? "primary" : "secondary-subtle"}
							size="small"
							classes="grow"
							onClick={() => changeKind("document")}
						>
							{T()("editor.rich.text.link.document")}
						</Button>
					</div>
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
						required
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
						<Button
							type="button"
							theme="secondary"
							size="small"
							onClick={selectDocument}
						>
							{documentRef() ? T()("common.update") : T()("common.select")}
						</Button>
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
								? !activeRoute() || !documentRef()
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
