import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PanToolIcon from '@mui/icons-material/PanTool';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// トーンオプションの定義
export const TONE_OPTIONS = [
  {
    value: 'polite',
    label: '丁寧',
    description: '礼儀正しく、フォーマルな印象を与える返信',
    icon: AutoAwesomeIcon,
  },
  {
    value: 'friendly',
    label: 'フレンドリー',
    description: '親しみやすく、温かみのある返信',
    icon: SentimentSatisfiedAltIcon,
  },
  {
    value: 'apologetic',
    label: '謝罪',
    description: '誠実に謝罪の気持ちを伝える返信',
    icon: PanToolIcon,
  },
  {
    value: 'grateful',
    label: '感謝',
    description: '感謝の気持ちを強調する返信',
    icon: FavoriteIcon,
  },
  {
    value: 'professional',
    label: 'プロフェッショナル',
    description: 'ビジネスライクで信頼感のある返信',
    icon: BusinessCenterIcon,
  },
] as const;

export type ToneOption = typeof TONE_OPTIONS[number]['value'];
export type Tone = ToneOption; // エイリアス

// デフォルトのトーン
export const DEFAULT_TONE: Tone = 'polite';
