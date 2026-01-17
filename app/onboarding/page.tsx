"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUser, type Team } from "@stackframe/stack";
import { useRouter, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type OnboardingClientMetadata, type FullClientMetadata } from "../../types/onboarding";
import { formatCNPJ, formatCPF, formatPhone, isValidCNPJ, isValidCPF, isValidPhone } from "@/lib/validation";
import apiClient from "@/lib/axios";

// Logger
const logger = {
    info: (...args: any[]) => console.log("ONBOARDING INFO:", ...args),
    error: (...args: any[]) => console.error("ONBOARDING ERROR:", ...args),
    warn: (...args: any[]) => console.warn("ONBOARDING WARN:", ...args),
};

export default function OnboardingPage() {
  const router = useRouter();
  const user = useUser({ or: "redirect" });
  const teams = user?.useTeams();

  const [accountType, setAccountType] = React.useState<"individual" | "business" | undefined>("business");
  const [displayName, setDisplayName] = React.useState('');
  const [identifierValue, setIdentifierValue] = React.useState('');
  const [businessTypeValue, setBusinessTypeValue] = React.useState('');
  const [phoneValue, setPhoneValue] = React.useState('');
  const [referralCode, setReferralCode] = React.useState('');
  const [referralFeedback, setReferralFeedback] = React.useState<{valid: boolean, message?: string} | null>(null);
  const [isAgreed, setIsAgreed] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentStep, setCurrentStep] = React.useState(1);

  // Redireciona se já completou onboarding
  React.useEffect(() => {
    if (user && user.clientMetadata && (user.clientMetadata as OnboardingClientMetadata).onboarded) {
      logger.info("Usuário já completou onboarding, redirecionando para dashboard...");
      if (Array.isArray(teams) && teams.length > 0) {
        const targetTeamId = user.selectedTeam?.id || teams[0].id;
        if (!user.selectedTeam) {
            user.setSelectedTeam(teams[0]).then(() => router.push(`/dashboard/${targetTeamId}`));
        } else {
            router.push(`/dashboard/${targetTeamId}`);
        }
      }
    }
  }, [user, teams, router]);

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (accountType === 'business') {
          setIdentifierValue(formatCNPJ(raw));
      } else {
          setIdentifierValue(formatCPF(raw));
      }
      setError(null);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPhoneValue(formatPhone(e.target.value));
  };

  const validateReferral = async (code: string) => {
      if (!code || code.length < 3) return;
      try {
          // Usando apiClient (axios) ou fetch no endpoint público
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/referrals/validate/${code}`);
          const data = await res.json();
          if (data.valid) {
              setReferralFeedback({ valid: true, message: `Código válido! Indicado por ${data.ownerName || 'Parceiro'}.` });
          } else {
              setReferralFeedback({ valid: false, message: "Código inválido." });
          }
      } catch (err) {
          console.error("Error validating referral:", err);
      }
  };

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
        return;
    }
    setIsSubmitting(true);
    setError(null);

    // Validation checks
    if (!displayName.trim()) {
      setError(accountType === "business" ? "O nome da empresa é obrigatório." : "Seu nome é obrigatório.");
      setIsSubmitting(false); return;
    }
    if (!identifierValue.trim()) {
      setError(accountType === "business" ? "O CNPJ é obrigatório." : "O CPF é obrigatório.");
      setIsSubmitting(false); return;
    }
    if (accountType === 'business' && !isValidCNPJ(identifierValue)) {
        setError("CNPJ inválido."); setIsSubmitting(false); return;
    }
    if (accountType !== 'business' && !isValidCPF(identifierValue)) {
        setError("CPF inválido."); setIsSubmitting(false); return;
    }
    if (phoneValue && !isValidPhone(phoneValue)) {
        setError("Telefone inválido."); setIsSubmitting(false); return;
    }
    if (accountType === "business" && !businessTypeValue.trim()) {
        setError("O tipo de negócio é obrigatório para empresas."); setIsSubmitting(false); return;
    }
    if (!isAgreed) {
        setError("Você precisa aceitar os termos."); setIsSubmitting(false); return;
    }

    try {
      let targetTeam: Team | null | undefined = user.selectedTeam;
      const currentTeams = teams || [];

      if (!currentTeams || currentTeams.length === 0) {
        const newTeam = await user.createTeam({ displayName: displayName });
        if (!newTeam) throw new Error("Falha ao criar a empresa/time inicial.");
        await user.setSelectedTeam(newTeam);
        targetTeam = newTeam;
      } else if (!targetTeam && currentTeams.length > 0) {
        targetTeam = currentTeams[0];
        await user.setSelectedTeam(targetTeam);
      } else if (targetTeam && targetTeam.displayName !== displayName) {
        await targetTeam.update({ displayName: displayName });
      }

      if (!targetTeam) throw new Error("Não foi possível determinar ou criar um time.");

      let detectedTimezone = "America/Sao_Paulo";
      try { detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || detectedTimezone; } catch (e) {}

      const metadataToUpdate: FullClientMetadata = {
        onboarded: true,
        teamDisplayName: targetTeam.displayName,
        accountType: accountType,
        identifierValue: identifierValue,
        businessType: accountType === "business" ? businessTypeValue : undefined,
        phone: phoneValue.trim() || undefined,
        referralCode: referralCode || undefined,
        detectedTimezone: detectedTimezone,
      };

      await user.update({
        clientMetadata: {
          ...(user.clientMetadata || {}),
          ...metadataToUpdate,
        },
      });

      toast.success("Configuração inicial concluída!");
      router.push(`/dashboard/${targetTeam.id}`);

    } catch (err: any) {
      logger.error("Erro onboarding:", err);
      setError(err.message || "Ocorreu um erro desconhecido.");
      toast.error("Falha ao concluir o onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || teams === undefined) {
    return <div className="flex items-center justify-center h-screen">Carregando sua sessão...</div>;
  }

  // Step 1: Account Type
  if (currentStep === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen w-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full p-8 bg-card text-card-foreground rounded-lg shadow-xl space-y-6 border border-border">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Configuração Inicial</h1>
            <p className="text-muted-foreground mb-6">Como você usará nossos serviços?</p>
          </div>
          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

          <RadioGroup onValueChange={(v) => { setAccountType(v as any); setError(null); }} value={accountType} className="space-y-3">
            <Label htmlFor="individual" className={cn("flex items-center space-x-3 p-4 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors", accountType === "individual" ? "bg-primary/10 border-primary" : "border-border")}>
              <RadioGroupItem value="individual" id="individual" />
              <div className="flex-1"><span className="font-medium">Uso Individual</span><p className="text-sm text-muted-foreground">Para profissionais autônomos.</p></div>
            </Label>
            <Label htmlFor="business" className={cn("flex items-center space-x-3 p-4 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors", accountType === "business" ? "bg-primary/10 border-primary" : "border-border")}>
              <RadioGroupItem value="business" id="business" />
              <div className="flex-1"><span className="font-medium">Para Minha Empresa</span><p className="text-sm text-muted-foreground">Para clínicas e times.</p></div>
            </Label>
          </RadioGroup>

          <Button onClick={handleNextStep} disabled={!accountType || isSubmitting} className="w-full mt-6">Próximo</Button>
        </div>
      </div>
    );
  }

  // Step 2: Details
  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full p-8 bg-card text-card-foreground rounded-lg shadow-xl space-y-6 border border-border">
        <button onClick={() => { setCurrentStep(1); setError(null);}} className="text-sm text-primary hover:underline mb-4">← Voltar</button>
        <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">{accountType === "business" ? "Detalhes da Empresa" : "Seus Detalhes"}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            {error && <p className="text-red-500 text-sm text-center py-2 bg-red-50 rounded-md">{error}</p>}
            
            <div>
                <Label htmlFor="displayName">{accountType === "business" ? "Nome da Empresa" : "Seu Nome"} <span className="text-red-500">*</span></Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>

            <div>
                <Label htmlFor="identifierValue">{accountType === "business" ? "CNPJ" : "CPF"} <span className="text-red-500">*</span></Label>
                <Input id="identifierValue" value={identifierValue} onChange={handleIdentifierChange} required />
            </div>

            {accountType === "business" && (
                <div>
                    <Label htmlFor="businessTypeValue">Tipo de Negócio <span className="text-red-500">*</span></Label>
                    <Select onValueChange={setBusinessTypeValue} value={businessTypeValue}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="clinica_medica">Clínica Médica</SelectItem>
                            <SelectItem value="clinica_odontologica">Clínica Odontológica</SelectItem>
                            <SelectItem value="estudio_beleza">Estúdio de Beleza</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div>
                <Label htmlFor="phoneValue">Telefone Principal</Label>
                <Input id="phoneValue" type="tel" value={phoneValue} onChange={handlePhoneChange} placeholder="(99) 99999-9999" />
            </div>

            <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="referral">Código de Indicação (Opcional)</Label>
                <div className="flex gap-2">
                    <Input id="referral" placeholder="Ex: AMIGO-123" value={referralCode} onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setReferralFeedback(null); }} onBlur={(e) => validateReferral(e.target.value)} />
                    {referralFeedback && <span className={cn("text-sm self-center", referralFeedback.valid ? "text-green-600" : "text-red-600")}>{referralFeedback.message}</span>}
                </div>
                <p className="text-xs text-muted-foreground">Insira para ganhar 5% de desconto.</p>
            </div>

            <div className="flex items-start space-x-2 pt-2">
                <Checkbox id="terms" checked={isAgreed} onCheckedChange={(c) => setIsAgreed(c === true)} />
                <Label htmlFor="terms" className="text-sm font-normal">Concordo com os <a href="/terms" className="underline text-primary">Termos</a> e <a href="/privacy" className="underline text-primary">Privacidade</a>.</Label>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">Concluir</Button>
        </form>
      </div>
    </div>
  );
}