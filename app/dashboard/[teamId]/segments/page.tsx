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
import { AlertCircle, CheckCircle, Zap, Link as LinkIcon, LogOut, ListChecks, Contact2, Settings } from "lucide-react"; // LinkIcon, LogOut, ListChecks, Contact2
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams, useRouter, usePathname, useParams } from "next/navigation"; // Adicionado usePathname

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
  const params = useParams<{ teamId: string }>(); // Para o redirect do Google

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

  const [isPageLoading, setIsPageLoading] = useState(true);


  const fetchClinicorpConfig = useCallback(async () => {
    if (!user) return;
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
      setIsPageLoading(true);
      Promise.all([fetchClinicorpConfig(), fetchGoogleConfig()])
        .catch((error) => { // Adiciona um catch geral para o Promise.all
            logger.error("Erro ao buscar todas as configurações de integração:", error);
            toast.error("Ocorreu um erro ao carregar todas as configurações de integração.");
        })
        .finally(() => {
            setIsFetchingClinicorpConfig(false); // Garante que os loadings individuais sejam falsos
            setIsFetchingGoogleConfig(false);
            setIsPageLoading(false);
        });
    }
  }, [user, fetchClinicorpConfig, fetchGoogleConfig]);

  useEffect(() => {
    const googleAuthSuccess = searchParams.get('google_auth_success');
    const googleAuthError = searchParams.get('google_auth_error');
    const teamIdParam = params.teamId || "defaultTeamId"; // Garante que teamId não seja undefined

    if (googleAuthSuccess) {
      toast.success("Conta Google conectada com sucesso! Ajuste suas preferências e salve.");
      fetchGoogleConfig(); // Re-busca para atualizar a UI com dados do Google
      router.replace(`/dashboard/${teamIdParam}/segments`);
    }
    if (googleAuthError) {
      const decodedError = decodeURIComponent(googleAuthError);
      toast.error(`Falha ao conectar conta Google: ${decodedError === 'access_denied' ? 'Permissão negada.' : `Erro (${decodedError || 'desconhecido'})`}`);
      fetchGoogleConfig(); // Re-busca mesmo em erro para limpar o estado
      router.replace(`/dashboard/${teamIdParam}/segments`);
    }
  }, [searchParams, fetchGoogleConfig, router, params.teamId]);

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

  const handleGoogleConnect = async () => {
    if (!user) return;
    setIsGoogleLoading(true); // Adicionar um estado de loading para o botão
    try {
        // 1. Frontend chama a API para obter a URL de autorização do Google
        const response = await apiClient.get<{ authUrl: string }>('/integrations/google/initiate-auth-url'); // Novo endpoint
        // 2. Frontend redireciona para a URL do Google recebida
        window.location.href = response.data.authUrl;
    } catch (error: any) {
        toast.error(error.response?.data?.message || "Falha ao iniciar conexão com Google.");
        logger.error("Erro ao iniciar conexão Google:", error);
    } finally {
        setIsGoogleLoading(false);
    }
};

  const handleGoogleSwitchChange = (checked: boolean, name: keyof Pick<GoogleConfigData, "syncAppointmentsToCalendar" | "readCalendarForAvailability" | "syncContactsToGoogle" | "isActive">) => { // Mais específico
    setGoogleConfig(prev => ({ ...prev, [name]: checked }));
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

  
  if (isPageLoading) { // Usando o estado de loading global
    return (
        <div className="p-4 md:p-6 space-y-8">
            <Skeleton className="h-10 w-1/3 mb-4"/>
            <Skeleton className="h-8 w-2/3 mb-6"/>
            <div className="grid md:grid-cols-2 gap-6">
                <Card className="max-w-2xl mx-auto"><CardHeader><Skeleton className="h-6 w-1/2 mb-2"/><Skeleton className="h-4 w-3/4"/></CardHeader><CardContent className="space-y-4"><Skeleton className="h-16 w-full"/><Skeleton className="h-10 w-32"/></CardContent></Card>
                <Card className="max-w-2xl mx-auto"><CardHeader><Skeleton className="h-6 w-1/2 mb-2"/><Skeleton className="h-4 w-3/4"/></CardHeader><CardContent className="space-y-4"><Skeleton className="h-16 w-full"/><Skeleton className="h-10 w-32"/></CardContent></Card>
            </div>
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

     
        {/* Card Google */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Image src="/google-icon.png" alt="Google" width={28} height={28} className="mr-3" />
              Integração com Google
            </CardTitle>
            <CardDescription>
              Sincronize agenda e contatos com sua conta Google.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!googleConfig?.isActive ? (
              <div className="text-center space-y-4 py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">Nenhuma conta Google conectada.</p>
                <Button onClick={handleGoogleConnect} disabled={isGoogleLoading} size="lg">
                  <LinkIcon className="mr-2 h-5 w-5" /> Conectar com Google
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSaveGoogleConfig} className="space-y-6">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/30 dark:border-green-700">
                  <p className="text-sm text-green-700 dark:text-green-300 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2"/> Conectado como: <span className="font-medium ml-1">{googleConfig.email || "Usuário Google"}</span>
                  </p>
                </div>
                {googleConfig.errorMessage && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0"/> Erro na integração: {googleConfig.errorMessage}
                    </p>
                )}

                <div className="flex items-center space-x-3 pt-2">
                    <Switch
                        id="googleIsActiveToggle"
                        checked={googleConfig.isActive}
                        onCheckedChange={(checked) => handleGoogleConfigInputChange("isActive", checked)}
                    />
                    <Label htmlFor="googleIsActiveToggle" className="font-medium">Manter integração Google Ativa</Label>
                </div>


                {googleConfig.isActive && (
                    <>
                        <div className="space-y-1">
                        <Label htmlFor="selectedCalendarId" className="font-medium">Calendário Principal</Label>
                        <Select
                            value={googleConfig.selectedCalendarId || ""}
                            onValueChange={(value) => handleGoogleConfigInputChange("selectedCalendarId", value)}
                            disabled={userCalendars.length === 0 && !(googleConfig.selectedCalendarId === 'primary')}
                        >
                            <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione um calendário..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="primary">Calendário Principal da Conta</SelectItem>
                                {userCalendars.map(cal => (
                                    <SelectItem key={cal.id} value={cal.id} disabled={cal.accessRole !== 'writer' && cal.accessRole !== 'owner'}>
                                    {cal.summary} {cal.primary && "(Padrão Google)"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">Apenas calendários com permissão de escrita são listados. 'Primary' é o calendário padrão da sua conta Google.</p>
                        </div>

                        <fieldset className="pt-3 space-y-3">
                        <legend className="text-md font-semibold mb-1 text-foreground">Funcionalidades</legend>
                        <div className="pl-4 border-l-2 border-border dark:border-neutral-700 py-2 space-y-3">
                            <Label className="font-medium text-sm text-muted-foreground flex items-center">
                                <Image src="/google-calendar-icon.svg" alt="Google Calendar" width={16} height={16} className="mr-2" />
                                Google Calendar:
                            </Label>
                            <div className="flex items-center space-x-3">
                                <Switch id="syncAppointmentsToCalendar" checked={googleConfig.syncAppointmentsToCalendar} onCheckedChange={(c) => handleGoogleSwitchChange(c, "syncAppointmentsToCalendar")} disabled={!googleConfig.selectedCalendarId}/>
                                <Label htmlFor="syncAppointmentsToCalendar" className={!googleConfig.selectedCalendarId ? "text-muted-foreground" : "font-normal"}>Criar/atualizar eventos no Google Calendar</Label>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Switch id="readCalendarForAvailability" checked={googleConfig.readCalendarForAvailability} onCheckedChange={(c) => handleGoogleSwitchChange(c, "readCalendarForAvailability")} disabled={!googleConfig.selectedCalendarId}/>
                                <Label htmlFor="readCalendarForAvailability" className={!googleConfig.selectedCalendarId ? "text-muted-foreground" : "font-normal"}>Permitir que a IA leia o calendário para disponibilidade</Label>
                            </div>
                        </div>

                        <div className="pl-4 border-l-2 border-border dark:border-neutral-700 py-2 space-y-3">
                            <Label className="font-medium text-sm text-muted-foreground flex items-center">
                                <Contact2 className="mr-2 h-4 w-4 text-blue-600" />
                                Google Contacts:
                            </Label>
                            <div className="flex items-center space-x-3">
                                <Switch id="syncContactsToGoogle" checked={googleConfig.syncContactsToGoogle} onCheckedChange={(c) => handleGoogleSwitchChange(c, "syncContactsToGoogle")} />
                                <Label htmlFor="syncContactsToGoogle" className="font-normal">Sincronizar contatos de pacientes ao Google Contacts</Label>
                            </div>
                        </div>
                        </fieldset>
                    </>
                )}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button type="submit" disabled={isGoogleLoading || (googleConfig.isActive && (!googleConfig.selectedCalendarId && (googleConfig.syncAppointmentsToCalendar || googleConfig.readCalendarForAvailability)))} className="flex-grow">
                  <Settings className="mr-2 h-4 w-4" /> {isGoogleLoading ? "Salvando..." : "Salvar Configuração Google"}
                </Button>
                {googleConfig.isActive && (
                    <Button type="button" variant="outline" onClick={handleGoogleDisconnect} disabled={isGoogleLoading} className="flex-grow sm:flex-grow-0 text-destructive border-destructive hover:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" /> Desconectar Google
                    </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}