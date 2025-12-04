// トーンオプションの定義
export const TONE_OPTIONS = [
  { value: 'formal', label: 'フォーマル' },
  { value: 'casual', label: 'カジュアル' },
  { value: 'friendly', label: 'フレンドリー' },
  { value: 'professional', label: 'プロフェッショナル' },
  { value: 'polite', label: '丁寧' },
] as const;

export type ToneOption = typeof TONE_OPTIONS[number]['value'];
export type Tone = ToneOption; // エイリアス
