"use client";

import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

// Logger
const logger = {
    info: (...args: any[]) => console.log("DASHBOARD ROOT INFO:", ...args),
};

export default function DashboardRedirectPage() {
  const user = useUser({ or: "redirect" }); // Garante que o user esteja logado
  const router = useRouter();
  const teams = user.useTeams(); // Pega os times

  useEffect(() => {
    if (user) { // Se user está carregado
      if (user.selectedTeam) {
        logger.info(`Redirecionando para o time selecionado: ${user.selectedTeam.id}`);
        router.push(`/dashboard/${user.selectedTeam.id}`);
      } else {
        if (teams && teams.length > 0) {
          logger.info(`Nenhum time selecionado, redirecionando para o primeiro time: ${teams[0].id}`);
          // Seleciona e depois redireciona para dar tempo de selectedTeam atualizar
          user.setSelectedTeam(teams[0]).then(() => {
            router.push(`/dashboard/${teams[0].id}`);
          });
        } else {
          // Usuário logado, mas não tem times (e presumivelmente não passou pelo onboarding ainda,
          // ou o onboarding não criou um time). O hook useRequireOnboarding no layout do dashboard
          // deve pegar isso, mas podemos redirecionar para onboarding como fallback.
          logger.info("Nenhum time encontrado, redirecionando para onboarding.");
          router.push('/onboarding');
        }
      }
    }
  }, [user, router]); // Adicionado router às dependências

  return <div className="flex items-center justify-center h-screen">Carregando seu dashboard...</div>;
}