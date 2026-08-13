import "server-only";

import type {
  CaseBudgetAiRequest,
  CaseBudgetAiUsagePeriod,
  CaseBudgetSubscription,
} from "@/types/subscription";

export type SubscriptionRepositoryUserScope = {
  userId:
    string;

  workspaceId?:
    string | null;
};

export type FindSubscriptionInput =
  SubscriptionRepositoryUserScope;

export type FindAiUsagePeriodInput =
  SubscriptionRepositoryUserScope & {
    subscriptionId?:
      string | null;

    periodStart:
      string;

    periodEnd:
      string;
  };

export type FindWorkspaceAiUsageAggregateInput = {
  workspaceId:
    string;

  subscriptionId:
    string;

  periodStart:
    string;

  periodEnd:
    string;
};

export type WorkspaceAiUsageAggregate = {
  workspaceId:
    string;

  subscriptionId:
    string;

  periodStart:
    string;

  periodEnd:
    string;

  successfulQuestionsUsed:
    number;

  inputTokens:
    number;

  cachedInputTokens:
    number;

  outputTokens:
    number;

  totalTokens:
    number;

  estimatedCostUsd:
    number;
};

export type SaveSubscriptionInput = {
  subscription:
    CaseBudgetSubscription;
};

export type SaveAiUsagePeriodInput = {
  usagePeriod:
    CaseBudgetAiUsagePeriod;
};

export type SaveAiRequestInput = {
  request:
    CaseBudgetAiRequest;
};

export type SubscriptionRepository = {
  findSubscription:
    (
      input:
        FindSubscriptionInput,
    ) =>
      Promise<
        CaseBudgetSubscription | null
      >;

  findAiUsagePeriod:
    (
      input:
        FindAiUsagePeriodInput,
    ) =>
      Promise<
        CaseBudgetAiUsagePeriod | null
      >;

  findWorkspaceAiUsageAggregate:
    (
      input:
        FindWorkspaceAiUsageAggregateInput,
    ) =>
      Promise<
        WorkspaceAiUsageAggregate
      >;

  saveSubscription:
    (
      input:
        SaveSubscriptionInput,
    ) =>
      Promise<
        CaseBudgetSubscription
      >;

  saveAiUsagePeriod:
    (
      input:
        SaveAiUsagePeriodInput,
    ) =>
      Promise<
        CaseBudgetAiUsagePeriod
      >;

  saveAiRequest:
    (
      input:
        SaveAiRequestInput,
    ) =>
      Promise<
        CaseBudgetAiRequest
      >;
};

let repository:
  SubscriptionRepository | null =
  null;

export function configureSubscriptionRepository(
  nextRepository:
    SubscriptionRepository,
) {
  repository =
    nextRepository;
}

export function getSubscriptionRepository() {
  if (
    !repository
  ) {
    throw new Error(
      "Subscription repository has not been configured.",
    );
  }

  return repository;
}

export function isSubscriptionRepositoryConfigured() {
  return repository !==
    null;
}