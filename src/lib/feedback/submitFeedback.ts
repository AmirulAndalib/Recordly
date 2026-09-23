import { recordlyAuth } from "@/lib/auth/recordlyAuth";

export const MAX_FILES = 5;
export const MAX_BYTES = 10 * 1024 * 1024;
export function validateAttachments(files: File[]) {
	if (files.length > MAX_FILES) return "Attach up to 5 files.";
	if (files.some((file) => file.size === 0)) return "Empty files cannot be attached.";
	if (files.reduce((total, file) => total + file.size, 0) > MAX_BYTES)
		return "Attachments must total 10 MB or less.";
	return null;
}
export async function submitFeedback(input: {
	title: string;
	subject: string;
	message: string;
	files: File[];
	logs: string | null;
}) {
	const client = recordlyAuth;
	if (!client) throw new Error("Feedback is unavailable until account services are configured.");
	const { data, error } = await client.auth.getUser();
	if (error || !data.user) throw new Error("Please sign in again to send feedback.");
	const validation = validateAttachments(input.files);
	if (validation) throw new Error(validation);
	const id = crypto.randomUUID();
	const uploaded: string[] = [];
	const attachments = [];
	try {
		for (const file of input.files) {
			const path = `${data.user.id}/${id}/${crypto.randomUUID()}`;
			const { error: uploadError } = await client.storage
				.from("feedback-attachments")
				.upload(path, file, { contentType: "application/octet-stream" });
			if (uploadError) throw uploadError;
			uploaded.push(path);
			attachments.push({ path, name: file.name, size: file.size, type: file.type });
		}
		const { error: insertError } = await client.from("feedback_reports").insert({
			id,
			user_id: data.user.id,
			title: input.title.trim(),
			subject: input.subject,
			message: input.message.trim(),
			logs: input.logs,
			attachments,
		});
		if (insertError) throw insertError;
	} catch (error) {
		if (uploaded.length)
			await client.storage
				.from("feedback-attachments")
				.remove(uploaded)
				.catch(() => undefined);
		throw error;
	}
}
