import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
	getUser: vi.fn(),
	upload: vi.fn(),
	remove: vi.fn(),
	insert: vi.fn(),
}));
vi.mock("@/lib/auth/recordlyAuth", () => ({
	recordlyAuth: {
		auth: { getUser: api.getUser },
		storage: { from: () => ({ upload: api.upload, remove: api.remove }) },
		from: () => ({ insert: api.insert }),
	},
}));
import { submitFeedback } from "./submitFeedback";
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
	api.upload.mockResolvedValue({ error: null });
	api.insert.mockResolvedValue({ error: null });
	api.remove.mockResolvedValue({ error: null });
});
it("stores a report only after its private attachments upload", async () => {
	await submitFeedback(input);
	expect(api.upload).toHaveBeenCalledOnce();
	expect(api.insert).toHaveBeenCalledWith(
		expect.objectContaining({
			user_id: "user-id",
			title: "Bug",
			message: "Steps",
			attachments: [expect.objectContaining({ name: "notes.txt" })],
		}),
	);
	expect(api.remove).not.toHaveBeenCalled();
});
it("cleans uploaded attachments up when the report is rejected", async () => {
	api.insert.mockResolvedValue({ error: new Error("unavailable") });
	await expect(submitFeedback(input)).rejects.toThrow("unavailable");
	expect(api.remove).toHaveBeenCalledWith([expect.stringMatching(/^user-id\//)]);
});
it("does not upload when the account session has expired", async () => {
	api.getUser.mockResolvedValue({ data: { user: null }, error: null });
	await expect(submitFeedback(input)).rejects.toThrow("sign in");
	expect(api.upload).not.toHaveBeenCalled();
});
