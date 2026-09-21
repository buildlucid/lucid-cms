import type { User } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import PendingEmailChangeNotice from "@/components/PendingEmailChangeNotice/PendingEmailChangeNotice";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";

interface UpdateAccountDetailsProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	data: {
		firstName?: string;
		lastName?: string;
		username?: string;
		email?: string;
		pendingEmailChange?: User["pendingEmailChange"];
	};
	emailChange: {
		isLoading: boolean;
		onCancel: () => void;
	};
}

const UpdateAccountDetailsModal: Component<UpdateAccountDetailsProps> = (
	props,
) => {
	// ----------------------------------------
	// State
	const [firstName, setFirstName] = createSignal(props.data.firstName);
	const [lastName, setLastName] = createSignal(props.data.lastName);
	const [username, setUsername] = createSignal(props.data.username ?? "");
	const [email, setEmail] = createSignal(props.data.email ?? "");

	// ----------------------------------------
	// Mutations
	const updateMe = api.account.useUpdateMe({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Memos
	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				firstName: props.data.firstName,
				lastName: props.data.lastName,
				username: props.data.username,
				email: props.data.email,
			},
			{
				firstName: firstName(),
				lastName: lastName(),
				username: username(),
				email: email(),
			},
		);
	});
	const submitIsDisabled = createMemo(() => !updateData().changed);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;

		setFirstName(props.data.firstName);
		setLastName(props.data.lastName);
		setUsername(props.data.username ?? "");
		setEmail(props.data.email ?? "");
		updateMe.reset();
	});

	// ----------------------------------------
	// Handlers
	const closeModal = () => {
		props.state.setOpen(false);
		updateMe.reset();
	};

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.state.open} onOpenChange={props.state.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					updateMe.action.mutate(updateData().data);
				}}
			>
				<Modal.Header>
					<Modal.Title>{T()("account.details.edit.title")}</Modal.Title>
					<Modal.Description>
						{T()("account.details.edit.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body class="flex flex-col gap-3">
					{/* Fields */}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Input
							id="account-first-name"
							name="firstName"
							type="text"
							value={firstName() ?? ""}
							onChange={setFirstName}
							label={T()("common.first.name")}
							errors={getBodyError("firstName", updateMe.errors)}
						/>
						<Input
							id="account-last-name"
							name="lastName"
							type="text"
							value={lastName() ?? ""}
							onChange={setLastName}
							label={T()("common.last.name")}
							errors={getBodyError("lastName", updateMe.errors)}
						/>
					</div>
					<div>
						<Input
							id="account-username"
							name="username"
							type="text"
							value={username()}
							onChange={setUsername}
							label={T()("common.username")}
							required={true}
							errors={getBodyError("username", updateMe.errors)}
						/>
					</div>
					<div>
						<Input
							id="account-email"
							name="email"
							type="email"
							value={email()}
							onChange={setEmail}
							label={T()("common.email")}
							required={true}
							errors={getBodyError("email", updateMe.errors)}
						/>
						<p class="mt-2 text-xs text-body">
							{T()("account.email.change.edit.description")}
						</p>
					</div>

					{/* Pending email change */}
					<Show when={props.data.pendingEmailChange}>
						{(pendingEmailChange) => (
							<div>
								<PendingEmailChangeNotice
									email={pendingEmailChange().email}
									isLoading={props.emailChange.isLoading}
									onCancel={props.emailChange.onCancel}
								/>
							</div>
						)}
					</Show>

					{/* Error */}
					<ErrorMessage theme="basic" message={updateMe.errors()?.message} />
				</Modal.Body>

				<Modal.Footer>
					<Modal.Actions>
						<Button
							type="button"
							variant="outline"
							size="md"
							disabled={updateMe.action.isPending}
							onClick={closeModal}
						>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							variant="primary"
							size="md"
							loading={updateMe.action.isPending}
							disabled={submitIsDisabled()}
						>
							{T()("common.update")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default UpdateAccountDetailsModal;
