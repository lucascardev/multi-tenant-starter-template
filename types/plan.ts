export interface SubscriptionPlan {
  id: string;
  plan_name: string;
  price_monthly: number;
  price_yearly: number | null;
  currency: string;
  description: string;
  features: any; // Prisma Json type can be tricky in frontend, using any or string[] if we parse it
  max_messages_count: number;
  max_customers_count: number;
  max_personas_count: number;
  max_instances_count: number;
  is_active: boolean;
  display_order: number;
}
