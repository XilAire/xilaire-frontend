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