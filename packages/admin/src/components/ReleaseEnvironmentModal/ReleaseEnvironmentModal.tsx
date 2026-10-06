import { useNavigate } from "@solidjs/router";
import type { Collection } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
	untrack,
} from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Modal from "@/components/Modal/Modal";
import RequestCreateFields from "@/components/RequestCreateFields/RequestCreateFields";
import Select from "@/components/Select/Select";
import Tabs from "@/components/Tabs/Tabs";
import { requestDocumentLimit } from "@/constants/requests";
import api from "@/services/api";
import T from "@/translations";
import { getTargetLabel } from "@/utils/requests";
import { getRequestRoute } from "@/utils/route-helpers";

type RequestMode = "now" | "request" | "existing";

/** Publishes directly when allowed, or adds the document to a new or existing request. */
const ReleaseEnvironmentModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	target: string | null;
	action: "publish" | "compose";
	collection: Collection | undefined;
	document: { collectionKey: string; documentId: number };
	source: string;
	publish: {
		loading: boolean;
		error?: string;
		onConfirm: (target: string) => void | Promise<void>;
	};
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const [mode, setMode] = createSignal<RequestMode>("now");
	const [existingId, setExistingId] = createSignal<number>();
	const [title, setTitle] = createSignal("");
	const [targets, setTargets] = createSignal<string[]>([]);

	// ----------------------------------------
	// Queries & Mutations
	const create = api.requests.useCreateSingle({
		onSuccess: (response) => {
			props.setOpen(false);
			navigate(getRequestRoute({ requestId: response.data.id }));
		},
	});

	const requests = api.requests.useGetMultiple({
		queryParams: {
			//* create requests always hold their one requested document
			queryString: () =>
				"filter[status]=open&filter[type]=publish&sort=-updatedAt&perPage=100",
		},
		enabled: () => props.open,
	});
	const add = api.requests.useAddDocuments({
		onSuccess: () => {
			const id = existingId();
			props.setOpen(false);
			if (id !== undefined) navigate(getRequestRoute({ requestId: id }));
		},
	});
	const eligible = createMemo(() =>
		(requests.data?.data ?? []).filter(
			(request) =>
				request.permissions.edit &&
				request.documents.length < requestDocumentLimit &&
				!request.documents.some(
					(member) =>
						member.collectionKey === props.document.collectionKey &&
						member.documentId === props.document.documentId,
				),
		),
	);

	// ----------------------------------------
	// Memos
	const environment = createMemo(() =>
		getTargetLabel(props.collection, props.target ?? ""),
	);
	//* publishing now is only offered when nothing requires a request first
	const modes = createMemo(() =>
		(
			[
				{
					value: "now",
					label: T()("requests.mode.now"),
				},
				{
					value: "request",
					label: T()("requests.mode.request"),
				},
				{
					value: "existing",
					label: T()("requests.mode.existing"),
				},
			] satisfies Array<{
				value: RequestMode;
				label: string;
			}>
		).filter(
			(option) =>
				(props.action === "publish" || option.value !== "now") &&
				(option.value !== "existing" || eligible().length > 0),
		),
	);
	const loading = createMemo(
		() =>
			props.publish.loading || create.action.isPending || add.action.isPending,
	);
	const error = createMemo(() =>
		mode() === "now"
			? props.publish.error
			: mode() === "existing"
				? add.errors()?.message
				: create.errors()?.message,
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		untrack(() => {
			setMode(props.action === "compose" ? "request" : "now");
			setExistingId(undefined);
			setTitle("");
			setTargets(props.target ? [props.target] : []);
			create.reset();
			add.reset();
		});
	});

	// ----------------------------------------
	// Functions
	const submit = async () => {
		if (mode() === "now") {
			if (props.target) await props.publish.onConfirm(props.target);
			return;
		}
		const document = {
			...props.document,
			source: props.source,
			targets: targets(),
		};
		if (mode() === "existing") {
			const id = existingId();
			if (id !== undefined) {
				add.action.mutate({ id, body: { documents: [document] } });
			}
			return;
		}
		create.action.mutate({ body: { title: title(), documents: [document] } });
	};

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.open} onOpenChange={props.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					void submit();
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{T()("modals.release.environment.title", {
							environment: environment(),
						})}
					</Modal.Title>
					<Show when={props.action === "compose"}>
						<Modal.Description>
							{T()("requests.mode.required", { environment: environment() })}
						</Modal.Description>
					</Show>
				</Modal.Header>
				<Modal.Body>
					<div class="grid gap-4">
						<Show when={modes().length > 1}>
							<Tabs.Root
								stretch={true}
								value={mode()}
								onChange={(value) => setMode(value as RequestMode)}
								items={modes().map((option) => ({
									value: option.value,
									label: option.label,
								}))}
							/>
						</Show>
						<Show when={mode() !== "now"}>
							<Show when={mode() === "existing"}>
								<Select
									id="existing-request"
									name="request"
									label={T()("requests.mode.existing.select")}
									value={existingId()}
									options={eligible().map((request) => ({
										value: request.id,
										label: request.title,
									}))}
									onChange={(value) => {
										if (typeof value === "number") setExistingId(value);
									}}
								/>
								<Show
									when={
										eligible().find((request) => request.id === existingId())
											?.approved
									}
								>
									<p class="text-xs text-warning">
										{T()("requests.documents.add.approved")}
									</p>
								</Show>
							</Show>
							<RequestCreateFields
								showTitle={mode() === "request"}
								collection={props.collection}
								document={props.document}
								title={title()}
								onTitleChange={setTitle}
								source={props.source}
								targets={targets()}
								onTargetsChange={setTargets}
							/>
						</Show>
					</div>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage theme="basic" message={error()} />
					<Modal.Actions>
						<Button variant="outline" onClick={() => props.setOpen(false)}>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							loading={loading()}
							disabled={
								mode() === "now"
									? props.target === null
									: (mode() === "request"
											? !title().trim()
											: existingId() === undefined) || targets().length === 0
							}
						>
							{mode() === "now"
								? T()("requests.mode.now")
								: T()(
										mode() === "existing"
											? "requests.documents.add"
											: "requests.create",
									)}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default ReleaseEnvironmentModal;
