import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ getUser: vi.fn(), invoke: vi.fn() }));
vi.mock("@/lib/auth/recordlyAuth", () => ({
	recordlyAuth: { auth: { getUser: api.getUser }, functions: { invoke: api.invoke } },
}));
import { feedbackErrorMessage, submitFeedback } from "./submitFeedback";
const input = {
	title: " Bug ",
	subject: "bug",
	message: " Steps ",
	files: [new File(["notes"], "notes.txt")],
	logs: "logs",
};
beforeEach(() => {
	vi.resetAllMocks();
	api.getUser.mockResolvedValue({ data: { user: { id: "user-id" } }, error: null });
	api.invoke.mockResolvedValue({ data: { success: true }, error: null });
});
it("submits attachments and diagnostics through the server endpoint", async () => {
	await submitFeedback(input);
	const [name, { body }] = api.invoke.mock.calls[0];
	expect(name).toBe("submit-feedback");
	expect(body.get("title")).toBe("Bug");
	expect(body.get("message")).toBe("Steps");
	expect(body.get("logs")).toBe("logs");
	expect(body.getAll("files")[0].name).toBe("notes.txt");
});
it("does not submit when the session has expired and explains how to recover", async () => {
	api.getUser.mockResolvedValue({ data: { user: null }, error: null });
	const error = await submitFeedback(input).catch((error) => error);
	expect(feedbackErrorMessage(error)).toContain("sign in again");
	expect(api.invoke).not.toHaveBeenCalled();
});
it("shows the server quota error without exposing internal errors", async () => {
	api.invoke.mockResolvedValue({
		error: {
			context: new Response(JSON.stringify({ code: "FEEDBACK_LIMIT" }), { status: 429 }),
		},
	});
	const error = await submitFeedback(input).catch((error) => error);
	expect(feedbackErrorMessage(error)).toContain("tomorrow");
	expect(feedbackErrorMessage(new Error("database private details"))).toBe(
		"Could not send feedback. Please try again.",
	);
});
it("rejects unconfirmed submissions", async () => {
	api.invoke.mockResolvedValue({ data: {}, error: null });
	await expect(submitFeedback(input)).rejects.toThrow("not confirmed");
});
