# Desktop feedback

Apply `migrations/202609230001_feedback.sql` in the Supabase SQL editor for the project configured by `VITE_SUPABASE_URL` before releasing this feature. The desktop client uses its existing signed-in session; never put a service-role key in the app.

Feedback is stored in `public.feedback_reports`. View reports through the Supabase dashboard and retrieve attachments from the private `feedback-attachments` bucket using each report's attachment paths. There is no email notification or public issue creation. Owners can read their own reports; other users cannot. Staff use server-side service-role access.

On submission, the modal captures up to 100 recent renderer warnings/errors (2,000 characters each), browser/platform details, and a timestamp. Common secrets, URLs, emails, and local home paths are redacted. Arbitrary log objects are not serialized. Diagnostics are automatically included with each submission. Native-process logs are not collected. Attachments are chosen explicitly, up to five files and 10 MB total in the client, with a 10 MB per-object storage limit.

A local demo account can preview the form but cannot submit without a real Supabase session. Failed submissions retain the draft in memory; closing and reopening the same modal keeps it, but restarting the app does not. Failed uploads are cleaned up on a best-effort basis; periodically remove unattached objects left by interrupted sessions.
