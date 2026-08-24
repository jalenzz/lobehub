import { describe, expect, it } from 'vitest';

import { toAcpUsageData } from './acpUsage';

describe('toAcpUsageData', () => {
  it('normalizes ACP prompt usage and an authoritative USD cost', () => {
    expect(
      toAcpUsageData(
        {
          cachedReadTokens: 500,
          cachedWriteTokens: 100,
          inputTokens: 1000,
          outputTokens: 250,
          thoughtTokens: 50,
          totalTokens: 1250,
        },
        { amount: 0.0125, currency: 'USD' },
      ),
    ).toEqual({
      cost: 0.0125,
      inputCachedTokens: 500,
      inputCacheMissTokens: 400,
      inputWriteCacheTokens: 100,
      outputReasoningTokens: 50,
      outputTextTokens: 200,
      totalInputTokens: 1000,
      totalOutputTokens: 250,
      totalTokens: 1250,
    });
  });

  it('supports snake-case vendor fields without inventing non-USD cost', () => {
    expect(
      toAcpUsageData(
        {
          cache_read_input_tokens: 20,
          input_tokens: 100,
          output_tokens: 10,
          reasoning_tokens: 4,
        },
        { amount: 1, currency: 'EUR' },
      ),
    ).toEqual({
      inputCachedTokens: 20,
      inputCacheMissTokens: 80,
      inputWriteCacheTokens: undefined,
      outputReasoningTokens: 4,
      outputTextTokens: 6,
      totalInputTokens: 100,
      totalOutputTokens: 10,
      totalTokens: 110,
    });
  });

  it('omits empty and malformed usage', () => {
    expect(toAcpUsageData(undefined)).toBeUndefined();
    expect(toAcpUsageData({ inputTokens: -1, outputTokens: Number.NaN })).toBeUndefined();
  });

  it('keeps an authoritative cost when ACP does not report token usage', () => {
    expect(toAcpUsageData(undefined, { amount: 0.05, currency: 'USD' })).toMatchObject({
      cost: 0.05,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
    });
  });
});
