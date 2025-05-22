// app/onboarding/page.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUser, type Team } from "@stackframe/stack"; // Importe Team se for usar o tipo
import { useRouter, usePathname } from "next/navigation"; // usePathname pode ser útil
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type OnboardingClientMetadata, type FullClientMetadata } from "../../types/onboarding"; // Assumindo que você moveu para cá

// Logger
const logger = {
    info: (...args: any[]) => console.log("ONBOARDING INFO:", ...args),
    error: (...args: any[]) => console.error("ONBOARDING ERROR:", ...args),
    warn: (...args: any[]) => console.warn("ONBOARDING WARN:", ...args),
};

export default function OnboardingPage() {
  const router = useRouter();
  const pathname = usePathname(); // Para checar se já está no onboarding
  const user = useUser({ or: "redirect" });

  // Chame useTeams() no nível superior
  const teams = user?.useTeams(); // Retorna Team[] ou undefined se user for null

  const [accountType, setAccountType] = React.useState<"individual" | "business" | undefined>("business");
  const [displayName, setDisplayName] = React.useState('');
  const [identifierValue, setIdentifierValue] = React.useState('');
  const [businessTypeValue, setBusinessTypeValue] = React.useState('');
  const [phoneValue, setPhoneValue] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentStep, setCurrentStep] = React.useState(1);

  // Redireciona se já completou onboarding
  React.useEffect(() => {
    if (user && user.clientMetadata && (user.clientMetadata as OnboardingClientMetadata).onboarded) {
      logger.info("Usuário já completou onboarding, redirecionando para dashboard...");
      // 'teams' já foi chamado no nível superior e está disponível aqui
      if (Array.isArray(teams) && teams.length > 0) { // Checa se teams é um array e tem itens
        const targetTeamId = user.selectedTeam?.id || teams[0].id;
        if (!user.selectedTeam) {
            user.setSelectedTeam(teams[0]).then(() => router.push(`/dashboard/${targetTeamId}`));
        } else {
            router.push(`/dashboard/${targetTeamId}`);
        }
      } else if (Array.isArray(teams)) { // teams é um array vazio, usuário onboarded mas sem times
        logger.info("Usuário onboarded, mas sem times. Permanece no onboarding para criar um time ou lógica de dashboard ajustada.")
        // Neste caso, o usuário está onboarded mas pode não ter um time criado ainda.
        // O fluxo de handleSubmit abaixo criará o primeiro time.
        // Se o dashboard principal (fora de [teamId]) puder lidar com isso, pode redirecionar para lá.
        // router.push('/dashboard'); // Ou deixe o usuário criar o time no onboarding
      }
      // Se 'teams' for undefined, ainda está carregando, o useEffect rodará de novo.
    }
  }, [user, teams, router]); // Adicionado 'teams' como dependência


  const handleNextStep = () => {
    if (currentStep === 1 && !accountType) {
      setError("Por favor, selecione o tipo de conta.");
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
        setError("Sessão do usuário não encontrada. Por favor, recarregue a página.");
        logger.error("Tentativa de submit sem objeto 'user' definido.");
        return;
    }
    setIsSubmitting(true);
    setError(null);

    if (!displayName.trim()) {
      setError(accountType === "business" ? "O nome da empresa é obrigatório." : "Seu nome é obrigatório.");
      setIsSubmitting(false);
      return;
    }
    if (!identifierValue.trim()) {
      setError(accountType === "business" ? "O CNPJ é obrigatório." : "O CPF é obrigatório.");
      setIsSubmitting(false);
      return;
    }
    if (accountType === "business" && !businessTypeValue.trim()) {
        setError("O tipo de negócio é obrigatório para empresas.");
        setIsSubmitting(false);
        return;
    }

    try {
      let targetTeam: Team | null | undefined = user.selectedTeam;
      // 'teams' já foi chamado no nível superior
      const currentTeams = teams || []; // Garante que é um array

      if (!currentTeams || currentTeams.length === 0) {
        logger.info("Usuário não tem times, criando um novo time com displayName:", displayName);
        const newTeam = await user.createTeam({ displayName: displayName });
        if (!newTeam) {
          throw new Error("Falha ao criar a empresa/time inicial no Stack Auth.");
        }
        await user.setSelectedTeam(newTeam);
        targetTeam = newTeam;
        logger.info("Novo time criado e selecionado:", newTeam.id);
      } else if (!targetTeam && currentTeams.length > 0) {
        targetTeam = currentTeams[0];
        await user.setSelectedTeam(targetTeam);
        logger.info("Primeiro time existente selecionado:", targetTeam.id);
      } else if (targetTeam && targetTeam.displayName !== displayName) {
        // Se o nome do formulário for diferente do nome do time selecionado,
        // atualiza o nome do time selecionado.
        logger.info(`Atualizando nome do time de "${targetTeam.displayName}" para "${displayName}"`);
        await targetTeam.update({ displayName: displayName });
        // targetTeam já é a referência correta, displayName será atualizado no objeto
      }

      if (!targetTeam) {
          throw new Error("Não foi possível determinar ou criar um time para o usuário.");
      }

      let detectedTimezone = "America/Sao_Paulo";
      try {
        detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || detectedTimezone;
      } catch (tzError) {
        logger.warn("Não foi possível detectar o timezone, usando fallback.", tzError);
      }

      const metadataToUpdate: FullClientMetadata = { // Usando FullClientMetadata
        onboarded: true,
        teamDisplayName: targetTeam.displayName,
        accountType: accountType,
        identifierValue: identifierValue,
        businessType: accountType === "business" ? businessTypeValue : undefined,
        phone: phoneValue.trim() || undefined,
        detectedTimezone: detectedTimezone,
      };

      await user.update({
        clientMetadata: {
          ...(user.clientMetadata || {}),
          ...metadataToUpdate,
        },
      });

      logger.info("Onboarding concluído e metadados do usuário atualizados no Stack Auth.");
      toast.success("Configuração inicial concluída com sucesso!");

      router.push(`/dashboard/${targetTeam.id}`);

    } catch (err: any) {
      logger.error("Erro durante o processo de onboarding:", err);
      setError(err.message || "Ocorreu um erro desconhecido durante a configuração.");
      toast.error(err.message || "Falha ao concluir o onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || teams === undefined) { // teams === undefined significa que useTeams() ainda não resolveu
    return <div className="flex items-center justify-center h-screen">Carregando sua sessão...</div>;
  }

  // Se o usuário já completou o onboarding, o useEffect acima deve ter redirecionado.
  // Se, por algum motivo, não redirecionou e chegou aqui, mas está onboarded,
  // pode mostrar uma mensagem ou tentar redirecionar de novo.
  // Mas é melhor confiar no useEffect para o redirecionamento.

  // O formulário de onboarding (Passo 1 e Passo 2)
  // (O restante do JSX do formulário permanece o mesmo da sua última versão)
    if (currentStep === 1) {
      return (
        <div className="flex items-center justify-center min-h-screen w-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full p-8 bg-card text-card-foreground rounded-lg shadow-xl space-y-6 border border-border">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Configuração Inicial</h1>
              <p className="text-muted-foreground mb-6">Como você usará nossos serviços?</p>
            </div>
            {error && <p className="text-red-500 dark:text-red-400 text-sm text-center mb-4">{error}</p>}

            <RadioGroup
              onValueChange={(value) => {
                setAccountType(value as "individual" | "business");
                setError(null);
              }}
              value={accountType}
              className="space-y-3"
            >
              <Label
                htmlFor="individual"
                className={cn(
                  "flex items-center space-x-3 p-4 border rounded-md cursor-pointer transition-colors duration-150",
                  "hover:bg-muted/50 dark:hover:bg-muted/20",
                  accountType === "individual" ? "bg-primary/10 border-primary dark:bg-primary/20 dark:border-primary" : "border-border"
                )}
              >
                <RadioGroupItem value="individual" id="individual" />
                <div className="flex-1">
                  <span className="font-medium">Uso Individual / Profissional Liberal</span>
                  <p className="text-sm text-muted-foreground mt-1">Para quem gerencia a própria agenda e configurações.</p>
                </div>
              </Label>
              <Label
                htmlFor="business"
                className={cn(
                  "flex items-center space-x-3 p-4 border rounded-md cursor-pointer transition-colors duration-150",
                  "hover:bg-muted/50 dark:hover:bg-muted/20",
                  accountType === "business" ? "bg-primary/10 border-primary dark:bg-primary/20 dark:border-primary" : "border-border"
                )}
              >
                <RadioGroupItem value="business" id="business" />
                <div className="flex-1">
                  <span className="font-medium">Para Minha Empresa / Clínica</span>
                  <p className="text-sm text-muted-foreground mt-1">Para gerenciar múltiplos profissionais e outras configurações.</p>
                </div>
              </Label>
            </RadioGroup>

            <Button
              onClick={handleNextStep}
              disabled={!accountType || isSubmitting}
              className="w-full mt-6"
            >
              Próximo
            </Button>
          </div>
        </div>
      );
    }

    if (currentStep === 2 && accountType) {
      return (
        <div className="flex items-center justify-center min-h-screen w-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full p-8 bg-card text-card-foreground rounded-lg shadow-xl space-y-6 border border-border">
            <button
              onClick={() => { setCurrentStep(1); setError(null);}}
              className="text-sm text-primary hover:underline mb-4 focus:outline-none"
            >
              ← Voltar para selecionar tipo de conta
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">
                {accountType === "business" ? "Detalhes da Empresa" : "Seus Detalhes"}
              </h1>
              <p className="text-muted-foreground">
                Por favor, preencha as informações abaixo para continuar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <p className="text-red-500 dark:text-red-400 text-sm text-center py-2 bg-red-50 dark:bg-red-900/20 rounded-md">{error}</p>}
              <div>
                <Label htmlFor="displayName" className="block text-sm font-semibold mb-1">
                  {accountType === "business" ? "Nome da Empresa/Clínica" : "Seu Nome Completo"} <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <Input
                  id="displayName"
                  placeholder={accountType === "business" ? "Ex: Clínica Sorriso Feliz" : "Ex: Dra. Ana Maria Silva"}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="identifierValue" className="block text-sm font-semibold mb-1">
                  {accountType === "business" ? "CNPJ" : "CPF"} <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <Input
                  id="identifierValue"
                  placeholder={accountType === "business" ? "00.000.000/0001-00" : "000.000.000-00"}
                  value={identifierValue}
                  onChange={(e) => setIdentifierValue(e.target.value)}
                  required
                />
              </div>

              {accountType === "business" && (
                <div>
                  <Label htmlFor="businessTypeValue" className="block text-sm font-semibold mb-1">
                    Tipo de Negócio <span className="text-red-500 dark:text-red-400">*</span>
                  </Label>
                   <Select onValueChange={setBusinessTypeValue} value={businessTypeValue}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o tipo do seu negócio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinica_medica">Clínica Médica</SelectItem>
                      <SelectItem value="clinica_odontologica">Clínica Odontológica</SelectItem>
                      <SelectItem value="consultorio_psicologia">Consultório de Psicologia</SelectItem>
                      <SelectItem value="estudio_beleza">Estúdio de Beleza/Estética</SelectItem>
                      <SelectItem value="servicos_profissionais">Serviços Profissionais Diversos</SelectItem>
                      <SelectItem value="outro">Outro Tipo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="phoneValue" className="block text-sm font-semibold mb-1">
                  Seu Telefone Principal (com DDD)
                </Label>
                <Input
                  id="phoneValue"
                  type="tel"
                  placeholder="Ex: 11912345678"
                  value={phoneValue}
                  onChange={(e) => setPhoneValue(e.target.value)}
                />
              </div>

              <p className="text-xs text-muted-foreground pt-2 text-center">
                Fuso horário que usaremos: {Intl.DateTimeFormat().resolvedOptions().timeZone || "Não detectado (usaremos padrão)"}
              </p>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-base"
              >
                {isSubmitting ? "Salvando Configurações..." : "Concluir e Ir para o Dashboard"}
              </Button>
            </form>
          </div>
        </div>
      );
    }

  return <div className="flex items-center justify-center h-screen bg-background text-foreground">Carregando formulário de configuração...</div>;
}