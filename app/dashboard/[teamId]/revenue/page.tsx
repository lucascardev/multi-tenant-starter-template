"use client";

import React from 'react';
import { useUser } from '@stackframe/stack';
import { useParams } from 'next/navigation';
import ConstructionPage from '@/components/construction';

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
        <div className="border rounded-lg bg-card">
            <ConstructionPage 
                title="Gestão Financeira em Breve" 
                message="Em breve você poderá visualizar suas faturas e gerenciar seus pagamentos (Integração Stripe) diretamente por aqui."
            />
        </div>
    </div>
  );
}