# F12 Agent chat and live activity timeline

Depends: F04, B16. Priority: P0. Read first: B15/B16 specs; API_REFERENCE.md (agent, events stream).

## Goal

A copilot chat whose every step is visible: which tools ran, with what inputs, how long they took, and what evidence the answer used. The agent can create a proposal but never approve one.

## Files

- `src/app/(app)/agent/page.tsx`
- `src/features/agent/components/`: `agent-workspace.tsx`, `chat-input.tsx`, `message-list.tsx`, `assistant-message.tsx`, `suggested-prompts.tsx`, `activity-timeline.tsx`, `timeline-item.tsx`, `evidence-chips.tsx`, `mode-badge.tsx`, `style-toggle.tsx`, `proposal-link-card.tsx`
- `src/features/agent/api/`: `use-start-run.ts`, `use-run.ts`, `use-runs.ts`
- `src/features/agent/hooks/use-run-events.ts` (filters the shared SSE stream by `runId`)

## Specification

- Layout: conversation on the left, activity timeline on the right (stacked on small screens).
- Input: up to 1000 characters; style toggle `standard | plain`; suggested prompts: "What is causing the cash gap?", "Which overdue invoices matter most?", "Compare my financing options", "Propose the best way to close the gap".
- Flow: `POST /agent/runs` returns `runId` (202); the timeline shows `tool.started` and `tool.completed` events for that run in order with tool name, sanitized args (collapsed by default), duration and a status icon; the final answer appears when `run.completed` arrives (fetch `GET /agent/runs/:id`). If the stream is delayed, poll the run every 2 s as a fallback.
- Mode badge on each run: "Live model" or "Scripted replay". Never hide replay.
- Assistant message: render text as plain text with preserved line breaks (no HTML, no raw Markdown rendering). Evidence chips list the referenced forecast run, invoices, offers; clicking opens the relevant screen. If the run created a proposal, show `ProposalLinkCard` linking to `/actions` with the note "Waiting for Owner approval".
- States: rate limited (429, show retry time), failed run with fallback summary clearly labelled "Fallback summary (model unavailable)", timeout.
- Reviewers see the page disabled with a read-only notice (no `agent:use`).
- Past runs list (`GET /agent/runs`) in a sidebar.

## Tasks

- [x] Chat UI, suggested prompts, style toggle, mode badge
- [x] Timeline driven by SSE events filtered by `runId`, with polling fallback
- [x] Evidence chips and proposal link card
- [x] Failed, fallback, timeout and rate-limit states
- [x] Text rendering is escaped (test with `<script>` and `<img onerror>` payloads in an answer)
- [x] RTL tests with a mocked event stream (order of timeline items, completion)
- [x] Master plan row F12 set to `[x]`
