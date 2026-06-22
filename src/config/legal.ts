import { APP_NAME } from '@/config/app';

const useAddressOmission = import.meta.env.VITE_LEGAL_USE_ADDRESS_OMISSION === 'true';

/** 特定商取引法の省略規定用（所在地・電話をサイトに載せない場合） */
export function getLegalContactOmissionText(email: string): string {
  return `消費者からの請求があった場合、遅滞なく所在地・電話番号を電子メール等の方法で開示します。開示を希望される方は、${email} までご連絡ください。`;
}

/** 特定商取引法・問い合わせ表示用（本番前に必ず実情報に差し替え） */
export const LEGAL = {
  serviceName: APP_NAME,
  operatorName: import.meta.env.VITE_LEGAL_OPERATOR_NAME ?? '（事業者名を設定してください）',
  representative: import.meta.env.VITE_LEGAL_REPRESENTATIVE ?? '（代表者名を設定してください）',
  address: import.meta.env.VITE_LEGAL_ADDRESS ?? '（所在地を設定してください）',
  phone: import.meta.env.VITE_LEGAL_PHONE ?? '（電話番号を設定してください）',
  email: import.meta.env.VITE_LEGAL_EMAIL ?? 'support@example.com',
  useAddressOmission,
  get contactOmissionText() {
    return getLegalContactOmissionText(this.email);
  },
  priceLabel: '月額500円（税込）',
  priceAmount: 500,
  paymentMethods: 'クレジットカード（Visa / Mastercard / American Express / JCB 等）',
  paymentTiming: '申込時に初回決済。以降は毎月自動更新。',
  deliveryTiming: '決済完了後、直ちにPro機能を利用可能',
  cancelPolicy:
    'マイページ（Stripeカスタマーポータル）からいつでも解約可能。解約後も当該請求期間の終了まではProを利用できます。日割り返金はありません。',
  extraFees: 'なし（通信料はお客様負担）',
  refundPolicy: 'デジタルコンテンツの性質上、原則として返金は行いません。',
} as const;

export const PRO_PRICE_YEN = LEGAL.priceAmount;
