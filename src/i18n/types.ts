export type Locale = 'ja' | 'en';

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'ja', label: '日本語' },
  { id: 'en', label: 'English' },
];

export type MessageValue = string | MessageTree;
export interface MessageTree {
  [key: string]: MessageValue;
}
