"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@stackframe/stack';
import { useParams, useRouter } from 'next/navigation'; // useRouter pode não ser necessário aqui se o layout já trata
import apiClient from '@/lib/axios';
import { BarChart4, Users, Locate, MessageSquareText, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge'; // Para status de instância
import { toast } from 'sonner'; // Para notificações de erro
import { Button } from '@/components/ui/button'; // Para botão de tentar novamente

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
  messagesSentLast30Days: number;
  activeSubscriptionPlan?: string;
  clientBusinessName?: string; // Para exibir o nome do negócio do cliente
}

interface InstanceStatusSummary {
    id: string;
    instance_name: string;
    status: string;
}

export default function TeamDashboardPage() { // Renomeado para clareza
  const user = useUser({ or: "redirect" }); // or:redirect garante que user exista se renderizar
  const params = useParams<{ teamId: string }>();
  const router = useRouter(); // Para possível redirecionamento manual se necessário

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
        activeInstances: instancesData.filter((inst: any) => inst.status === 'connected').length,
        totalPersonas: personasData.length,
        messagesSentLast30Days: clientConfigData.messages_sent ?? 0,
        activeSubscriptionPlan: subData?.plan_name || "Plano não identificado",
        clientBusinessName: team.displayName, // Usar o displayName do time do Stack Auth
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
      setError(err.response?.data?.message || "Não foi possível carregar os dados do dashboard.");
      toast.error(err.response?.data?.message || "Falha ao carregar dados do dashboard.");
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
            <div className="text-2xl font-bold">{stats?.activeInstances ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Conectadas ao WhatsApp</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personas Configurada(s)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPersonas ?? '-'}</div>
            <p className="text-xs text-muted-foreground">IAs prontas para uso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens (Mês)</CardTitle> {/* Simplificado */}
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.messagesSentLast30Days ?? 0}</div>
            <p className="text-xs text-muted-foreground">Interações realizadas</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
            <BarChart4 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate" title={stats?.activeSubscriptionPlan || "Não definido"}>
                {stats?.activeSubscriptionPlan || "Não definido"}
            </div>
            <p className="text-xs text-muted-foreground">Sua assinatura ativa</p>
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
    </div>
  );
}