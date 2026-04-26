"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SubscriptionPlan } from "@/types/plan";
import { useStackApp } from "@stackframe/stack";

interface PricingSectionProps {
  plans: SubscriptionPlan[];
  title?: string;
  subtitle?: string;
}

export function PricingSection({
  plans,
  title = "Preços",
  subtitle = "Planos flexíveis para cada tipo de clínica.",
}: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);
  const app = useStackApp();

  return (
    <section id="pricing" className="container space-y-6 py-8 md:py-12 lg:py-24">
      <div className="mx-auto flex max-w-6xl flex-col items-center space-y-4 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold">{title}</h2>
        <p className="max-w-[85%] text-muted-foreground sm:text-lg">{subtitle}</p>

        <div className="flex items-center space-x-4 mt-6">
          <Label htmlFor="billing-mode" className={!isYearly ? "font-bold" : ""}>
            Mensal
          </Label>
          <Switch id="billing-mode" checked={isYearly} onCheckedChange={setIsYearly} />
          <Label htmlFor="billing-mode" className={isYearly ? "font-bold" : ""}>
            Anual <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold ml-1 uppercase">20% Off</span>
          </Label>
        </div>
      </div>

      <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-5xl md:grid-cols-3">
        {plans.map((plan) => {
          const monthlyPrice = plan.price_monthly || 0;
          const discountedPrice = monthlyPrice * 0.8; // 20% OFF
          const price = isYearly ? discountedPrice : monthlyPrice;
          const yearlyTotal = discountedPrice * 12;

          const isPopular = plan.plan_name.toLowerCase().includes("básico"); // Logic to highlight a plan

          // Parse features if string, or cast if array
          let featuresList: string[] = [];
          if (Array.isArray(plan.features)) {
            featuresList = plan.features as string[];
          } else if (typeof plan.features === "string") {
            try {
              featuresList = JSON.parse(plan.features);
            } catch (e) {
              featuresList = [plan.features];
            }
          }

          return (
            <Card
              key={plan.id}
              className={`w-full max-w-sm flex flex-col ${
                isPopular ? "border-primary border-2 shadow-lg" : ""
              }`}
            >
              <CardHeader>
                <CardTitle className="text-2xl font-bold">{plan.plan_name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-4">
                  {isYearly && (
                    <div className="text-sm text-muted-foreground line-through mb-1">
                      {plan.currency === "BRL" ? "R$" : "$"}{monthlyPrice.toFixed(2)}/mês
                    </div>
                  )}
                  <span className="text-4xl font-bold text-primary">
                    {plan.currency === "BRL" ? "R$" : "$"}
                    {price.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">/mês</span>
                  {isYearly && (
                    <div className="text-sm text-green-600 mt-1 font-medium bg-green-50 w-fit px-2 py-1 rounded-md">
                        Faturado R${yearlyTotal.toFixed(2)} anualmente
                    </div>
                  )}
                </div>
                <ul className="space-y-2">
                  {featuresList.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <Check className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                    <span>Até {plan.max_customers_count} atendimentos</span>
                  </li>
                   <li className="flex items-center text-sm">
                    <Check className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                    <span>{plan.max_instances_count} conexão(ões) de WhatsApp</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link
                  href={app.urls.signUp}
                  className={buttonVariants({
                    variant: isPopular ? "default" : "outline",
                    className: "w-full",
                  })}
                >
                  {isPopular ? "Começar Agora" : "Escolher Plano"}
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
