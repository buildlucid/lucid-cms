import { useNavigate } from "@solidjs/router";
import type { Collection, RequestSummary } from "@types";
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
import RequestSelectDrawer from "@/components/RequestSelectDrawer/RequestSelectDrawer";
import Tabs from "@/components/Tabs/Tabs";
import api from "@/services/api";
import T from "@/translations";
import { getTargetLabel } from "@/utils/requests";
import { getRequestRoute } from "@/utils/route-helpers";
import { RequestPickerField } from "./parts/RequestPickerField";

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
	const [existing, setExisting] = createSignal<RequestSummary>();
	const [pickerOpen, setPickerOpen] = createSignal(false);
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

	//* one row is enough to know whether adding to a request is an option
	const addable = api.requests.useGetMultiple({
		queryParams: {
			filters: {
				addable: () =>
					`${props.document.collectionKey}:${props.document.documentId}`,
			},
			perPage: 1,
		},
		enabled: () => props.open,
	});
	const add = api.requests.useAddDocuments({
		onSuccess: () => {
			const request = existing();
			props.setOpen(false);
			if (request) navigate(getRequestRoute({ requestId: request.id }));
		},
	});

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
				(option.value !== "existing" || (addable.data?.meta.total ?? 0) > 0),
		),
	);
	const heading = createMemo(() => {
		const values = { environment: environment() };
		switch (mode()) {
			case "now":
				return {
					title: T()("modals.release.environment.title", values),
					description: T()("requests.mode.now.description", values),
				};
			case "request":
				return {
					title: T()("requests.mode.request"),
					description: T()("requests.mode.request.description", values),
				};
			case "existing":
				return {
					title: T()("requests.mode.existing"),
					description: T()("requests.mode.existing.description", values),
				};
		}
	});
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
			setExisting(undefined);
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
			const request = existing();
			if (request) {
				add.action.mutate({ id: request.id, body: { documents: [document] } });
			}
			return;
		}
		create.action.mutate({
			body: { type: "publish", title: title(), documents: [document] },
		});
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
						onChange={(value) => setMode(value as RequestMode)}
						items={modes().map((option) => ({
							value: option.value,
							label: option.label,
						}))}
					/>
				</Show>
			}
		>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					void submit();
				}}
			>
				<Modal.Header>
					<Modal.Title>{heading().title}</Modal.Title>
					<Modal.Description>{heading().description}</Modal.Description>
				</Modal.Header>
				<Show when={mode() !== "now"}>
					<Modal.Body>
						<div class="grid gap-4">
							<Show when={mode() === "existing"}>
								<RequestPickerField
									request={existing()}
									onOpen={() => setPickerOpen(true)}
									onClear={() => setExisting(undefined)}
								/>
								<Show when={existing()?.approved}>
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
						</div>
					</Modal.Body>
				</Show>
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
											: existing() === undefined) || targets().length === 0
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
			<RequestSelectDrawer
				state={{
					open: pickerOpen(),
					setOpen: setPickerOpen,
					document: props.document,
					selected: existing(),
				}}
				callbacks={{ onSelect: setExisting }}
			/>
		</Modal.Root>
	);
};

export default ReleaseEnvironmentModal;
