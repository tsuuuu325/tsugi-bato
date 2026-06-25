import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_AVATAR } from '@/types';
import type { UserProfile, UserPlan } from '@/types';

const PROFILE_KEY = 'tsugi-bato-profile';

function billingPlanLocked(): boolean {
  return import.meta.env.VITE_BILLING_ENABLED === 'true';
}

function normalizePlan(raw: Partial<UserProfile>): UserPlan {
  if (billingPlanLocked()) return 'free';
  return raw.plan === 'pro' ? 'pro' : 'free';
}

/** 課金 ON 時に localStorage に残った plan:pro を即削除 */
function migrateStaleProPlan(raw: Partial<UserProfile>): void {
  if (!billingPlanLocked() || raw.plan !== 'pro') return;
  saveJson(PROFILE_KEY, { ...raw, plan: 'free' });
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/** 端末固定のアカウントID（名前変更しても不変） */
export function ensureDeviceId(): string {
  const profile = loadJson<Partial<UserProfile>>(PROFILE_KEY, {});
  if (profile.deviceId) return profile.deviceId;
  const deviceId = uuidv4();
  saveJson(PROFILE_KEY, {
    deviceId,
    username: profile.username?.trim() ?? '',
    avatarEmoji: profile.avatarEmoji || DEFAULT_AVATAR,
    locale: profile.locale,
    plan: normalizePlan(profile),
    dailyContributions: profile.dailyContributions,
    dailyLayerSessions: profile.dailyLayerSessions,
    dailyExtendSessions: profile.dailyExtendSessions,
    billingEmail: profile.billingEmail,
    billingName: profile.billingName,
    syncCode: profile.syncCode,
    authUserId: profile.authUserId,
  });
  return deviceId;
}

export function getDeviceId(): string {
  return ensureDeviceId();
}

export function getUserProfile(): UserProfile {
  const raw = loadJson<Partial<UserProfile>>(PROFILE_KEY, {});
  migrateStaleProPlan(raw);
  if (!raw.deviceId) {
    const deviceId = ensureDeviceId();
    return {
      deviceId,
      username: raw.username?.trim() ?? '',
      avatarEmoji: raw.avatarEmoji || DEFAULT_AVATAR,
      locale: raw.locale,
      plan: normalizePlan(raw),
      dailyContributions: raw.dailyContributions,
      dailyLayerSessions: raw.dailyLayerSessions,
      dailyExtendSessions: raw.dailyExtendSessions,
      billingEmail: raw.billingEmail,
      billingName: raw.billingName,
      syncCode: raw.syncCode,
      authUserId: raw.authUserId,
    };
  }
  return {
    deviceId: raw.deviceId,
    username: raw.username?.trim() ?? '',
    avatarEmoji: raw.avatarEmoji || DEFAULT_AVATAR,
    locale: raw.locale,
    plan: normalizePlan(raw),
    dailyContributions: raw.dailyContributions,
    dailyLayerSessions: raw.dailyLayerSessions,
    dailyExtendSessions: raw.dailyExtendSessions,
    billingEmail: raw.billingEmail,
    billingName: raw.billingName,
    syncCode: raw.syncCode,
    authUserId: raw.authUserId,
  };
}

export function setBillingContact(email: string, name: string): void {
  const profile = getUserProfile();
  saveUserProfile({
    ...profile,
    billingEmail: email.trim(),
    billingName: name.trim(),
  });
}

export function saveUserProfile(profile: UserProfile): void {
  const billingOn = import.meta.env.VITE_BILLING_ENABLED === 'true';
  saveJson(PROFILE_KEY, {
    deviceId: profile.deviceId || ensureDeviceId(),
    username: profile.username.trim(),
    avatarEmoji: profile.avatarEmoji || DEFAULT_AVATAR,
    locale: profile.locale,
    plan: billingOn ? 'free' : normalizePlan(profile),
    dailyContributions: profile.dailyContributions,
    dailyLayerSessions: profile.dailyLayerSessions,
    dailyExtendSessions: profile.dailyExtendSessions,
    billingEmail: profile.billingEmail,
    billingName: profile.billingName,
    syncCode: profile.syncCode,
    authUserId: profile.authUserId,
  });
  void import('@/lib/deviceSync').then(({ scheduleDeviceBackup }) => scheduleDeviceBackup());
}

export function getUsername(): string {
  return getUserProfile().username;
}

export function setUsername(name: string): void {
  const profile = getUserProfile();
  if (profile.username.trim()) return;
  saveUserProfile({ ...profile, username: name.trim() });
}

export function setAvatarEmoji(emoji: string): void {
  const profile = getUserProfile();
  saveUserProfile({ ...profile, avatarEmoji: emoji });
}

export function getAvatarEmoji(): string {
  return getUserProfile().avatarEmoji || DEFAULT_AVATAR;
}
