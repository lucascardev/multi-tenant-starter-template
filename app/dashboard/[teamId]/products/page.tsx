// app/dashboard/[teamId]/products/page.tsx
"use client";

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { useUser } from '@stackframe/stack'; // Removido useTeam, não usado diretamente
import { useParams } from 'next/navigation';
import apiClient from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const logger = console;

interface SubscriptionPlanData { // Renomeado para evitar conflito com o tipo Prisma
  id: string;
  plan_name: string;
  price_monthly: number;
  currency: string;
  description: string;
  features: string[]; // Permite array ou JsonValue
  max_instances_count: number;
  max_personas_count: number;
  max_messages_count: number;
  max_customers_count: number;
  stripe_price_id_monthly?: string; // Opcional
}

interface CurrentSubscriptionInfoData { // Renomeado
  plan_id?: string; // Adicionado
  plan_name: string;
  status: string;
  max_instances_count?: number;
  max_personas_count?: number;
  max_messages_count?: number;
  max_customers_count: number;
  features?: string[]
  description?: string;
  price_monthly?: number;
  currency?: string;
  // Adicione mais campos se a API /subscriptions/current retornar
}

export default function MyPlanPage() {
  const user = useUser({ or: "redirect" });
  const params = useParams<{ teamId: string }>(); // teamId do Stack Auth
  // const team = user?.useTeam(params.teamId); // Não é estritamente necessário se as APIs são baseadas no token do usuário

  const [plans, setPlans] = useState<SubscriptionPlanData[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscriptionInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);

  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [selectedPlanForActivation, setSelectedPlanForActivation] = useState<SubscriptionPlanData | null>(null);
  const [activationCode, setActivationCode] = useState("");

  const fetchPlanData = useCallback(async (showSpinner = true) => {
    if (!user) return; // user vem de useUser({or:"redirect"}) então deve estar definido
    if (showSpinner) setIsLoading(true);
    try {
      const [plansRes, currentSubRes] = await Promise.all([
        apiClient.get('/subscription-plans'),
        apiClient.get('/subscriptions/current'),
      ]);

      setPlans(plansRes.data.plans || []);
      setCurrentSubscription(currentSubRes.data || null); // Garante que seja null se não houver dados
      logger.info("Dados de planos e assinatura carregados:", { plans: plansRes.data, current: currentSubRes.data });
    } catch (error: any) {
      logger.error("Erro ao buscar dados dos planos:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Não foi possível carregar os dados dos planos.");
      // Se não conseguir carregar a assinatura atual, pode definir como um estado de "erro" ou "sem plano"
      setCurrentSubscription(null);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, [user]); // Removido team das dependências se não for usado no fetch

  useEffect(() => {
    if (user) { // Somente executa se user estiver definido
        fetchPlanData(true);
    }
  }, [user, fetchPlanData]); // Adicionado fetchPlanData às dependências

  const handleOpenActivationDialog = (plan: SubscriptionPlanData) => {
    // Não permitir "ativar" o plano gratuito com código
    if (plan.id === 'free_tier_01' && currentSubscription?.plan_id !== 'free_tier_01') {
        toast.info("O plano gratuito é aplicado automaticamente ou contate o suporte para downgrade.");
        return;
    }
    if (currentSubscription?.plan_id === plan.id && currentSubscription?.status === 'active') {
        toast.info("Este já é o seu plano ativo.");
        return;
    }
    setSelectedPlanForActivation(plan);
    setActivationCode(""); // Limpa código anterior
    setShowActivationDialog(true);
  };

  const handleActivatePlan = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForActivation || !activationCode.trim()) {
      toast.error("Código de ativação é obrigatório.");
      return;
    }
    setIsActivating(true);
    try {
      const response = await apiClient.post('/subscriptions/activate-plan', {
        planId: selectedPlanForActivation.id,
        activationCode: activationCode,
      });
      toast.success(response.data.message || `Plano ${selectedPlanForActivation.plan_name} ativado!`);
      setShowActivationDialog(false);
      setSelectedPlanForActivation(null);
      setActivationCode("");
      await fetchPlanData(true); // Re-busca os dados para atualizar a UI
    } catch (error: any) {
      logger.error("Erro ao ativar plano:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Falha ao ativar o plano. Verifique o código.");
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) { /* ... Skeleton UI ... */ }
  if (!user) { /* ... Mensagem de carregamento/erro de usuário ... */ } // user deve estar definido devido ao or:"redirect"

  const currentPlanId = currentSubscription?.plan_id || (currentSubscription?.status === 'default_free' ? 'free_tier_01' : null);

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meu Plano e Assinaturas</h1>
        <p className="text-muted-foreground mt-1">
          Veja os detalhes do seu plano atual e explore outras opções para sua conta.
        </p>
      </div>

      {currentSubscription && currentSubscription.status !== 'default_free' && (
        <Card className="bg-card border-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Seu Plano Atual: <span className="text-primary">{currentSubscription.plan_name}</span></CardTitle>
            <CardDescription>Status: <span className={currentSubscription.status === 'active' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{currentSubscription.status.toUpperCase()}</span></CardDescription>
          </CardHeader>
          {/* Adicionar mais detalhes da assinatura atual se desejar */}
        </Card>
      )}
       {currentSubscription && currentSubscription.status === 'default_free' && (
        <Card className="bg-amber-50 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600">
          <CardHeader>
            <CardTitle className="text-lg text-amber-700 dark:text-amber-400 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2"/> Seu Plano Atual: {currentSubscription.plan_name}
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-500">Você está utilizando as funcionalidades básicas. Considere um upgrade para mais recursos.</CardDescription>
          </CardHeader>
        </Card>
      )}


      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => (
          <Card key={plan.id} className={`flex flex-col ${currentPlanId === plan.id && currentSubscription?.status === 'active' ? 'border-2 border-primary ring-2 ring-primary/30 shadow-xl' : 'border-border hover:shadow-md transition-shadow'}`}>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{plan.plan_name}</CardTitle>
              <CardDescription className="text-sm h-12 line-clamp-2">{plan.description}</CardDescription> {/* Altura fixa e line-clamp */}
              <p className="text-3xl font-bold text-foreground pt-3">
                R$ {plan.price_monthly.toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
            </CardHeader>
            <CardContent className="flex-grow">
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Recursos incluídos:</h4>
              <ul className="space-y-1.5">
                {(Array.isArray(plan.features) ? plan.features : []).map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-foreground/90">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
                <li className="flex items-center text-sm"><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />{plan.max_instances_count} Instância(s) WhatsApp</li>
                <li className="flex items-center text-sm"><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />{plan.max_personas_count} Persona(s) de IA</li>
                <li className="flex items-center text-sm"><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />{plan.max_messages_count.toLocaleString('pt-BR')} Mensagens/mês</li>
                 <li className="flex items-center text-sm"><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />{plan.max_customers_count.toLocaleString('pt-BR')} Clientes Atendidos/mês</li>
              </ul>
            </CardContent>
            <CardFooter className="border-t pt-4">
              {currentPlanId === plan.id && currentSubscription?.status === 'active' ? (
                <Button className="w-full" disabled variant="outline">Seu Plano Atual</Button>
              ) : (
                <Button className="w-full" onClick={() => handleOpenActivationDialog(plan)} variant={plan.id === 'free_tier_01' ? "secondary" : "default"}>
                  {plan.id === 'free_tier_01' ? "Usar Plano Gratuito" : "Selecionar este Plano"}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Dialog para Ativação de Plano */}
      <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ativar Plano: {selectedPlanForActivation?.plan_name}</DialogTitle>
            <DialogDescription>
              Para ativar o plano "{selectedPlanForActivation?.plan_name}", por favor, insira o código de ativação fornecido.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleActivatePlan} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="activationCode" className="text-right col-span-1">
                Código
              </Label>
              <Input
                id="activationCode"
                name="activationCode"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                className="col-span-3"
                placeholder="Seu código de ativação"
                required
              />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isActivating}>
                {isActivating ? "Ativando..." : "Ativar Plano"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}