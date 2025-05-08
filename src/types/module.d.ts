// モジュール宣言
declare module '@/components/subscription/SubscriptionSettings' {
  const SubscriptionSettings: React.FC;
  export default SubscriptionSettings;
}

declare module '@/components/subscription/PlanUpgradeModal' {
  import { SubscriptionPlan } from '@/models/SubscriptionPlan';
  import { Organization } from '@/models/Organization';

  interface PlanUpgradeModalProps {
    open: boolean;
    onClose: () => void;
    currentPlan: SubscriptionPlan | null;
    selectedPlan: SubscriptionPlan;
    organization: Organization | null;
  }

  const PlanUpgradeModal: React.FC<PlanUpgradeModalProps>;
  export default PlanUpgradeModal;
}

declare module '@/components/settings/GoogleBusinessIntegration' {
  const GoogleBusinessIntegration: React.FC;
  export default GoogleBusinessIntegration;
}

declare module '@/components/notification/NotificationSettings' {
  const NotificationSettings: React.FC;
  export default NotificationSettings;
} 