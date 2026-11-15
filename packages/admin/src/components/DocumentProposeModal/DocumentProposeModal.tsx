import type { RequestSummary } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
	untrack,
} from "solid-js";
import Button from "@/components/Button/Button";
import { RequestPickerField } from "@/components/DocumentPublishModal/parts/RequestPickerField";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import RequestSelectDrawer from "@/components/RequestSelectDrawer/RequestSelectDrawer";
import Tabs from "@/components/Tabs/Tabs";
import api from "@/services/api";
import T from "@/translations";

type ProposeMode = "request" | "existing";

/**
 * Sends the builder's changes to latest for review, in a new update request or one that's
 * already open. Latest only changes once the request is approved and completed.
 */
const DocumentProposeModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	document: { collectionKey: string; documentId: number };
	/** What the document is called, for the new request's title. */
	documentLabel: string;
	loading: boolean;
	error?: string;
	onConfirm: (request: { title: string } | { id: number }) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [mode, setMode] = createSignal<ProposeMode>("request");
	const [title, setTitle] = createSignal("");
	const [existing, setExisting] = createSignal<RequestSummary>();
	const [pickerOpen, setPickerOpen] = createSignal(false);

	// ----------------------------------------
	// Queries & Mutations
	const addable = api.requests.useGetMultiple({
		queryParams: {
			filters: {
				addable: () =>
					`${props.document.collectionKey}:${props.document.documentId}`,
				type: () => "update",
			},
			perPage: 1,
		},
		enabled: () => props.open,
	});

	// ----------------------------------------
	// Memos
	const modes = createMemo(() =>
		(
			[
				{ value: "request", label: T()("requests.mode.request") },
				{ value: "existing", label: T()("requests.mode.existing") },
			] satisfies Array<{ value: ProposeMode; label: string }>
		).filter(
			(option) =>
				option.value !== "existing" ||
				(addable.data?.pagination?.total ?? 0) > 0,
		),
	);
	const existingRefs = createMemo(() => {
		const request = existing();
		return request ? [request] : [];
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		untrack(() => {
			setMode("request");
			setExisting(undefined);
			setTitle(
				T()("documents.propose.title.default", { name: props.documentLabel }),
			);
		});
	});

	// ----------------------------------------
	// Functions
	const submit = () => {
		if (mode() === "existing") {
			const request = existing();
			if (request) props.onConfirm({ id: request.id });
			return;
		}
		props.onConfirm({ title: title().trim() });
	};

	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			open={props.open}
			onOpenChange={props.setOpen}
			above={
				<Show when={modes().length > 1}>
					<Tabs.Root
						stretch={true}
						value={mode()}
						onChange={(value) => setMode(value as ProposeMode)}
						items={modes()}
					/>
				</Show>
			}
		>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<Modal.Header>
					<Modal.Title>{T()("documents.propose.title")}</Modal.Title>
					<Modal.Description>
						{mode() === "existing"
							? T()("documents.propose.existing.description")
							: T()("documents.propose.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body>
					<Show
						when={mode() === "existing"}
						fallback={
							<Input
								id="propose-request-title"
								name="title"
								type="text"
								value={title()}
								onChange={setTitle}
								required={true}
								label={T()("requests.title.label")}
							/>
						}
					>
						<RequestPickerField
							request={existing()}
							onOpen={() => setPickerOpen(true)}
							onClear={() => setExisting(undefined)}
						/>
						<Show when={existing()?.approved}>
							<p class="mt-2 text-xs text-warning">
								{T()("requests.documents.add.approved")}
							</p>
						</Show>
					</Show>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage theme="basic" message={props.error} />
					<Modal.Actions>
						<Button variant="outline" onClick={() => props.setOpen(false)}>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							loading={props.loading}
							disabled={
								mode() === "existing"
									? existing() === undefined
									: !title().trim()
							}
						>
							{mode() === "existing"
								? T()("requests.documents.add")
								: T()("documents.propose.submit")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
			<RequestSelectDrawer
				state={{
					open: pickerOpen(),
					setOpen: setPickerOpen,
					document: props.document,
					type: "update",
					selected: existingRefs().map((request) => request.id),
					selectedRefs: existingRefs(),
				}}
				callbacks={{ onSelect: (selection) => setExisting(selection.refs[0]) }}
			/>
		</Modal.Root>
	);
};

export default DocumentProposeModal;
