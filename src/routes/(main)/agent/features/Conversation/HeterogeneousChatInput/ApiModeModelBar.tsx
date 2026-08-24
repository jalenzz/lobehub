'use client';

import type { HeterogeneousApiConfig } from '@lobechat/types';
import { applyTopicModelToHeterogeneousProvider } from '@lobechat/types';
import { memo, useMemo } from 'react';

import { useProviderBindingCompatibleProviders } from '@/features/HeterogeneousAgent/hooks/useProviderBinding';
import ModelSelect from '@/features/ModelSelect';
import { useAgentStore } from '@/store/agent';
import { agentByIdSelectors } from '@/store/agent/selectors';
import { useChatStore } from '@/store/chat';
import { topicSelectors } from '@/store/chat/slices/topic/selectors';

interface ApiModeModelBarProps {
  agentId: string;
}

const ApiModeModelBar = memo<ApiModeModelBarProps>(({ agentId }) => {
  const agencyConfig = useAgentStore(agentByIdSelectors.getAgencyConfigById(agentId));
  const updateAgentConfigById = useAgentStore((state) => state.updateAgentConfigById);
  const heterogeneousProvider = agencyConfig?.heterogeneousProvider;
  const activeTopicId = useChatStore((state) => state.activeTopicId);
  const topicModel = useChatStore(topicSelectors.activeTopicModel);
  const updateTopicModel = useChatStore((state) => state.updateTopicModel);
  const { providers } = useProviderBindingCompatibleProviders(heterogeneousProvider?.type);
  const providerIds = useMemo(() => providers.map(({ id }) => id), [providers]);

  if (
    !heterogeneousProvider ||
    heterogeneousProvider.authMode !== 'api' ||
    providerIds.length === 0
  )
    return null;

  const effectiveProvider = applyTopicModelToHeterogeneousProvider(
    heterogeneousProvider,
    topicModel,
  );

  const persist = async (apiConfig: HeterogeneousApiConfig) => {
    if (activeTopicId) {
      await updateTopicModel(activeTopicId, {
        model: apiConfig.model,
        provider: apiConfig.providerId,
      });
      return;
    }

    await updateAgentConfigById(agentId, {
      agencyConfig: {
        ...agencyConfig,
        heterogeneousProvider: { ...heterogeneousProvider, apiConfig },
      },
    });
  };

  return (
    <ModelSelect
      initialWidth
      popupWidth={360}
      providerIds={providerIds}
      size="small"
      variant="borderless"
      value={
        effectiveProvider.apiConfig
          ? {
              model: effectiveProvider.apiConfig.model,
              provider: effectiveProvider.apiConfig.providerId,
            }
          : undefined
      }
      onChange={({ model, provider }) => {
        const smallFastModel =
          heterogeneousProvider.apiConfig?.providerId === provider
            ? heterogeneousProvider.apiConfig.smallFastModel
            : undefined;
        void persist({ model, providerId: provider, smallFastModel });
      }}
    />
  );
});

ApiModeModelBar.displayName = 'ApiModeModelBar';

export default ApiModeModelBar;
