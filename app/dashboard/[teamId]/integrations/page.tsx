"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Settings, ShieldCheck, ArrowRightLeft, UploadCloud } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@stackframe/stack";
import { useParams } from "next/navigation";

export default function IntegrationsHubPage() {
  const user = useUser({ or: "redirect" });
  const params = useParams<{ teamId: string }>();
  // Use a default teamId or placeholder if undefined to prevent hydration mismatches
  const teamId = params.teamId || "curr"; 

  return (
    <div className="p-4 md:p-6 space-y-8 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Central de Integrações</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Conecte a Clara aos sistemas que sua clínica já usa. Gerencie sincronizações, 
          estratégias de agenda e fluxos de automação em um só lugar.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GOOGLE INTEGRATION CARD */}
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow bg-card/50">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
                <Image src="/google-icon.png" alt="Google" width={32} height={32} />
                <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    Prioridade
                </span>
            </div>
            <CardTitle className="text-2xl">Google Calendar & Contacts</CardTitle>
            <CardDescription className="text-base pt-2">
              Defina a <strong>Estratégia da Clara</strong> para sua agenda: Bloqueio de Conflitos, Sincronização Total ou Apenas Backup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Bloqueio</div>
                  <div className="flex items-center gap-1"><ArrowRightLeft className="w-4 h-4" /> Sync</div>
                  <div className="flex items-center gap-1"><UploadCloud className="w-4 h-4" /> Backup</div>
              </div>
              <Button asChild className="w-full sm:w-auto" size="lg">
                  <Link href={`/dashboard/${teamId}/integrations/google`}>
                      Configurar Google <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
              </Button>
          </CardContent>
        </Card>

        {/* CLINICORP INTEGRATION CARD */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow bg-card/50">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
                 <Zap className="w-8 h-8 text-blue-500" />
                 <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    ERP Principal
                </span>
            </div>
            <CardTitle className="text-2xl">Clinicorp</CardTitle>
            <CardDescription className="text-base pt-2">
              Conecte seu sistema de gestão para automatizar confirmações de consulta, mensagens de retorno e seguimento de orçamentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
               <div className="flex gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><Settings className="w-4 h-4" /> Automação</div>
              </div>
              <Button asChild variant="outline" className="w-full sm:w-auto" size="lg">
                  <Link href={`/dashboard/${teamId}/integrations/clinicorp`}>
                      Gerenciar Clinicorp <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
              </Button>
          </CardContent>
        </Card>
      </div>

       <div className="mt-12 p-6 rounded-xl bg-muted/30 border border-dashed flex flex-col items-center text-center space-y-4">
            <h3 className="font-semibold text-lg">Precisa de mais integrações?</h3>
            <p className="text-muted-foreground max-w-md">
                Estamos constantemente adicionando novos parceiros. 
                Entre em contato com o suporte para solicitar integrações com Dental Office, Simples Dental, e outros.
            </p>
            <Button variant="secondary" disabled>Em breve</Button>
       </div>
    </div>
  );
}
