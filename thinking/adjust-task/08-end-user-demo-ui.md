## 08) End-User Demo Chat UI

### Objective
Provide a minimal chat-like UI for end users to call `/answer` with tenant selection and language auto-detect.

### Route
- `/demo` (outside admin)

### Features
- Input box with send, message list, loading state
- Tenant selector (dropdown) and language auto-detect (or dropdown override)
- Show citations (title/url) per answer policy; hide raw errors with request_id reference

### Backend
- Use `POST /answer` endpoint; handle timeouts/retries gracefully; display request_id on failure

### Acceptance
- Working demo capable of sending queries and showing responses with citations

