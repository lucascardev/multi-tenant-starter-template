// app/dashboard/[teamId]/discounts/page.tsx
"use client";

import React from 'react';
import { useUser } from '@stackframe/stack';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function DiscountsPage() {
  const user = useUser();
  const params = useParams<{ teamId: string }>();
  const team = user?.useTeam(params.teamId);

  // TODO: Buscar link de indicação da API
  const referralLink = `https://seusite.com/cadastro?ref=${user?.id || 'seu_codigo'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
      .then(() => toast.success("Link de indicação copiado!"))
      .catch(() => toast.error("Falha ao copiar o link."));
  };


  if (!user || !team) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Programa de Indicação</h1>
      <p className="text-muted-foreground">
        Indique amigos ou colegas e ganhe benefícios!
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Seu Link de Indicação</CardTitle>
          <CardDescription>
            Compartilhe este link para que suas indicações se cadastrem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input value={referralLink} readOnly className="flex-grow" />
            <Button variant="outline" size="icon" onClick={handleCopyLink} aria-label="Copiar link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Detalhes sobre os benefícios do programa de indicação serão listados aqui.
          </p>
          {/* TODO: Listar recompensas, indicados, etc. */}
        </CardContent>
      </Card>
    </div>
  );
}