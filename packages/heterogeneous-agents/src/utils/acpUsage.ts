import { isRecord } from '@lobechat/utils/object';

import type { UsageData } from '../types';

const finiteNonNegativeNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

const firstNumber = (value: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const number = finiteNonNegativeNumber(value[key]);
    if (number !== undefined) return number;
  }
};

const readUsdCost = (value: unknown): number | undefined => {
  const direct = finiteNonNegativeNumber(value);
  if (direct !== undefined) return direct;
  if (!isRecord(value) || value.currency !== 'USD') return;
  return finiteNonNegativeNumber(value.amount);
};

/**
 * Normalize the token vocabulary shared by ACP prompt responses and common
 * vendor extensions into the message usage shape persisted by LobeHub.
 */
export const toAcpUsageData = (
  usage: unknown,
  reportedCost?: unknown,
): UsageData | undefined => {
  if (!isRecord(usage)) return;

  const input = firstNumber(usage, ['inputTokens', 'input_tokens']) ?? 0;
  const output = firstNumber(usage, ['outputTokens', 'output_tokens']) ?? 0;
  const cached =
    firstNumber(usage, [
      'cacheReadInputTokens',
      'cachedReadTokens',
      'cache_read_input_tokens',
    ]) ?? 0;
  const cacheCreation =
    firstNumber(usage, [
      'cacheCreationInputTokens',
      'cacheCreationTokens',
      'cachedWriteTokens',
      'cache_creation_input_tokens',
    ]) ?? 0;
  const reasoning = Math.min(
    output,
    firstNumber(usage, [
      'reasoningTokens',
      'reasoning_tokens',
      'thoughtTokens',
      'thought_tokens',
    ]) ?? 0,
  );
  const totalInputTokens = Math.max(input, cached + cacheCreation);
  const totalOutputTokens = output;
  const totalTokens =
    firstNumber(usage, ['totalTokens', 'total_tokens']) ??
    totalInputTokens + totalOutputTokens;
  const cost = readUsdCost(reportedCost ?? usage.cost);

  if (totalTokens === 0 && cost === undefined) return;

  return {
    ...(cost === undefined ? {} : { cost }),
    inputCachedTokens: cached || undefined,
    inputCacheMissTokens: Math.max(0, totalInputTokens - cached - cacheCreation),
    inputWriteCacheTokens: cacheCreation || undefined,
    outputReasoningTokens: reasoning || undefined,
    outputTextTokens: Math.max(0, output - reasoning) || undefined,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
  };
};
