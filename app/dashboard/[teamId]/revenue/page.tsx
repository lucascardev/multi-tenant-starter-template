"use client";

import React from 'react';
import { useUser } from '@stackframe/stack';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RevenuePage() {
  const user = useUser();
  const params = useParams<{ teamId: string }>();
  const team = user?.useTeam(params.teamId);

  if (!user || !team) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Faturas</h1>
      <p className="text-muted-foreground">
        Visualize seu histórico de faturas e pagamentos.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Faturas</CardTitle>
          <CardDescription>
            A integração com o sistema de faturamento (ex: Stripe) será implementada aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhuma fatura para exibir no momento.</p>
          {/* TODO: Listar faturas da API do sistema de pagamento */}
        </CardContent>
      </Card>
    </div>
  );
}