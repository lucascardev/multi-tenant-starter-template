'use client';

import { useEffect } from 'react';
import { useUser } from '@stackframe/stack'; // Verifique o import correto
import { useRouter, usePathname } from 'next/navigation'; // usePathname para evitar redirect se já estiver no onboarding

// Logger
const logger = {
    info: (...args: any[]) => console.log("HOOK_ONBOARDING INFO:", ...args),
    error: (...args: any[]) => console.error("HOOK_ONBOARDING ERROR:", ...args),
};

interface OnboardingClientMetadata {
  onboarded?: boolean;
  // Outros campos que você possa ter
}

/**
 * Hook para verificar se o usuário completou o onboarding.
 * Se não, redireciona para a página de onboarding.
 * @param enabled Se o hook deve estar ativo (default: true). Útil para desabilitar em certas condições.
 */
export function useRequireOnboarding(enabled: boolean = true) {
  const user = useUser(); // Não usa or:'redirect' aqui para poder checar o metadata antes
  const router = useRouter();
  const pathname = usePathname();
  const teams = user?.useTeams(); // Correct usage: Call hook at top level

  useEffect(() => {
    if (!enabled || !user || pathname === '/onboarding') {
      // Se desabilitado, ou usuário não carregado, ou já está na página de onboarding, não faz nada
      return;
    }

    // Verifica o clientMetadata para a flag 'onboarded'
    const metadata = user.clientMetadata as OnboardingClientMetadata | undefined;

    if (!metadata?.onboarded) {
      if (teams && teams.length > 0) {
          logger.info("Usuário tem times, considerado onboarded (Invited Member Flow).");
          return;
      } 
      logger.info("Usuário não completou onboarding e não tem times. Redirecionando para /onboarding.");
      router.push('/onboarding');
    } else {
      logger.info("Usuário já completou onboarding.");
    }
  }, [user, router, pathname, enabled, teams]); // Dependências do useEffect

  // O hook não retorna nada, apenas executa o efeito de redirecionamento.
}