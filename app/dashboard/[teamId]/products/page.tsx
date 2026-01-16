// app/dashboard/[teamId]/products/page.tsx
"use client";

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { useUser } from '@stackframe/stack'; 
import { useParams } from 'next/navigation';
import apiClient from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Link as LinkIcon, Calendar, Contact2, ShieldCheck, ArrowRightLeft, UploadCloud, ArrowLeft, LogOut, Info, BookOpen, CheckCircle2, AlertTriangle, X } from "lucide-react";
import Image from "next/image";
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const logger = console;

interface SubscriptionPlanData {
  id: string;
  plan_name: string;
  price_monthly: number;
  currency: string;
  description: string;
  features: string[];
  max_instances_count: number;
  max_personas_count: number;
  max_messages_count: number;
  max_customers_count: number;
  stripe_price_id_monthly?: string;
}

interface CurrentSubscriptionInfoData {
  plan_id?: string;
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
}

export default function MyPlanPage() {
  const user = useUser({ or: "redirect" });
  const params = useParams<{ teamId: string }>();

  const [plans, setPlans] = useState<SubscriptionPlanData[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscriptionInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);

  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [selectedPlanForActivation, setSelectedPlanForActivation] = useState<SubscriptionPlanData | null>(null);
  const [activationCode, setActivationCode] = useState("");
  const [showBrDidDialog, setShowBrDidDialog] = useState(false);

  const fetchPlanData = useCallback(async (showSpinner = true) => {
    if (!user) return;
    if (showSpinner) setIsLoading(true);
    try {
      const [plansRes, currentSubRes] = await Promise.all([
        apiClient.get('/subscription-plans'),
        apiClient.get('/subscriptions/current'),
      ]);

      setPlans(plansRes.data.plans || []);
      setCurrentSubscription(currentSubRes.data || null);
      logger.info("Dados de planos e assinatura carregados:", { plans: plansRes.data, current: currentSubRes.data });
    } catch (error: any) {
      logger.error("Erro ao buscar dados dos planos:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Não foi possível carregar os dados dos planos.");
      setCurrentSubscription(null);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchPlanData(true);
    }
  }, [user, fetchPlanData]);

  const handleOpenActivationDialog = (plan: SubscriptionPlanData) => {
    if (plan.id === 'free_tier_01' && currentSubscription?.plan_id !== 'free_tier_01') {
        toast.info("O plano gratuito é aplicado automaticamente ou contate o suporte para downgrade.");
        return;
    }
    if (currentSubscription?.plan_id === plan.id && currentSubscription?.status === 'active') {
        toast.info("Este já é o seu plano ativo.");
        return;
    }
    setSelectedPlanForActivation(plan);
    setActivationCode("");
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
      await fetchPlanData(true);
    } catch (error: any) {
      logger.error("Erro ao ativar plano:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Falha ao ativar o plano. Verifique o código.");
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) { return <Skeleton className="w-full h-screen" />; }
  if (!user) { return <div>Carregando...</div>; }

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
                <span className="text-sm font-normal text-muted-foreground ml-1">/mês</span>
              </p>
              {currentPlanId === plan.id && currentSubscription?.status === 'active' && (
                  <div className="mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                      Plano Atual
                  </div>
              )}            </CardHeader>
            <CardContent className="flex-grow">
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Recursos incluídos:</h4>
              <ul className="space-y-1.5">
                {(Array.isArray(plan.features) ? plan.features : []).map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-foreground/90">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
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

      {/* BR DID Recommendation Section */}
      <section className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white rounded-xl overflow-hidden shadow-2xl border border-gray-700">
        <div className="flex flex-col md:flex-row items-center">
            <div className="p-8 md:w-3/5 space-y-6">
                 <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-green-500/30">Recomendação Oficial</span>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight">Precisa de um número para sua empresa?</h2>
                    <p className="text-gray-300 text-lg leading-relaxed">
                        Não use seu número pessoal! Profissionalize seu atendimento com um <span className="text-green-400 font-semibold">Número Virtual</span> da nossa parceira BR DID.
                    </p>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <CheckCircle2 className="h-5 w-5 text-green-400 mb-2" />
                        <h4 className="font-semibold">Ativação Imediata</h4>
                        <p className="text-sm text-gray-400">Tenha seu número funcionando em minutos.</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                         <CheckCircle2 className="h-5 w-5 text-green-400 mb-2" />
                        <h4 className="font-semibold"> DDD de todo Brasil</h4>
                        <p className="text-sm text-gray-400">Escolha números de qualquer região.</p>
                    </div>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <Button onClick={() => setShowBrDidDialog(true)} size="lg" variant="secondary" className="font-semibold shadow-lg hover:scale-105 transition-transform">
                        <span className="mr-2">📚</span> Ver Tutorial Rápido
                    </Button>
                    <Button asChild size="lg" className="bg-green-600 hover:bg-green-500 text-white font-bold shadow-lg shadow-green-900/20 hover:scale-105 transition-transform border-0">
                        <a href="https://brdid.com.br" target="_blank" rel="noopener noreferrer">
                            Ir para BR DID <span className="ml-2">→</span>
                        </a>
                    </Button>
                 </div>
            </div>
            <div className="md:w-2/5 h-full min-h-[300px] relative bg-white flex items-center justify-center p-8">
                <div className="relative w-full h-[150px]">
                     <Image 
                        src="/brdid-logo.png" 
                        alt="BR DID Logo" 
                        fill 
                        style={{ objectFit: "contain" }}
                        className="drop-shadow-xl"
                     />
                </div>
            </div>
        </div>
      </section>

      {/* Dialog para Ativação de Plano */}
      <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ativar Plano: {selectedPlanForActivation?.plan_name}</DialogTitle>
            <DialogDescription>
              Para ativar o plano &quot;{selectedPlanForActivation?.plan_name}&quot;, por favor, insira o código de ativação fornecido.
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
      
      {/* Dialog Tutorial BR DID */}
      <Dialog open={showBrDidDialog} onOpenChange={setShowBrDidDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <Image src="/brdid-logo.png" alt="BR DID" width={100} height={40} className="object-contain" />
                    <span>Tutorial de Contratação</span>
                </DialogTitle>
                <DialogDescription>
                    Siga este passo a passo para contratar e configurar seu número virtual.
                </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
                <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-8">                  
                    <li className="mb-6 ml-6">
                        <span className="absolute flex items-center justify-center w-8 h-8 bg-green-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-green-900">
                            <span className="font-bold text-green-600 dark:text-green-300">1</span>
                        </span>
                        <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900 dark:text-white">Acesse a BR DID</h3>
                        <p className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">
                            Entre no site <a href="https://brdid.com.br" target="_blank" className="text-blue-600 hover:underline">brdid.com.br</a>, faça seu cadastro e login no painel.
                        </p>
                    </li>
                    <li className="mb-6 ml-6">
                        <span className="absolute flex items-center justify-center w-8 h-8 bg-green-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-green-900">
                            <span className="font-bold text-green-600 dark:text-green-300">2</span>
                        </span>
                        <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Contrate um "Número VoIP"</h3>
                        <p className="text-base font-normal text-gray-500 dark:text-gray-400">
                            No menu, vá em <strong>Contratar Novos Números VoIP</strong>. Escolha o DDD, Cidade e o número desejado.
                            <br/><em>Recomendamos pagamento via Cartão de Crédito para renovação automática.</em>
                        </p>
                    </li>
                    <li className="mb-6 ml-6">
                        <span className="absolute flex items-center justify-center w-8 h-8 bg-green-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-green-900">
                             <span className="font-bold text-green-600 dark:text-green-300">3</span>
                        </span>
                        <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Configure no WhatsApp Business</h3>
                        <div className="p-4 bg-muted rounded-lg text-sm space-y-2 mt-2">
                             <p>1. Abra o WhatsApp Business e insira o número comprado.</p>
                             <p>2. Aguarde o contador de SMS zerar e selecione <strong>"Não recebi o código"</strong> -> <strong>"Me Ligue"</strong>.</p>
                             <p>3. Volte ao painel da BR DID. O código de verificação aparecerá lá em alguns minutos (5-10min).</p>
                             <p>4. Insira o código no WhatsApp e pronto!</p>
                        </div>
                    </li>
                </ol>

                <div className="bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg p-4 flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                        <h5 className="font-semibold text-blue-900 dark:text-blue-100">Dica Profissional</h5>
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                            Configure o pagamento recorrente para não perder seu número. Ele é a identidade da sua empresa!
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
                <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                    <a href="https://brdid.com.br" target="_blank" rel="noopener noreferrer">Contratar Agora</a>
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}