'use client';

import SidebarLayout, { SidebarItem } from "@/components/sidebar-layout";
import { SelectedTeamSwitcher, useUser } from "@stackframe/stack";
import { BadgePercent, BarChart4, Columns3, Globe, Locate, Settings2, ShoppingBag, Users, Shield } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useRequireOnboarding } from "@/app/onboarding-hooks"; // IMPORTAR O HOOK
import React from "react"; // Importar React para React.ReactNode

import { type OnboardingClientMetadata } from "../../../types/onboarding"; // IMPORTADO AQUI

// ... (navigationItems permanece o mesmo)
const navigationItems: SidebarItem[] = [
  { name: "Dashboard", href: "/", icon: Globe, type: "item" },
  { type: 'label', name: 'Gerencimento' },
  { name: "Meu Plano", href: "/products", icon: ShoppingBag, type: "item" },
  { name: "Pessoas meu time", href: "/people", icon: Users, type: "item" },
  { name: "Integração", href: "/integrations", icon: Columns3, type: "item" },
  { name: "WhatsApp", href: "/regions", icon: Locate, type: "item" },
  { type: 'label', name: 'Financeiro' },
  { name: "Faturas", href: "/revenue", icon: BarChart4, type: "item" },
  { name: "Indicação", href: "/discounts", icon: BadgePercent, type: "item" },
  { type: 'label', name: 'Settings' },
  { name: "Configurações IA", href: "/configuration", icon: Settings2, type: "item" },
  { name: "Admin Area", href: "/admin", icon: Shield, type: "item", external: true },
];


export default function DashboardTeamLayout({ children }: { children: React.ReactNode }) { // Renomeado props para children
  const params = useParams<{ teamId: string }>();
  const router = useRouter();

  // useUser agora pode ser chamado sem or:'redirect' aqui, pois o hook de onboarding
  // e a lógica abaixo cuidarão do redirecionamento se necessário.
  // Ou mantenha or:'redirect' se preferir que o Stack Auth lide com o não logado primeiro.
  const user = useUser({ or: "redirect" }); // Mantendo or:redirect para o caso de acesso direto sem sessão

  // Chama o hook de onboarding. Ele redirecionará para '/onboarding' se necessário.
  // Só ativa o hook se o usuário estiver carregado.
  useRequireOnboarding(!!user);

  // Se useUser ainda está carregando ou user é null (e or:redirect não atuou ainda)
  if (!user) {
    return <div className="flex items-center justify-center h-screen">Carregando sessão do usuário...</div>;
  }

  // Se useRequireOnboarding já redirecionou, este código pode não ser alcançado para usuários não onboarded.
  // Mas como uma dupla checagem, ou se o hook for desabilitado:
  const metadata = user.clientMetadata as OnboardingClientMetadata | undefined;
  if (!metadata?.onboarded) {
    // O hook já deveria ter redirecionado. Se chegou aqui, pode ser um estado transitório.
    // Pode-se mostrar um loader ou null, pois o redirect do hook deve ocorrer.
    // console.log("Layout: Aguardando redirecionamento do useRequireOnboarding ou usuário não onboarded.");
    // router.push('/onboarding'); // Redirecionamento forçado se o hook falhar ou for lento
    return <div className="flex items-center justify-center h-screen">Verificando configuração inicial...</div>;
  }


  const team = user.useTeam(params.teamId); // Pega o time após garantir que user está definido

  // Se o usuário está onboarded, mas o teamId é inválido ou o usuário não tem acesso a esse time
  if (!team) {
    // Tenta encontrar o primeiro time do usuário
    const teams = user.useTeams();
    if (teams && teams.length > 0) {
        const firstTeamId = teams[0].id;
        console.warn(`Layout: Time ID "${params.teamId}" inválido ou não encontrado. Redirecionando para o primeiro time: ${firstTeamId}`);
        router.push(`/dashboard/${firstTeamId}`);
    } else {
        // Usuário está onboarded, mas não tem times (cenário que PageClient deveria ter tratado)
        // Ou se o PageClient foi pulado e o usuário foi direto para uma URL de time inválida.
        console.warn(`Layout: Usuário onboarded mas não tem times ou teamId "${params.teamId}" é inválido e não há fallback. Redirecionando para onboarding ou dashboard principal.`);
        router.push('/onboarding'); // Volta para o onboarding para criar um time
    }
    return <div className="flex items-center justify-center h-screen">Carregando informações do time ou redirecionando...</div>;
  }

  // Se chegou até aqui, o usuário está logado, onboarded, e o time é válido.
  return (
    <SidebarLayout
      items={navigationItems}
      basePath={`/dashboard/${team.id}`}
      sidebarTop={<SelectedTeamSwitcher
        selectedTeam={team}
        urlMap={(team) => `/dashboard/${team.id}`}
      />}
      baseBreadcrumb={[{
        title: team.displayName,
        href: `/dashboard/${team.id}`,
      }]}
    >
      {children}
    </SidebarLayout>
  );
}