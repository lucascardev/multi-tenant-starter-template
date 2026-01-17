// app/dashboard/[teamId]/discounts/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useUser } from '@stackframe/stack';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Users, Percent, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";
import apiClient from '@/lib/axios';

interface ReferralStats {
    referralCode: string;
    totalReferrals: number;
    activeReferrals: number;
    discountPercentage: number;
    maxreferrals: number;
    friendsJoined: {
        name: string;
        date: string;
        isActive: boolean;
    }[];
}

export default function DiscountsPage() {
  const user = useUser();
  const params = useParams<{ teamId: string }>();
  // We keep useUser/useTeam if needed for layout logic, but for stats we use apiClient
  
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      async function fetchStats() {
          if (!user) return; // Wait for user to be ready (apiClient interceptor needs it too)
          try {
              // apiClient handles Authorization header automatically
              const res = await apiClient.get('/referrals/stats');
              setStats(res.data);
          } catch (e) {
              console.error("Failed to fetch referral stats:", e);
          } finally {
              setLoading(false);
          }
      }
      fetchStats();
  }, [user]);

  const handleCopyLink = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode)
      .then(() => toast.success("Código copiado!"))
      .catch(() => toast.error("Erro ao copiar."));
  };

  if (loading) return <div className="p-8">Carregando seus descontos...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Programa de Indicação 🤝</h1>
        <p className="text-muted-foreground">
            Convide amigos e ganhe 5% de desconto por cada indicação ativa (até 20%).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Desconto Atual</CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                      {stats?.discountPercentage || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                      Aplicado na próxima fatura
                  </p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Amigos Ativos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                      {stats?.activeReferrals || 0} / {stats?.maxreferrals || 4}
                  </div>
                  <Progress value={(stats?.activeReferrals || 0) * 25} className="mt-2 h-2" />
              </CardContent>
          </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" /> 
              Seu Código de Indicação
          </CardTitle>
          <CardDescription>
            Peça para seu amigo inserir este código no momento do cadastro.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
            <code className="relative rounded bg-muted px-[0.5rem] py-[0.3rem] font-mono text-xl font-semibold">
                {stats?.referralCode || "..."}
            </code>
            <Button size="sm" onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" /> Copiar Código
            </Button>
        </CardContent>
      </Card>

      {stats?.friendsJoined && stats.friendsJoined.length > 0 && (
          <div className="space-y-4">
              <h3 className="text-lg font-semibold">Indicações Recentes</h3>
              <div className="grid gap-4">
                  {stats.friendsJoined.map((friend, idx) => (
                      <Card key={idx}>
                          <CardContent className="flex items-center justify-between p-4">
                              <div>
                                  <p className="font-medium">{friend.name || "Amigo"}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(friend.date).toLocaleDateString()}</p>
                              </div>
                              <div className={`px-2 py-1 rounded text-xs font-medium ${friend.isActive ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                  {friend.isActive ? "Ativo (+5%)" : "Pendente"}
                              </div>
                          </CardContent>
                      </Card>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}