/**
 * Disiplan plan kataloğu — canonical TS source.
 *
 * Bu dosya tek nokta gerçeği. Fiyat veya özellik değişirse şu 3 yer de güncellenmeli:
 *   1) supabase/seed_subscription_plans.sql  (DB sync — ON CONFLICT UPDATE)
 *   2) landing/fiyatlandirma.html            (statik HTML — manuel)
 *   3) index.html DP_PLANS objesi             (web main app inline JS — manuel)
 *
 * Faz 3.B'de Iyzico'da plan oluşturulunca her plan'a `iyzico_pricing_plan_reference_code`
 * atanacak (subscription_plans tablosunda); bu dosya değişmeyecek.
 *
 * Client + server safe — dış bağımlılık yok.
 */

export type PlanCode = 'free' | 'pro_monthly_try' | 'pro_yearly_try';

export type PlanInterval = 'monthly' | 'yearly' | 'lifetime' | null;

export interface PlanFeatures {
  max_active_tasks: number | null; // null = sınırsız
  max_lists: number | null;
  pomodoro: boolean;
  pomodoro_themes: boolean;        // Pro tema (forest/ocean/night)
  weekly_calendar: boolean;        // Haftalık plan + drag-drop
  subtasks: boolean;
  advanced_stats: boolean;         // İstatistikler modal'ında ay/yıl filtreleri
  balance_analysis: boolean;       // Detaylı denge önerileri ve haftalık dağılım
}

export interface PlanCatalogEntry {
  code: PlanCode;
  name: string;
  description: string;
  amount: number;                  // KDV dahil, TRY (kuruş yok)
  currency: 'TRY';
  interval: PlanInterval;
  trial_period_days: number;
  display_order: number;
  features: PlanFeatures;
}

const PRO_FEATURES: PlanFeatures = {
  max_active_tasks: null,
  max_lists: null,
  pomodoro: true,
  pomodoro_themes: true,
  weekly_calendar: true,
  subtasks: true,
  advanced_stats: true,
  balance_analysis: true,
};

export const PLAN_CATALOG: Record<PlanCode, PlanCatalogEntry> = {
  free: {
    code: 'free',
    name: 'Bireysel',
    description: 'Yeni başlayanlar için ücretsiz plan',
    amount: 0,
    currency: 'TRY',
    interval: null,
    trial_period_days: 0,
    display_order: 1,
    features: {
      max_active_tasks: 100,
      max_lists: 5,
      pomodoro: true,
      pomodoro_themes: false,
      weekly_calendar: false,
      subtasks: false,
      advanced_stats: false,
      balance_analysis: false,
    },
  },
  pro_monthly_try: {
    code: 'pro_monthly_try',
    name: 'Pro Aylık',
    description: 'Sınırsız görev ve tüm gelişmiş özellikler',
    amount: 99,
    currency: 'TRY',
    interval: 'monthly',
    trial_period_days: 0,
    display_order: 2,
    features: PRO_FEATURES,
  },
  pro_yearly_try: {
    code: 'pro_yearly_try',
    name: 'Pro Yıllık',
    description: '%17 tasarruf — yılda 2 ay bedava',
    amount: 990,
    currency: 'TRY',
    interval: 'yearly',
    trial_period_days: 0,
    display_order: 3,
    features: PRO_FEATURES,
  },
};

/**
 * Erken erişim kampanyası — `landing/erken-erisim.html` ile uyumlu.
 * Faz 3.B'de Iyzico kupon olarak tanımlanacak (DB'deki `coupons` tablosuna seed).
 */
export const EARLY_ACCESS_CAMPAIGN = {
  enabled: true,
  monthlyDiscountPercent: 50,  // ilk N ay
  yearlyDiscountPercent: 50,   // ilk yıl
  durationMonths: 6,
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

export function isProPlanCode(code: string): boolean {
  return code === 'pro_monthly_try' || code === 'pro_yearly_try';
}

export function formatPrice(amount: number, currency: 'TRY' = 'TRY'): string {
  if (amount === 0) return 'Ücretsiz';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getMonthlyEquivalent(yearlyAmount: number): number {
  return Math.round(yearlyAmount / 12);
}

export function getYearlySavingsPercent(
  monthlyAmount: number,
  yearlyAmount: number,
): number {
  if (monthlyAmount <= 0) return 0;
  const monthlyTotal = monthlyAmount * 12;
  return Math.round(((monthlyTotal - yearlyAmount) / monthlyTotal) * 100);
}

export function applyEarlyAccessDiscount(
  amount: number,
  interval: PlanInterval,
): number {
  if (!EARLY_ACCESS_CAMPAIGN.enabled || !interval) return amount;
  const pct =
    interval === 'monthly'
      ? EARLY_ACCESS_CAMPAIGN.monthlyDiscountPercent
      : EARLY_ACCESS_CAMPAIGN.yearlyDiscountPercent;
  return Math.round(amount * (1 - pct / 100));
}
