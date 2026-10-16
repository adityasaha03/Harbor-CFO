import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { AssistantMessage } from '../components/assistant-message';

describe('F12 AssistantMessage Component', () => {
  it('strictly escapes text and prevents execution of <script> and <img onerror> payloads', () => {
    const maliciousPayload =
      "<script>alert('pwned')</script> Hello world! <img src='x' onerror='alert(1)' />";

    const { container } = render(
      <AssistantMessage
        content={maliciousPayload}
        mode="live"
        status="completed"
      />,
    );

    // Verify script tags are not created in the DOM
    expect(container.querySelector('script')).toBeNull();
    // Verify img tags are not created in the DOM
    expect(container.querySelector('img')).toBeNull();

    // Verify that the payload is rendered literally as plain text
    const answerEl = screen.getByTestId('assistant-answer');
    expect(answerEl.textContent).toContain(
      "<script>alert('pwned')</script> Hello world! <img src='x' onerror='alert(1)' />",
    );
  });

  it('displays ModeBadge correctly for live and replay runs', () => {
    const { rerender } = render(
      <AssistantMessage
        content="Baseline forecast computed."
        mode="live"
        status="completed"
      />,
    );
    expect(screen.getByText('Live model')).toBeDefined();

    rerender(
      <AssistantMessage
        content="Replay sequence completed."
        mode="replay"
        status="completed"
      />,
    );
    expect(screen.getByText('Scripted replay')).toBeDefined();
  });

  it('displays Fallback summary banner when fallbackUsed is true', () => {
    render(
      <AssistantMessage
        content="Synthetic fallback cash estimate."
        mode="live"
        status="completed"
        fallbackUsed={true}
      />,
    );

    expect(
      screen.getByText('Fallback summary (model unavailable)'),
    ).toBeDefined();
  });

  it('displays timeout notice when status is timeout', () => {
    render(
      <AssistantMessage
        content="Partial summary before timeout."
        mode="live"
        status="timeout"
      />,
    );

    expect(
      screen.getByText(/Run timed out. A fallback summary has been generated below./i),
    ).toBeDefined();
  });

  it('renders EvidenceChips pointing to the corresponding screens', () => {
    render(
      <AssistantMessage
        content="Forecast gap verified against Day 21."
        mode="live"
        status="completed"
        evidenceRefs={[
          'forecast:2026-11-10',
          'invoice:INV-001',
          'offer:REV-SHARE-01',
          'scenario:SCN-OPTIMISTIC',
        ]}
      />,
    );

    expect(screen.getByText('Grounding Evidence (4):')).toBeDefined();
    expect(screen.getByText('Forecast 2026-11-10')).toBeDefined();
    expect(screen.getByText('Invoice INV-001')).toBeDefined();
    expect(screen.getByText('Financing Offer REV-SHARE-01')).toBeDefined();
    expect(screen.getByText('Scenario SCN-OPTIMISTIC')).toBeDefined();
  });

  it('renders ProposalLinkCard with Owner approval notice when proposalIds is present', () => {
    render(
      <AssistantMessage
        content="Created working capital proposal."
        mode="live"
        status="completed"
        proposalIds={['prop_abc123']}
      />,
    );

    expect(screen.getByText(/Action Proposal Created/i)).toBeDefined();
    expect(screen.getByText(/Waiting for Owner approval/i)).toBeDefined();
    expect(screen.getByText('Review in Actions')).toBeDefined();
    expect(screen.getByText('ID: prop_abc123')).toBeDefined();
  });
});
