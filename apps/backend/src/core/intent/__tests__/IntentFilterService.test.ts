import { describe, it, expect } from 'vitest';
import { IntentFilterService } from '../IntentFilterService';

describe('IntentFilterService strategy selection', () => {
  const svc = new IntentFilterService();

  it('scope_only', async () => {
    const r = await svc.filterContextsByIntent('t', 'q', { scope: 'a' }, {});
    expect(r.filtering_strategy).toBe('scope_only');
  });

  it('action_only', async () => {
    const r = await svc.filterContextsByIntent('t', 'q', { action: 'a' }, {});
    expect(r.filtering_strategy).toBe('action_only');
  });

  it('scope_and_action', async () => {
    const r = await svc.filterContextsByIntent('t', 'q', { scope: 'a', action: 'b' }, {});
    expect(r.filtering_strategy).toBe('scope_and_action');
  });

  it('combined', async () => {
    const r = await svc.filterContextsByIntent('t', 'q', { detail: 'more' }, {});
    expect(r.filtering_strategy).toBe('combined');
  });

  it('text_only', async () => {
    const r = await svc.filterContextsByIntent('t', 'q', {}, {});
    expect(r.filtering_strategy).toBe('text_only');
  });
});


