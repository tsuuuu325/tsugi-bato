import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_AVATAR } from '@/types';
import type { UserProfile } from '@/types';

const PROFILE_KEY = 'tsugi-bato-profile';

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
    plan: profile.plan ?? 'free',
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
  if (!raw.deviceId) {
    const deviceId = ensureDeviceId();
    return {
      deviceId,
      username: raw.username?.trim() ?? '',
      avatarEmoji: raw.avatarEmoji || DEFAULT_AVATAR,
      locale: raw.locale,
      plan: raw.plan ?? 'free',
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
    plan: raw.plan ?? 'free',
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
    plan: billingOn ? 'free' : (profile.plan ?? 'free'),
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
