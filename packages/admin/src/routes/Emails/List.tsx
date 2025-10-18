import T from "@/translations";
import type { Component } from "solid-js";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import { QueryRow } from "@/components/Groups/Query";
import { Wrapper } from "@/components/Groups/Layout";
import { Standard } from "@/components/Groups/Headers";
import { EmailsList } from "@/components/Groups/Content";
import { useQueryClient } from "@tanstack/solid-query";

const EmailListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useSearchParamsLocation(
		{
			filters: {
				toAddress: {
					value: "",
					type: "text",
				},
				subject: {
					value: "",
					type: "text",
				},
				template: {
					value: "",
					type: "text",
				},
				currentStatus: {
					value: "",
					type: "array",
				},
				type: {
					value: "",
					type: "array",
				},
			},
			sorts: {
				createdAt: undefined,
				lastAttemptedAt: "desc",
				attemptCount: undefined,
			},
		},
		{
			singleSort: true,
		},
	);

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("email_route_title"),
							description: T()("email_route_description"),
						}}
						slots={{
							bottom: (
								<QueryRow
									searchParams={searchParams}
									onRefresh={() => {
										queryClient.invalidateQueries({
											queryKey: ["email.getMultiple"],
										});
									}}
									filters={[
										{
											label: T()("to"),
											key: "toAddress",
											type: "text",
										},
										{
											label: T()("subject"),
											key: "subject",
											type: "text",
										},
										{
											label: T()("template"),
											key: "template",
											type: "text",
										},
										{
											label: T()("status"),
											key: "currentStatus",
											type: "multi-select",
											options: [
												{
													label: T()("sent"),
													value: "sent",
												},
												{
													label: T()("delivered"),
													value: "delivered",
												},
												{
													label: T()("failed"),
													value: "failed",
												},
												{
													label: T()("delayed"),
													value: "delayed",
												},
												{
													label: T()("complained"),
													value: "complained",
												},
												{
													label: T()("bounced"),
													value: "bounced",
												},
												{
													label: T()("clicked"),
													value: "clicked",
												},
												{
													label: T()("opened"),
													value: "opened",
												},
												{
													label: T()("scheduled"),
													value: "scheduled",
												},
											],
										},
										{
											label: T()("type"),
											key: "type",
											type: "multi-select",
											options: [
												{
													label: T()("internal"),
													value: "internal",
												},
												{
													label: T()("external"),
													value: "external",
												},
											],
										},
									]}
									sorts={[
										{
											label: T()("attempt_count"),
											key: "attemptCount",
										},
										{
											label: T()("last_attempt_at"),
											key: "lastAttemptedAt",
										},
										{
											label: T()("created_at"),
											key: "createdAt",
										},
									]}
									perPage={[]}
								/>
							),
						}}
					/>
				),
			}}
		>
			<EmailsList
				state={{
					searchParams: searchParams,
				}}
			/>
		</Wrapper>
	);
};

export default EmailListRoute;
