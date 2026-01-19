"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@stackframe/stack';
import { useParams, useRouter } from 'next/navigation'; // useRouter pode não ser necessário aqui se o layout já trata
import apiClient from '@/lib/axios';
import { BarChart4, Users, Locate, MessageSquareText, AlertTriangle, MessageSquareOff, Bot, Lightbulb, CheckCircle2, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge'; // Para status de instância
import { toast } from 'sonner'; // Para notificações de erro
import { Button } from '@/components/ui/button'; // Para botão de tentar novamente
import { UsageProgressBar } from '@/components/dashboard/usage-progress-bar';
import { Calendar, CreditCard, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const logger = console;

const statusBadgeVariantMap: ReadonlyMap<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = new Map([
    ['connected', 'success'],
    ['disconnected', 'destructive'],
    ['needs_qr', 'warning'],
    ['connecting', 'default'],
    ['error', 'destructive'],
    // Adicione outros status conforme necessário
]);


interface DashboardStats {
  activeInstances: number;
  totalPersonas: number;
  activeSubscriptionPlan?: string;
  clientBusinessName?: string;
  // New Fields
  instancesCount: number;
  maxInstances: number;
  
  personasCount: number;
  maxPersonas: number;

  messagesSent: number;
  maxMessages: number;
  graceMessages: number;
  
  customersAnswered: number;
  maxCustomers: number;
  graceCustomers: number;

  periodStart: string | null;
  periodEnd: string | null;

  monthlyPrice: number; // Legacy, keep for safety or remove if unused, but removing might break if backend revert. Let's keep but rely on new price
  price: number;
  interval: 'month' | 'year';
}

interface InstanceStatusSummary {
    id: string;
    instance_name: string;
    status: string;
}

const MOCK_DASHBOARD_DATA = {
    instances: [
        {
            id: 'mock-inst-1',
            instance_name: 'WhatsApp Principal',
            status: 'connected',
        },
        {
            id: 'mock-inst-2',
            instance_name: 'WhatsApp Secundário',
            status: 'disconnected',
        }
    ],
    personas: [
        { id: 'mock-persona-1', name: 'Atendente Clara' }
    ],
    subscription: {
        plan_name: 'Plano Básico (Mock)',
    },
    clientConfig: {
        messages_sent: 1250,
        business_name: 'Clínica Modelo (Dev)'
    },
    // Mock Extended
    usage_stats: {
        messages_sent: 850,
        customers_answered: 120
    },
    limits: {
        max_messages: 1000,
        grace_messages: 500,
        max_customers: 200,
        grace_customers: 50
    },
    period: {
        current_period_start: new Date(Date.now() - 86400000 * 15).toISOString(), // 15 days ago
        current_period_end: new Date(Date.now() + 86400000 * 15).toISOString(), // 15 days left

        price_monthly: 199.90,
        price: 199.90,
        interval: 'month'
    }
};

const calculateProjection = (current: number, totalDays: number = 30, daysPassed: number) => {
    if (daysPassed < 1) return current;
    const dailyAvg = current / daysPassed;
    return Math.floor(dailyAvg * totalDays);
}

export default function TeamDashboardPage() { // Renomeado para clareza
  const user = useUser({ or: "redirect" }); // or:redirect garante que user exista se renderizar
  const params = useParams<{ teamId: string }>();
  // const router = useRouter(); // Para possível redirecionamento manual se necessário

  // useTeam pode retornar null se o teamId for inválido ou o usuário não tiver acesso.
  // O Layout.tsx já tem lógica para redirecionar se !team.
  const team = user?.useTeam(params.teamId);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [instanceSummary, setInstanceSummary] = useState<InstanceStatusSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    // Não precisa checar !user ou !team aqui se o layout e useUser({or: "redirect"}) já trataram.
    // No entanto, se team puder ser null brevemente, adicione a checagem.
    if (!team) { // Adicionada checagem para team, pois useTeam pode retornar null
        logger.warn("fetchDashboardData chamado sem 'team' definido.");
        setIsLoading(false); // Para o loading se o time não estiver disponível
        // O layout já deve ter redirecionado, mas podemos forçar aqui também se necessário
        // router.push('/dashboard'); 
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // As chamadas de API usarão o token de autenticação do usuário (via interceptor do Axios)
      // O backend identificará o cliente com base nesse token.
      const [instancesRes, personasRes, subInfoRes, clientConfigRes] = await Promise.all([
        apiClient.get('/instances'),
        apiClient.get('/personas'),
        apiClient.get('/subscriptions/current'),
        apiClient.get('/client/config'),
      ]);

      const instancesData = instancesRes.data.instances || [];
      const personasData = personasRes.data.personas || [];
      const subData = subInfoRes.data; // API deve retornar um objeto, mesmo que com defaults
      const clientConfigData = clientConfigRes.data;

      setStats({
        activeInstances: clientConfigData.instances_count ?? instancesData.filter((inst: any) => inst.status === 'connected').length,
        maxInstances: subData?.max_instances_count ?? 1,
        
        totalPersonas: clientConfigData.personas_count ?? personasData.length,
        maxPersonas: subData?.max_personas_count ?? 1,
        
        activeSubscriptionPlan: subData?.plan_name || "Plano não identificado",
        clientBusinessName: team.displayName,
        
        // New Data Mapping
        messagesSent: subData?.usage_stats?.messages_sent ?? (clientConfigData.messages_sent ?? 0),
        maxMessages: subData?.max_messages_count ?? 1000,
        graceMessages: subData?.grace_messages_count ?? 0,

        customersAnswered: subData?.usage_stats?.customers_answered ?? 0,
        maxCustomers: subData?.max_customers_count ?? 100, // Default fallback
        graceCustomers: subData?.grace_customers_count ?? 0,

        periodStart: subData?.current_period_start || null,
        periodEnd: subData?.current_period_end || null,

        monthlyPrice: subData?.price_monthly || 0,
        price: subData?.price || subData?.price_monthly || 0,
        interval: subData?.interval || 'month',
      });

      setInstanceSummary(
          instancesData.slice(0, 3).map((inst: any) => ({
              id: inst.id,
              instance_name: inst.instance_name,
              status: inst.status
          }))
      );
      logger.info("Dados do dashboard carregados:", { stats, instanceSummary });

    } catch (err: any) {
      logger.error("Erro ao buscar dados do dashboard:", err.response?.data || err.message);
      
      // FALLBACK PARA MOCK DATA EM DESENVOLVIMENTO
      if (process.env.NODE_ENV === 'development') {
          logger.warn("Usando MOCK DATA para o dashboard devido a erro na API.");
          
           setStats({
            activeInstances: MOCK_DASHBOARD_DATA.instances.filter((inst: any) => inst.status === 'connected').length,
            totalPersonas: MOCK_DASHBOARD_DATA.personas.length,
            activeSubscriptionPlan: MOCK_DASHBOARD_DATA.subscription.plan_name,
            clientBusinessName: MOCK_DASHBOARD_DATA.clientConfig.business_name,
            
            instancesCount: 1,
            maxInstances: 2,
            personasCount: 1,
            maxPersonas: 5,

            messagesSent: MOCK_DASHBOARD_DATA.usage_stats.messages_sent,
            maxMessages: MOCK_DASHBOARD_DATA.limits.max_messages,
            graceMessages: MOCK_DASHBOARD_DATA.limits.grace_messages,

            customersAnswered: MOCK_DASHBOARD_DATA.usage_stats.customers_answered,
            maxCustomers: MOCK_DASHBOARD_DATA.limits.max_customers,
            graceCustomers: MOCK_DASHBOARD_DATA.limits.grace_customers,

            periodStart: MOCK_DASHBOARD_DATA.period.current_period_start,
            periodEnd: MOCK_DASHBOARD_DATA.period.current_period_end,

            monthlyPrice: MOCK_DASHBOARD_DATA.period.price_monthly,
            price: MOCK_DASHBOARD_DATA.period.price,
            interval: MOCK_DASHBOARD_DATA.period.interval as 'month' | 'year',
          });

          setInstanceSummary(
              MOCK_DASHBOARD_DATA.instances.map((inst: any) => ({
                  id: inst.id,
                  instance_name: inst.instance_name,
                  status: inst.status
              }))
          );
          // Não define erro para UI, pois o mock é um sucesso "degradado"
          toast.warning("Usando dados de demonstração (API offline).");
      } else {
          setError(err.response?.data?.message || "Não foi possível carregar os dados do dashboard.");
          toast.error(err.response?.data?.message || "Falha ao carregar dados do dashboard.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [team]); // Removido 'user' da dependência, pois 'team' já depende de 'user'

  useEffect(() => {
    // Só executa se 'team' estiver definido (o que implica que 'user' também está)
    if (team) {
      fetchDashboardData();
    }
    // Se 'team' for null, o layout já deveria ter redirecionado.
    // Se o layout não redirecionar e 'team' continuar null, esta página mostrará o estado de erro/carregamento.
  }, [team, fetchDashboardData]); // Adicionado fetchDashboardData às dependências

 const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" => {
    if (!status) return 'secondary';
    return statusBadgeVariantMap.get(status.toLowerCase()) || 'secondary';
};

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-pulse">
        <Skeleton className="h-10 w-1/3 mb-4" /> {/* Título */}
        <Skeleton className="h-6 w-1/2 mb-6" /> {/* Subtítulo */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[125px] rounded-lg" />
          <Skeleton className="h-[125px] rounded-lg" />
          <Skeleton className="h-[125px] rounded-lg" />
          <Skeleton className="h-[125px] rounded-lg" />
        </div>
        <Skeleton className="h-8 w-1/3 mt-8 mb-4" /> {/* Título do Resumo de Instâncias */}
        <Skeleton className="h-[70px] rounded-lg" />
        <Skeleton className="h-[70px] rounded-lg" />
      </div>
    );
  }

  // Se o user ou team não estiverem disponíveis após o carregamento (o layout deve tratar, mas por segurança)
  if (!user || !team) {
    // O hook useUser({ or: "redirect" }) e a lógica no Layout.tsx deveriam ter prevenido este estado.
    // Se chegou aqui, pode haver um problema na lógica de autenticação/redirecionamento.
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive">Erro de Sessão</h2>
            <p className="text-muted-foreground">Não foi possível carregar as informações do usuário ou do time.</p>
            <p className="text-muted-foreground">Por favor, tente <a href="/auth/sign-in" className="underline text-primary">fazer login</a> novamente.</p>
        </div>
    );
  }
  
  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive">Erro ao Carregar Dashboard</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchDashboardData} className="mt-4">Tentar Novamente</Button>
        </div>
    );
  }


  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard: {stats?.clientBusinessName || team.displayName}</h1>
        <p className="text-muted-foreground">
          Bem-vindo(a) de volta, {user.displayName || user.primaryEmail}!
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instâncias Ativas</CardTitle>
            <Locate className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {stats ? `${stats.instancesCount}/${stats.maxInstances}` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">Conectadas ao WhatsApp</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personas Configurada(s)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {stats ? `${stats.personasCount}/${stats.maxPersonas}` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">IAs prontas para uso</p>
          </CardContent>
        </Card>
        <Card className="col-span-1 md:col-span-2"> 
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uso do Plano</CardTitle>
             <CardDescription>Monitore seus limites mensais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <UsageProgressBar 
                label="Mensagens Enviadas" 
                value={stats?.messagesSent ?? 0}
                max={stats?.maxMessages ?? 1000}
                graceBuffer={stats?.graceMessages ?? 0}
            />
            {stats?.periodStart && (stats?.messagesSent ?? 0) > 0 && (() => {
                const daysPassed = Math.max(1, Math.ceil((Date.now() - new Date(stats.periodStart!).getTime()) / (1000 * 60 * 60 * 24)));
                const projection = calculateProjection(stats.messagesSent, 30, daysPassed); // Assuming 30 days cycle
                const totalLimit = (stats.maxMessages + stats.graceMessages);
                
                if (projection > totalLimit) {
                     return (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                            <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                                Estimativa: Seu plano pode esgotar em {Math.floor(totalLimit / (stats.messagesSent / daysPassed)) - daysPassed} dias.
                            </p>
                        </div>
                     )
                }
                return null;
            })()}
             <UsageProgressBar 
                label="Novos Clientes Atendidos" 
                value={stats?.customersAnswered ?? 0}
                max={stats?.maxCustomers ?? 100}
                graceBuffer={stats?.graceCustomers ?? 0}
            />
          </CardContent>
        </Card>

         <Card className="col-span-1 md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detalhes da Assinatura</CardTitle>
            <BarChart4 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between items-center">
                 <span className="text-muted-foreground text-sm">Plano Atual:</span>
                 <Badge variant="outline" className="font-semibold">{stats?.activeSubscriptionPlan || "Não definido"}</Badge>
             </div>
             
             {stats?.periodEnd && (
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm flex items-center gap-2">
                        <Calendar className="h-3 w-3" /> Renova em:
                    </span>
                    <span className="text-sm font-medium">
                        {new Date(stats.periodEnd).toLocaleDateString('pt-BR')}
                    </span>
                 </div>
             )}

            {stats?.price !== undefined && stats.price > 0 && (
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm flex items-center gap-2">
                        <CreditCard className="h-3 w-3" /> {stats.interval === 'year' ? 'Valor Anual:' : 'Valor Mensal:'}
                    </span>
                    <span className="text-sm font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.price)}
                    </span>
                </div>
             )}

             <Separator />

             <Button 
                variant="default" 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                    const message = encodeURIComponent("Olá, gostaria de aumentar meu limite de mensagens na Clara.")
                    window.open(`https://wa.me/5571992931330?text=${message}`, '_blank')
                }}
            >
                <ExternalLink className="mr-2 h-4 w-4" />
                Aumentar Limites / Suporte
             </Button>

          </CardContent>
        </Card>
      </div>

      {instanceSummary.length > 0 && (
        <div className="mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-3">Resumo das Instâncias</h2>
            <div className="space-y-3">
                {instanceSummary.map(inst => (
                    <Card key={inst.id}>
                        <CardContent className="p-4 flex justify-between items-center">
                            <p className="font-medium">{inst.instance_name}</p>
                            <Badge variant={getStatusBadgeVariant(inst.status)}>
                                {inst.status.replace("_", " ").toUpperCase()}
                            </Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
             <h2 className="text-xl font-semibold text-foreground mb-3">Dicas & Comandos Rápidos</h2>
        </div>
        
        <Card className="bg-orange-50/50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <MessageSquareOff className="h-4 w-4" />
                    Pausar Atendimento (Modo Humano)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                    Assuma o controle do chat e impeça a Clara de responder:
                </p>
                <code className="relative rounded bg-white dark:bg-black/20 px-[0.5rem] py-[0.3rem] font-mono text-sm font-semibold border border-orange-200 dark:border-orange-800">
                    /atendimento on
                </code>
            </CardContent>
        </Card>

            <Card className="bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Bot className="h-4 w-4" />
                    Retomar Atendimento
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                    Faça a Clara voltar a responder automaticamente:
                </p>
                <code className="relative rounded bg-white dark:bg-black/20 px-[0.5rem] py-[0.3rem] font-mono text-sm font-semibold border border-green-200 dark:border-green-800">
                    /atendimento off
                </code>
            </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 lg:col-span-1 border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10">
                <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Lightbulb className="h-4 w-4" />
                    Melhores Práticas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
                <div className="flex gap-3 items-start">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 mt-1 shrink-0" />
                        <div>
                        <p className="text-sm font-medium">Mantenha Conectado</p>
                        <p className="text-xs text-muted-foreground">O WhatsApp deve estar online no celular.</p>
                        </div>
                </div>
                    <div className="flex gap-3 items-start">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 mt-1 shrink-0" />
                        <div>
                        <p className="text-sm font-medium">Instruções Claras</p>
                        <p className="text-xs text-muted-foreground">Dê exemplos de diálogo na Persona.</p>
                        </div>
                </div>
                <div className="flex gap-3 items-start">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 mt-1 shrink-0" />
                        <div>
                        <p className="text-sm font-medium">Faça Backups</p>
                        <p className="text-xs text-muted-foreground">Exporte suas personas regularmente.</p>
                        </div>
                </div>
                <div className="flex gap-3 items-start">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 mt-1 shrink-0" />
                        <div>
                        <p className="text-sm font-medium">Calendário</p>
                        <p className="text-xs text-muted-foreground">Revise as regras em "Integrações".</p>
                        </div>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-400">
                    <Shield className="h-4 w-4" />
                    Bloqueio de Números
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                    Gerencie números que a IA deve ignorar (spam/outros):
                </p>
                <div className="space-y-2">
                    <code className="block rounded bg-white dark:bg-black/20 px-[0.5rem] py-[0.3rem] font-mono text-xs font-semibold border border-slate-200 dark:border-slate-800">
                        /whitelist add 5511...
                    </code>
                     <code className="block rounded bg-white dark:bg-black/20 px-[0.5rem] py-[0.3rem] font-mono text-xs font-semibold border border-slate-200 dark:border-slate-800">
                        /whitelist list
                    </code>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}