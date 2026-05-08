import { AppSettings } from '../models/types';

export const TRIAL_DAYS = 3;
export const FORCE_EXPIRED_ACCESS_FOR_TEST = true;

export type AccessStatus =
  | { active: true; type: 'trial' | 'subscription'; days: number }
  | { active: false; type: 'none'; days: 0 };

const getTime = (value?: string) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

export const getAccessStatus = (settings: AppSettings, now = Date.now(), trialDays = TRIAL_DAYS): AccessStatus => {
  if (FORCE_EXPIRED_ACCESS_FOR_TEST) {
    return { active: false, type: 'none', days: 0 };
  }

  const subscriptionExpiry = getTime(settings.subscriptionExpiry);

  if (subscriptionExpiry > now) {
    return {
      active: true,
      type: 'subscription',
      days: Math.max(0, Math.ceil((subscriptionExpiry - now) / (1000 * 60 * 60 * 24))),
    };
  }

  const trialStart = getTime(settings.trialStartedAt);
  const trialExpiry = trialStart + trialDays * 24 * 60 * 60 * 1000;

  if (trialStart > 0 && trialExpiry > now) {
    return {
      active: true,
      type: 'trial',
      days: Math.max(0, Math.ceil((trialExpiry - now) / (1000 * 60 * 60 * 24))),
    };
  }

  return { active: false, type: 'none', days: 0 };
};
