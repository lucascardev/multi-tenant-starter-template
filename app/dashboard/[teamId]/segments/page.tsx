// app/dashboard/[teamId]/segments/page.tsx
"use client";

import React, { useState, useEffect, FormEvent, useCallback } from "react";
import { useUser } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Necessário para Clinicorp
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import apiClient from "@/lib/axios";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Zap, Link as LinkIcon, LogOut, ListChecks, Contact2 } from "lucide-react"; // LinkIcon, LogOut, ListChecks, Contact2
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams, useRouter, usePathname } from "next/navigation"; // Adicionado usePathname

const logger = console;

interface ClinicorpFormData {
  isActive: boolean;
  username: string;
  password?: string;
  subscriberId: string;
  companyId: string;
  enableAppointmentConfirmation: boolean;
  enableReturnCallMessages: boolean;
  enableBudgetFollowupMessages: boolean;
  // Adicione lastSyncAt e errorMessage para consistência com o que a API retorna para exibição
  lastSyncAt?: string | null;
  errorMessage?: string | null;
}

interface GoogleConfigData { // Renomeado para clareza
  isActive: boolean;
  email?: string | null;
  selectedCalendarId?: string | null;
  syncAppointmentsToCalendar: boolean;
  readCalendarForAvailability: boolean;
  syncContactsToGoogle: boolean;
  errorMessage?: string | null; // Para exibir erros da API do Google
}

interface GoogleCalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string; // Para filtrar calendários com permissão de escrita
}

export default function IntegrationsPage() {
  const user = useUser({ or: "redirect" });
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPathname = usePathname(); // Para remover query params

  const [clinicorpFormData, setClinicorpFormData] = useState<ClinicorpFormData>({
    isActive: false, username: "", subscriberId: "", companyId: "",
    enableAppointmentConfirmation: true, enableReturnCallMessages: false, enableBudgetFollowupMessages: false,
  });
  const [isClinicorpLoading, setIsClinicorpLoading] = useState(false);
  const [isFetchingClinicorpConfig, setIsFetchingClinicorpConfig] = useState(true);

  const [googleConfig, setGoogleConfig] = useState<GoogleConfigData>({
    isActive: false, email: null, selectedCalendarId: null,
    syncAppointmentsToCalendar: false, readCalendarForAvailability: false, syncContactsToGoogle: false,
  });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFetchingGoogleConfig, setIsFetchingGoogleConfig] = useState(true);
  const [userCalendars, setUserCalendars] = useState<GoogleCalendarListItem[]>([]);

  const fetchClinicorpConfig = useCallback(async () => {
    if (!user) return;
    setIsFetchingClinicorpConfig(true);
    try {
      const response = await apiClient.get<ClinicorpFormData>('/integrations/clinicorp');
      const config = response.data;
      setClinicorpFormData({
        isActive: config.isActive || false,
        username: config.username || "",
        password: "", // Nunca preencher a senha no GET
        subscriberId: config.subscriberId || "",
        companyId: config.companyId || "",
        enableAppointmentConfirmation: typeof config.enableAppointmentConfirmation === 'boolean' ? config.enableAppointmentConfirmation : true,
        enableReturnCallMessages: typeof config.enableReturnCallMessages === 'boolean' ? config.enableReturnCallMessages : false,
        enableBudgetFollowupMessages: typeof config.enableBudgetFollowupMessages === 'boolean' ? config.enableBudgetFollowupMessages : false,
        lastSyncAt: config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString('pt-BR') : null,
        errorMessage: config.errorMessage || null,
      });
    } catch (error: any) {
      logger.error("Erro ao buscar config Clinicorp:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Falha ao carregar configurações Clinicorp.");
    } finally {
      setIsFetchingClinicorpConfig(false);
    }
  }, [user]);

  const fetchGoogleConfig = useCallback(async () => {
    if (!user) return;
    setIsFetchingGoogleConfig(true);
    setUserCalendars([]); // Limpa calendários antes de buscar novos
    try {
      const response = await apiClient.get<GoogleConfigData>('/integrations/google/config');
      const config = response.data;
      setGoogleConfig({
        isActive: config.isActive || false,
        email: config.email,
        selectedCalendarId: config.selectedCalendarId,
        syncAppointmentsToCalendar: config.syncAppointmentsToCalendar || false,
        readCalendarForAvailability: config.readCalendarForAvailability || false,
        syncContactsToGoogle: config.syncContactsToGoogle || false,
        errorMessage: config.errorMessage || null,
      });
      if (config.isActive) {
        const calendarsResponse = await apiClient.get<GoogleCalendarListItem[]>('/integrations/google/calendars');
        setUserCalendars(calendarsResponse.data?.filter(cal => cal.accessRole === 'writer' || cal.accessRole === 'owner') || []);
      }
    } catch (error: any) {
      logger.error("Erro ao buscar config Google:", error.response?.data || error.message);
      setGoogleConfig({ isActive: false, email: null, selectedCalendarId: null, syncAppointmentsToCalendar: false, readCalendarForAvailability: false, syncContactsToGoogle: false, errorMessage: "Falha ao carregar configuração." });
    } finally {
      setIsFetchingGoogleConfig(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchClinicorpConfig();
      fetchGoogleConfig();
    }
  }, [user, fetchClinicorpConfig, fetchGoogleConfig]);

  useEffect(() => {
    const googleAuthSuccess = searchParams.get('google_auth_success');
    const googleAuthError = searchParams.get('google_auth_error');

    if (googleAuthSuccess) {
      toast.success("Conta Google conectada com sucesso! Selecione seu calendário principal e salve.");
      fetchGoogleConfig();
      router.replace(currentPathname);
    }
    if (googleAuthError) {
      const decodedError = decodeURIComponent(googleAuthError);
      toast.error(`Falha ao conectar conta Google: ${decodedError === 'access_denied' ? 'Permissão negada.' : `Erro (${decodedError || 'desconhecido'})`}`);
      fetchGoogleConfig();
      router.replace(currentPathname);
    }
  }, [searchParams, fetchGoogleConfig, router, currentPathname]);

  const handleClinicorpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClinicorpFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleClinicorpSwitchChange = (checked: boolean, name: keyof ClinicorpFormData) => {
    setClinicorpFormData(prev => ({ ...prev, [name]: checked }));
  };
  const handleClinicorpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sessão não encontrada."); return; }
    setIsClinicorpLoading(true);
    try {
      const payload: Partial<ClinicorpFormData> = { ...clinicorpFormData };
      if (!clinicorpFormData.password || clinicorpFormData.password.trim() === "") {
        delete payload.password;
      }
      const response = await apiClient.post('/integrations/clinicorp', payload);
      toast.success(response.data.message || "Configuração Clinicorp salva!");
      if (payload.password) setClinicorpFormData(prev => ({ ...prev, password: "" }));
      if (response.data.integration) {
            const updatedIntegration = response.data.integration;
            setClinicorpFormData(prev => ({
                ...prev,
                lastSyncAt: updatedIntegration.lastSyncAt ? new Date(updatedIntegration.lastSyncAt).toLocaleString('pt-BR') : null,
                errorMessage: updatedIntegration.errorMessage || null,
            }));
        }
    } catch (error: any) {
      logger.error("Erro ao salvar config Clinicorp:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Ocorreu um erro ao salvar.");
    } finally {
      setIsClinicorpLoading(false);
    }
  };

  const handleGoogleConnect = () => {
    if (!user) return;
    window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}/integrations/google/auth`;
  };

  const handleGoogleConfigInputChange = (
    field: keyof GoogleConfigData,
    value: string | boolean
  ) => {
    setGoogleConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveGoogleConfig = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !googleConfig) return;
    setIsGoogleLoading(true);
    try {
      const payload = {
        selectedCalendarId: googleConfig.selectedCalendarId,
        syncAppointmentsToCalendar: googleConfig.syncAppointmentsToCalendar,
        readCalendarForAvailability: googleConfig.readCalendarForAvailability,
        syncContactsToGoogle: googleConfig.syncContactsToGoogle,
        isActive: googleConfig.isActive,
      };
      const response = await apiClient.post('/integrations/google/config', payload);
      toast.success(response.data.message || "Configuração Google salva!");
      if (response.data.config) {
        setGoogleConfig(prev => ({
            ...(prev as GoogleConfigData), // Garante que prev não seja null
            ...response.data.config,
            email: prev?.email // Preserva o email que não vem no save config response
        }));
      }
    } catch (error: any) {
      logger.error("Erro ao salvar config Google:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Falha ao salvar configuração Google.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!user || !googleConfig || !googleConfig.isActive) return;
    if (!confirm("Tem certeza que deseja desconectar sua conta Google? Isso removerá a autorização e limpará suas configurações.")) return;
    setIsGoogleLoading(true);
    try {
        await apiClient.post('/integrations/google/disconnect');
        toast.success("Conta Google desconectada com sucesso.");
        setGoogleConfig({ isActive: false, email:null, selectedCalendarId: null, syncAppointmentsToCalendar: false, readCalendarForAvailability: false, syncContactsToGoogle: false, errorMessage: null });
        setUserCalendars([]);
    } catch (error: any) {
        logger.error("Erro ao desconectar Google:", error.response?.data || error.message);
        toast.error(error.response?.data?.message || "Falha ao desconectar Google.");
    } finally {
        setIsGoogleLoading(false);
    }
  };

  if (isFetchingClinicorpConfig || isFetchingGoogleConfig) {
    return (
        <div className="p-4 md:p-6 space-y-8">
            <Skeleton className="h-10 w-1/3 mb-4"/>
            <Skeleton className="h-8 w-2/3 mb-6"/>
            <Card className="max-w-2xl mx-auto"><CardHeader><Skeleton className="h-6 w-1/2 mb-2"/><Skeleton className="h-4 w-3/4"/></CardHeader><CardContent className="space-y-4"><Skeleton className="h-16 w-full"/><Skeleton className="h-10 w-32"/></CardContent></Card>
            <Card className="max-w-2xl mx-auto"><CardHeader><Skeleton className="h-6 w-1/2 mb-2"/><Skeleton className="h-4 w-3/4"/></CardHeader><CardContent className="space-y-4"><Skeleton className="h-16 w-full"/><Skeleton className="h-10 w-32"/></CardContent></Card>
        </div>
    );
  }
  if (!user) return <div className="p-6 flex justify-center items-center h-full">Carregando informações do usuário...</div>;

  return (
    <div className="p-4 md:p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Integrações</h1>
        <p className="text-muted-foreground mt-1">
          Conecte a Clara com outros sistemas para automatizar e otimizar seus fluxos de trabalho.
        </p>
      </header>

      {/* Card Clinicorp */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Zap className="mr-3 h-6 w-6 text-blue-500" /> Integração com Clinicorp
          </CardTitle>
          <CardDescription>
            Conecte sua conta Clinicorp para automatizar agendamentos, confirmações e mais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleClinicorpSubmit} className="space-y-6">
            <div className="flex items-center space-x-3 p-4 border rounded-md bg-background shadow-sm">
              <Switch
                id="clinicorpIsActive"
                name="isActive"
                checked={clinicorpFormData.isActive}
                onCheckedChange={(checked) => handleClinicorpSwitchChange(checked, "isActive")}
              />
              <Label htmlFor="clinicorpIsActive" className="text-base font-medium cursor-pointer">
                Ativar Integração Clinicorp
              </Label>
            </div>

            {clinicorpFormData.isActive && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="usernameClinicorp">Usuário Clinicorp</Label>
                  <Input id="usernameClinicorp" name="username" value={clinicorpFormData.username} onChange={handleClinicorpInputChange} placeholder="seu_usuario_clinicorp" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="passwordClinicorp">Senha Clinicorp</Label>
                  <Input id="passwordClinicorp" name="password" type="password" value={clinicorpFormData.password} onChange={handleClinicorpInputChange} placeholder="Digite para alterar" autoComplete="new-password" />
                  <p className="text-xs text-muted-foreground">Deixe em branco se não deseja alterar a senha salva.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="subscriberId">ID de Assinante Clinicorp</Label>
                        <Input id="subscriberId" name="subscriberId" value={clinicorpFormData.subscriberId} onChange={handleClinicorpInputChange} placeholder="12345" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="companyId">ID da Empresa Clinicorp</Label>
                        <Input id="companyId" name="companyId" value={clinicorpFormData.companyId} onChange={handleClinicorpInputChange} placeholder="67890" />
                    </div>
                </div>
                <fieldset className="pt-4">
                  <legend className="text-md font-semibold mb-2 text-foreground">Funcionalidades da Integração Clinicorp</legend>
                  <div className="space-y-3">
                    {[
                        {id: "enableAppointmentConfirmation", label: "Confirmar agendamentos do dia seguinte"},
                        {id: "enableReturnCallMessages", label: "Enviar mensagens para pacientes antigos (retorno)"},
                        {id: "enableBudgetFollowupMessages", label: "Enviar mensagens para acompanhamento de orçamentos"},
                    ].map(feature => (
                        <div key={feature.id} className="flex items-center space-x-3">
                            <Switch id={feature.id} checked={clinicorpFormData[feature.id as keyof ClinicorpFormData] as boolean} onCheckedChange={(checked) => handleClinicorpSwitchChange(checked, feature.id as keyof ClinicorpFormData)} />
                            <Label htmlFor={feature.id} className="font-normal">{feature.label}</Label>
                        </div>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
             <Button type="submit" disabled={isClinicorpLoading || !clinicorpFormData.isActive} className="w-full sm:w-auto mt-4">
              {isClinicorpLoading ? "Salvando..." : "Salvar Configurações Clinicorp"}
            </Button>
          </form>
        </CardContent>
        {clinicorpFormData.isActive && (clinicorpFormData.lastSyncAt || clinicorpFormData.errorMessage) && (
            <CardFooter className="text-xs text-muted-foreground border-t pt-4 mt-4">
                {clinicorpFormData.errorMessage ? (
                    <p className="text-destructive flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>Última tentativa de sincronização falhou: {clinicorpFormData.errorMessage}</p>
                ) : clinicorpFormData.lastSyncAt ? (
                    <p className="text-green-600 dark:text-green-400 flex items-center"><CheckCircle className="h-4 w-4 mr-1"/>Última sincronização bem-sucedida: {clinicorpFormData.lastSyncAt}</p>
                ) : null}
            </CardFooter>
        )}
      </Card>

      {/* Card Google (Calendar & Contacts) */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <img src="/google-icon.png" alt="Google" className="mr-3 h-7 w-7" />
            Integração com Google
          </CardTitle>
          <CardDescription>
            Conecte sua conta Google para sincronizar agenda e contatos, melhorando a organização e o alcance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!googleConfig?.isActive ? (
            <div className="text-center space-y-4 py-6">
              <p className="text-muted-foreground">Nenhuma conta Google conectada.</p>
              <Button onClick={handleGoogleConnect} disabled={isGoogleLoading} size="lg">
                <LinkIcon className="mr-2 h-5 w-5" /> Conectar com Google
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSaveGoogleConfig} className="space-y-6">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/20 dark:border-green-700">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2"/> Conectado como: <span className="font-medium ml-1">{googleConfig.email || "Usuário Google"}</span>
                </p>
                {googleConfig.errorMessage && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1"/> Erro: {googleConfig.errorMessage}
                    </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="selectedCalendarId" className="font-medium">Calendário Principal para Integração</Label>
                {userCalendars.length > 0 ? (
                  <Select
                    value={googleConfig.selectedCalendarId || ""}
                    onValueChange={(value) => handleGoogleConfigInputChange("selectedCalendarId", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um calendário com permissão de escrita" />
                    </SelectTrigger>
                    <SelectContent>
                      {userCalendars.map(cal => (
                        <SelectItem key={cal.id} value={cal.id}>
                          {cal.summary} {cal.primary && "(Principal da Conta Google)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground p-2 bg-muted rounded">
                    {isFetchingGoogleConfig ? "Carregando calendários..." : "Nenhum calendário com permissão de escrita encontrado ou falha ao carregar. Tente reconectar sua conta Google."}
                  </p>
                )}
              </div>

              <fieldset className="pt-2 space-y-3">
                <legend className="text-md font-semibold mb-2 text-foreground">Funcionalidades Google</legend>
                 <div className="flex items-center space-x-3">
                    <Switch
                        id="googleIsActiveToggle" // ID único para o switch
                        checked={googleConfig.isActive}
                        onCheckedChange={(checked) => handleGoogleConfigInputChange("isActive", checked)}
                    />
                    <Label htmlFor="googleIsActiveToggle" className="font-normal">Manter integração Google Ativa</Label>
                </div>
                <div className="pl-4 border-l-2 border-border dark:border-gray-700 py-2 space-y-3">
                    <Label className="font-medium text-sm text-muted-foreground flex items-center">
                        <img src="/google-calendar-icon.svg" alt="Google Calendar" className="mr-2 h-4 w-4" />
                        Google Calendar:
                    </Label>
                    <div className="flex items-center space-x-3">
                      <Switch
                        id="syncAppointmentsToCalendar"
                        checked={googleConfig.syncAppointmentsToCalendar}
                        onCheckedChange={(checked) => handleGoogleConfigInputChange("syncAppointmentsToCalendar", checked)}
                        disabled={!googleConfig.selectedCalendarId || !googleConfig.isActive}
                      />
                      <Label htmlFor="syncAppointmentsToCalendar" className={!googleConfig.selectedCalendarId || !googleConfig.isActive ? "text-muted-foreground cursor-not-allowed" : "font-normal"}>
                        Criar/atualizar eventos no Google Calendar
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Switch
                        id="readCalendarForAvailability"
                        checked={googleConfig.readCalendarForAvailability}
                        onCheckedChange={(checked) => handleGoogleConfigInputChange("readCalendarForAvailability", checked)}
                        disabled={!googleConfig.selectedCalendarId || !googleConfig.isActive}
                      />
                      <Label htmlFor="readCalendarForAvailability" className={!googleConfig.selectedCalendarId || !googleConfig.isActive ? "text-muted-foreground cursor-not-allowed" : "font-normal"}>
                        Permitir que a IA leia o calendário para disponibilidade
                      </Label>
                    </div>
                </div>

                <div className="pl-4 border-l-2 border-border dark:border-gray-700 py-2 space-y-3">
                    <Label className="font-medium text-sm text-muted-foreground flex items-center">
                        <Contact2 className="mr-2 h-4 w-4" />
                        Google Contacts:
                    </Label>
                    <div className="flex items-center space-x-3">
                        <Switch
                            id="syncContactsToGoogle"
                            checked={googleConfig.syncContactsToGoogle}
                            onCheckedChange={(checked) => handleGoogleConfigInputChange("syncContactsToGoogle", checked)}
                            disabled={!googleConfig.isActive}
                        />
                        <Label htmlFor="syncContactsToGoogle" className={!googleConfig.isActive ? "text-muted-foreground cursor-not-allowed" : "font-normal"}>
                            Sincronizar contatos de pacientes ao Google Contacts
                        </Label>
                    </div>
                </div>
              </fieldset>
              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <Button type="submit" disabled={isGoogleLoading || !googleConfig.isActive || (!googleConfig.selectedCalendarId && (googleConfig.syncAppointmentsToCalendar || googleConfig.readCalendarForAvailability))} className="flex-grow">
                  {isGoogleLoading ? "Salvando..." : "Salvar Configuração Google"}
                </Button>
                <Button type="button" variant="destructive" onClick={handleGoogleDisconnect} disabled={isGoogleLoading} className="flex-grow sm:flex-grow-0">
                  <LogOut className="mr-2 h-4 w-4" /> Desconectar Conta Google
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}