"use client";

import React, { useState, useEffect, FormEvent, useCallback } from "react";
import { useUser } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import apiClient from "@/lib/axios";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Zap, Link as LinkIcon, LogOut, Calendar, Contact2, Settings, ShieldCheck, ArrowRightLeft, UploadCloud } from "lucide-react";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSearchParams, useRouter, usePathname, useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

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
  lastSyncAt?: string | null;
  errorMessage?: string | null;
}

interface GoogleConfigData {
  isActive: boolean;
  email?: string | null;
  selectedCalendarId?: string | null;
  syncAppointmentsToCalendar: boolean;
  readCalendarForAvailability: boolean;
  syncContactsToGoogle: boolean;
  errorMessage?: string | null;
}

interface GoogleCalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
}

// Strategy Mapping
type CalendarStrategy = 'none' | 'availability_only' | 'full_sync' | 'backup_only';

export default function IntegrationsPage() {
  const user = useUser({ or: "redirect" });
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ teamId: string }>();

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
  const [calendarStrategy, setCalendarStrategy] = useState<CalendarStrategy>('none');

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFetchingGoogleConfig, setIsFetchingGoogleConfig] = useState(true);
  const [userCalendars, setUserCalendars] = useState<GoogleCalendarListItem[]>([]);

  const [isPageLoading, setIsPageLoading] = useState(true);

  // Helper to determine strategy from flags
  const determineStrategy = (config: GoogleConfigData): CalendarStrategy => {
    if (config.readCalendarForAvailability && config.syncAppointmentsToCalendar) return 'full_sync';
    if (config.readCalendarForAvailability && !config.syncAppointmentsToCalendar) return 'availability_only';
    if (!config.readCalendarForAvailability && config.syncAppointmentsToCalendar) return 'backup_only';
    return 'none';
  };

  const fetchClinicorpConfig = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiClient.get<ClinicorpFormData>('/integrations/clinicorp');
      const config = response.data;
      setClinicorpFormData({
        isActive: config.isActive || false,
        username: config.username || "",
        password: "",
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
    setUserCalendars([]);
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
      setCalendarStrategy(determineStrategy(config));

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
        .catch((error) => {
            logger.error("Erro ao buscar todas as configurações:", error);
            toast.error("Ocorreu um erro ao carregar configurações.");
        })
        .finally(() => {
            setIsFetchingClinicorpConfig(false);
            setIsFetchingGoogleConfig(false);
            setIsPageLoading(false);
        });
    }
  }, [user, fetchClinicorpConfig, fetchGoogleConfig]);

  useEffect(() => {
    const googleAuthSuccess = searchParams.get('google_auth_success');
    const googleAuthError = searchParams.get('google_auth_error');
    const teamIdParam = params.teamId || "defaultTeamId";

    if (googleAuthSuccess) {
      toast.success("Google conectado! Configure sua estratégia de agenda.");
      fetchGoogleConfig();
      router.replace(`/dashboard/${teamIdParam}/segments`);
    }
    if (googleAuthError) {
      const decodedError = decodeURIComponent(googleAuthError);
      toast.error(`Falha ao conectar: ${decodedError}`);
      fetchGoogleConfig();
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
    if (!user) return;
    setIsClinicorpLoading(true);
    try {
      const payload: Partial<ClinicorpFormData> = { ...clinicorpFormData };
      if (!clinicorpFormData.password || clinicorpFormData.password.trim() === "") {
        delete payload.password;
      }
      const response = await apiClient.post('/integrations/clinicorp', payload);
      toast.success(response.data.message || "Clinicorp salvo!");
      if (payload.password) setClinicorpFormData(prev => ({ ...prev, password: "" }));
       if (response.data.integration) {
            const updated = response.data.integration;
            setClinicorpFormData(prev => ({
                ...prev,
                lastSyncAt: updated.lastSyncAt ? new Date(updated.lastSyncAt).toLocaleString('pt-BR') : null,
                errorMessage: updated.errorMessage || null,
            }));
        }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao salvar Clinicorp.");
    } finally {
      setIsClinicorpLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    if (!user) return;
    setIsGoogleLoading(true);
    try {
        const response = await apiClient.get<{ authUrl: string }>('/integrations/google/auth');
        window.location.href = response.data.authUrl;
    } catch (error: any) {
        toast.error("Erro ao iniciar conexão Google.");
        setIsGoogleLoading(false);
    }
  };

  const handleStrategyChange = (value: CalendarStrategy) => {
      setCalendarStrategy(value);
      setGoogleConfig(prev => {
          let updates = { syncAppointmentsToCalendar: false, readCalendarForAvailability: false };
          if (value === 'full_sync') { updates = { syncAppointmentsToCalendar: true, readCalendarForAvailability: true }; }
          else if (value === 'availability_only') { updates = { syncAppointmentsToCalendar: false, readCalendarForAvailability: true }; }
          else if (value === 'backup_only') { updates = { syncAppointmentsToCalendar: true, readCalendarForAvailability: false }; }
          return { ...prev, ...updates };
      });
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
      toast.success("Configuração Google atualizada!");
       if (response.data.config) {
        setGoogleConfig(prev => ({
            ...(prev as GoogleConfigData),
            ...response.data.config,
            email: prev?.email
        }));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao salvar Google Config.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!confirm("Desconectar Google? Isso irá parar todas as sincronizações.")) return;
    setIsGoogleLoading(true);
    try {
        await apiClient.post('/integrations/google/disconnect');
        toast.success("Desconectado.");
        setGoogleConfig({ isActive: false, email:null, selectedCalendarId: null, syncAppointmentsToCalendar: false, readCalendarForAvailability: false, syncContactsToGoogle: false, errorMessage: null });
        setUserCalendars([]);
        setCalendarStrategy('none');
    } catch (error) {
        toast.error("Erro ao desconectar.");
    } finally {
        setIsGoogleLoading(false);
    }
  };

  
  if (isPageLoading) {
    return (
        <div className="p-4 md:p-6 space-y-8">
            <Skeleton className="h-10 w-1/3 mb-4"/>
            <Skeleton className="h-40 w-full mb-6"/>
             <Skeleton className="h-40 w-full mb-6"/>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Integrações do Sistema</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie como a Clara interage com sistemas externos como Clinicorp e Google.
        </p>
      </header>

      {/* CLINICORP SECTION (Preserved as is mostly) */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Zap className="mr-2 h-5 w-5 text-blue-500" /> Clinicorp (Principal)
          </CardTitle>
          <CardDescription>
            Sistema principal de gestão. A Clara usará este sistema para verificar agenda oficial e pacientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleClinicorpSubmit} className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                    <Label className="text-base">Ativar Conexão Clinicorp</Label>
                    <p className="text-xs text-muted-foreground">Necessário para agendamentos automáticos.</p>
                </div>
                <Switch checked={clinicorpFormData.isActive} onCheckedChange={(c) => handleClinicorpSwitchChange(c, "isActive")} />
            </div>

            {clinicorpFormData.isActive && (
              <div className="grid gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
                 <div className="grid sm:grid-cols-2 gap-4">
                    <Input name="username" value={clinicorpFormData.username} onChange={handleClinicorpInputChange} placeholder="Usuário/Login" />
                    <Input name="password" type="password" value={clinicorpFormData.password} onChange={handleClinicorpInputChange} placeholder="Senha (vazio para manter)" />
                    <Input name="subscriberId" value={clinicorpFormData.subscriberId} onChange={handleClinicorpInputChange} placeholder="ID Assinante" />
                    <Input name="companyId" value={clinicorpFormData.companyId} onChange={handleClinicorpInputChange} placeholder="ID Empresa" />
                 </div>
                 {/* Features Toggles Compact */}
                 <div className="flex flex-wrap gap-4 mt-2">
                     {[
                        {id: "enableAppointmentConfirmation", label: "Auto Confirmar"},
                        {id: "enableReturnCallMessages", label: "Msg Retorno"},
                        {id: "enableBudgetFollowupMessages", label: "Msg Orçamento"},
                    ].map(f => (
                         <div key={f.id} className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-full border">
                            <Switch id={f.id} checked={clinicorpFormData[f.id as keyof ClinicorpFormData] as boolean} onCheckedChange={(c) => handleClinicorpSwitchChange(c, f.id as keyof ClinicorpFormData)} className="scale-75 origin-left" />
                            <Label htmlFor={f.id} className="text-xs font-medium cursor-pointer">{f.label}</Label>
                        </div>
                    ))}
                 </div>
              </div>
            )}
             <Button type="submit" disabled={isClinicorpLoading || !clinicorpFormData.isActive} size="sm" className="hidden sm:flex">
               Salvar Clinicorp
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* GOOGLE INTEGRATION REFACTORED */}
      <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              <div className="flex items-center">
                   <Image src="/google-icon.png" alt="Google" width={24} height={24} className="mr-2" />
                   Recursos Google & Agenda
              </div>
              {googleConfig.isActive && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Conectado</Badge>}
            </CardTitle>
            <CardDescription>
              Defina a <strong>intenção da Clara</strong> ao acessar sua agenda Google.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!googleConfig.isActive ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                    <div className="p-3 bg-muted rounded-full"><Calendar className="h-8 w-8 text-muted-foreground" /></div>
                    <div className="max-w-md">
                        <p className="font-medium">Conecte sua conta Google</p>
                        <p className="text-sm text-muted-foreground">Permita que a Clara verifique conflitos com seus compromissos pessoais ou sincronize contatos.</p>
                    </div>
                    <Button onClick={handleGoogleConnect} disabled={isGoogleLoading}>
                        <LinkIcon className="mr-2 h-4 w-4" /> Conectar Agora
                    </Button>
                </div>
            ) : (
                <form onSubmit={handleSaveGoogleConfig} className="space-y-6">
                    {/* Account Info */}
                     <div className="flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900 rounded-md">
                        <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                {googleConfig.email?.charAt(0).toUpperCase() || "G"}
                             </div>
                             <div>
                                 <p className="text-sm font-medium text-foreground">{googleConfig.email}</p>
                                 <p className="text-xs text-muted-foreground">Conta Vinculada</p>
                             </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={handleGoogleDisconnect} className="text-destructive h-8 hover:bg-destructive/10">
                            Desconectar
                        </Button>
                    </div>

                    {/* Calendar Selection */}
                    <div className="space-y-3">
                        <Label>1. Qual calendário a Clara deve acessar?</Label>
                        <Select
                            value={googleConfig.selectedCalendarId || ""}
                            onValueChange={(val) => setGoogleConfig(prev => ({ ...prev, selectedCalendarId: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um calendário..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="primary">Calendário Principal (Padrão)</SelectItem>
                                {userCalendars.map(cal => (
                                    <SelectItem key={cal.id} value={cal.id}>
                                        {cal.summary} {cal.primary && "(Principal)"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* INTENT / STRATEGY SECTION */}
                    <div className="space-y-3">
                        <Label>2. Qual é a estratégia da Clara com este calendário?</Label>
                        <RadioGroup value={calendarStrategy} onValueChange={(val) => handleStrategyChange(val as CalendarStrategy)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* Strategy: Availability Only */}
                            <Label className={`flex flex-col space-y-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors ${calendarStrategy === 'availability_only' ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}>
                                <RadioGroupItem value="availability_only" className="sr-only" />
                                <div className="flex items-center gap-2 font-semibold">
                                     <ShieldCheck className="h-4 w-4 text-blue-500" />
                                     Bloqueio de Conflitos
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    A Clara <strong>apenas lê</strong> este calendário para evitar agendar pacientes em horários que você tem compromissos pessoais.
                                </p>
                                <div className="mt-auto pt-2 flex gap-1 flex-wrap">
                                    <Badge variant="secondary" className="text-[10px]">Leitura: Sim</Badge>
                                    <Badge variant="outline" className="text-[10px]">Escrita: Não</Badge>
                                </div>
                            </Label>

                            {/* Strategy: Full Sync */}
                            <Label className={`flex flex-col space-y-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors ${calendarStrategy === 'full_sync' ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}>
                                <RadioGroupItem value="full_sync" className="sr-only" />
                                <div className="flex items-center gap-2 font-semibold">
                                     <ArrowRightLeft className="h-4 w-4 text-green-500" />
                                     Sincronização Total
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    A Clara <strong>lê e escreve</strong>. Ela evita conflitos e também <strong>cria eventos</strong> no Google quando agenda algo no Clinicorp.
                                </p>
                                <div className="mt-auto pt-2 flex gap-1 flex-wrap">
                                    <Badge variant="secondary" className="text-[10px]">Leitura: Sim</Badge>
                                    <Badge variant="secondary" className="text-[10px]">Escrita: Sim</Badge>
                                </div>
                            </Label>

                            {/* Strategy: Backup Log */}
                            <Label className={`flex flex-col space-y-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors ${calendarStrategy === 'backup_only' ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}>
                                <RadioGroupItem value="backup_only" className="sr-only" />
                                <div className="flex items-center gap-2 font-semibold">
                                     <UploadCloud className="h-4 w-4 text-orange-500" />
                                     Apenas Espelhamento
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    A Clara <strong>não verifica conflitos</strong>, mas copia todos os agendamentos feitos para este calendário como backup.
                                </p>
                                <div className="mt-auto pt-2 flex gap-1 flex-wrap">
                                    <Badge variant="outline" className="text-[10px]">Leitura: Não</Badge>
                                    <Badge variant="secondary" className="text-[10px]">Escrita: Sim</Badge>
                                </div>
                            </Label>
                        </RadioGroup>
                    </div>

                    {/* Contacts Additional Feature */}
                     <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                                <Contact2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                             </div>
                             <div className="space-y-0.5">
                                 <Label className="text-sm font-medium">Sincronizar Contatos (CRMs)</Label>
                                 <p className="text-xs text-muted-foreground">Salvar novos pacientes automaticamente no Google Contacts.</p>
                             </div>
                        </div>
                        <Switch 
                            checked={googleConfig.syncContactsToGoogle} 
                            onCheckedChange={(c) => setGoogleConfig(prev => ({...prev, syncContactsToGoogle: c}))} 
                        />
                    </div>

                    <Button type="submit" disabled={isGoogleLoading || !googleConfig.selectedCalendarId} className="w-full">
                        {isGoogleLoading ? "Aplicando Alterações..." : "Salvar Definições da Clara"}
                    </Button>
                </form>
            )}
          </CardContent>
      </Card>
      
      {/* Footer Info */}
      <p className="text-xs text-center text-muted-foreground pt-8">
          Todas as integrações são processadas de forma segura e criptografada.
      </p>
    </div>
  );
}