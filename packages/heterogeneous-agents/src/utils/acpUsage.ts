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
  const value = isRecord(usage) ? usage : {};
  const cost = readUsdCost(reportedCost ?? value.cost);
  if (!isRecord(usage) && cost === undefined) return;

  const input = firstNumber(value, ['inputTokens', 'input_tokens']) ?? 0;
  const output = firstNumber(value, ['outputTokens', 'output_tokens']) ?? 0;
  const cached =
    firstNumber(value, [
      'cacheReadInputTokens',
      'cachedReadTokens',
      'cache_read_input_tokens',
    ]) ?? 0;
  const cacheCreation =
    firstNumber(value, [
      'cacheCreationInputTokens',
      'cacheCreationTokens',
      'cachedWriteTokens',
      'cache_creation_input_tokens',
    ]) ?? 0;
  const reasoning = Math.min(
    output,
    firstNumber(value, [
      'reasoningTokens',
      'reasoning_tokens',
      'thoughtTokens',
      'thought_tokens',
    ]) ?? 0,
  );
  const totalInputTokens = Math.max(input, cached + cacheCreation);
  const totalOutputTokens = output;
  const totalTokens =
    firstNumber(value, ['totalTokens', 'total_tokens']) ??
    totalInputTokens + totalOutputTokens;

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
