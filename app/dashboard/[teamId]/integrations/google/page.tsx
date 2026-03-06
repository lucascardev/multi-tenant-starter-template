"use client";

import React, { useState, useEffect, FormEvent, useCallback } from "react";
import { useUser } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea"; // Adicionado Textarea
import { toast } from "sonner";
import apiClient from "@/lib/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link as LinkIcon, Calendar, Contact2, ShieldCheck, ArrowRightLeft, UploadCloud, ArrowLeft, LogOut, Info, BookOpen, MessageSquare, CalendarCheck, Bell, CheckSquare } from "lucide-react";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const logger = console;

interface GoogleConfigData {
  isActive: boolean;
  email?: string | null;
  selectedCalendarId?: string | null;
  syncAppointmentsToCalendar: boolean;
  readCalendarForAvailability: boolean;
  syncContactsToGoogle: boolean;
  schedulerInstruction?: string | null; // Adicionado
  errorMessage?: string | null;
  // CONFIRMATION FIELDS
  confirmationEnabled?: boolean;
  confirmationTime?: string;
  confirmationDaysBefore?: number;
  confirmationMessageTemplate?: string;
  // REMINDER FIELDS
  remindersEnabled?: boolean;
  reminderTime?: string;
  reminderDaysBefore?: number[]; // ARRAY for reminders
  reminderMessageTemplate?: string;
}

interface GoogleCalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
}

type CalendarStrategy = 'none' | 'availability_only' | 'full_sync' | 'backup_only';

export default function GoogleIntegrationPage() {
  const user = useUser({ or: "redirect" });
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId || "curr";

  const [googleConfig, setGoogleConfig] = useState<GoogleConfigData>({
    isActive: false, email: null, selectedCalendarId: null,
    syncAppointmentsToCalendar: false, readCalendarForAvailability: false, syncContactsToGoogle: false,
    schedulerInstruction: "",
    remindersEnabled: false, reminderTime: "09:00", reminderDaysBefore: [1], reminderMessageTemplate: "",
    confirmationEnabled: false, confirmationTime: "19:00", confirmationDaysBefore: 1, confirmationMessageTemplate: ""
  });
  const [calendarStrategy, setCalendarStrategy] = useState<CalendarStrategy>('none');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFetchingGoogleConfig, setIsFetchingGoogleConfig] = useState(true);
  const [userCalendars, setUserCalendars] = useState<GoogleCalendarListItem[]>([]);

  // Helper to determine strategy from flags
  const determineStrategy = (config: GoogleConfigData): CalendarStrategy => {
    if (config.readCalendarForAvailability && config.syncAppointmentsToCalendar) return 'full_sync';
    if (config.readCalendarForAvailability && !config.syncAppointmentsToCalendar) return 'availability_only';
    if (!config.readCalendarForAvailability && config.syncAppointmentsToCalendar) return 'backup_only';
    return 'none';
  };

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
        schedulerInstruction: config.schedulerInstruction || "",
        errorMessage: config.errorMessage || null,
        // Configurações de Lembrete e Confirmação
        confirmationEnabled: config.confirmationEnabled || false,
        confirmationTime: config.confirmationTime || "19:00",
        confirmationDaysBefore: typeof config.confirmationDaysBefore === 'number' ? config.confirmationDaysBefore : 1,
        confirmationMessageTemplate: config.confirmationMessageTemplate || "",
        remindersEnabled: config.remindersEnabled || false,
        reminderTime: config.reminderTime || "09:00",
        reminderDaysBefore: Array.isArray(config.reminderDaysBefore) ? config.reminderDaysBefore : [1],
        reminderMessageTemplate: config.reminderMessageTemplate || ""
      });
      setCalendarStrategy(determineStrategy(config));

      if (config.isActive) {
        const calendarsResponse = await apiClient.get<GoogleCalendarListItem[]>('/integrations/google/calendars');
        setUserCalendars(calendarsResponse.data?.filter(cal => cal.accessRole === 'writer' || cal.accessRole === 'owner') || []);
      }
    } catch (error: any) {
      logger.error("Erro ao buscar config Google:", error.response?.data || error.message);
      setGoogleConfig({ isActive: false, email: null, selectedCalendarId: null, syncAppointmentsToCalendar: false, readCalendarForAvailability: false, syncContactsToGoogle: false, schedulerInstruction: "", errorMessage: "Falha ao carregar configuração." });
    } finally {
      setIsFetchingGoogleConfig(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsFetchingGoogleConfig(true);
      fetchGoogleConfig();
    }
  }, [user, fetchGoogleConfig]);

  useEffect(() => {
    const googleAuthSuccess = searchParams.get('google_auth_success');
    const googleAuthError = searchParams.get('google_auth_error');
    
    if (googleAuthSuccess) {
      toast.success("Google conectado! Configure sua estratégia de agenda.");
      fetchGoogleConfig();
      router.replace(`/dashboard/${teamId}/integrations/google`);
    }
    if (googleAuthError) {
      const decodedError = decodeURIComponent(googleAuthError);
      toast.error(`Falha ao conectar: ${decodedError}`);
      fetchGoogleConfig();
      router.replace(`/dashboard/${teamId}/integrations/google`);
    }
  }, [searchParams, fetchGoogleConfig, router, teamId]);

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
        schedulerInstruction: googleConfig.schedulerInstruction,
        isActive: googleConfig.isActive,
        // Novos campos
        confirmationEnabled: googleConfig.confirmationEnabled,
        confirmationTime: googleConfig.confirmationTime,
        confirmationDaysBefore: googleConfig.confirmationDaysBefore,
        confirmationMessageTemplate: googleConfig.confirmationMessageTemplate,
        remindersEnabled: googleConfig.remindersEnabled,
        reminderTime: googleConfig.reminderTime,
        reminderDaysBefore: googleConfig.reminderDaysBefore, 
        reminderMessageTemplate: googleConfig.reminderMessageTemplate,
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
        setGoogleConfig({ isActive: false, email:null, selectedCalendarId: null, syncAppointmentsToCalendar: false, readCalendarForAvailability: false, syncContactsToGoogle: false, schedulerInstruction: "", errorMessage: null });
        setUserCalendars([]);
        setCalendarStrategy('none');
    } catch (error) {
        toast.error("Erro ao desconectar.");
    } finally {
        setIsGoogleLoading(false);
    }
  };

  if (isFetchingGoogleConfig) {
     return (
        <div className="p-4 md:p-6 space-y-6">
            <Skeleton className="h-10 w-1/3 mb-4"/>
            <Skeleton className="h-96 w-full"/>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-8 animate-in slide-in-from-right-4 fade-in duration-500">
      <header className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/${teamId}/integrations`}><ArrowLeft className="w-5 h-5"/></Link>
        </Button>
        <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Image src="/google-icon.png" alt="Google" width={28} height={28} />
                Integração Google
            </h1>
            <p className="text-muted-foreground mt-1">
            Configure a estratégia de agenda e sincronização personalizadas.
            </p>
        </div>
      </header>

      <Card className="max-w-4xl mx-auto border-t-4 border-t-green-500">
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              Configurações da Conta
              {googleConfig.isActive && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Conectado</Badge>}
            </CardTitle>
            <CardDescription>
              Defina a <strong>intenção da Clara</strong> ao acessar sua agenda Google.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!googleConfig.isActive ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
                    <div className="p-4 bg-muted rounded-full"><Calendar className="h-10 w-10 text-muted-foreground" /></div>
                    <div className="max-w-md">
                        <p className="font-semibold text-lg">Conecte sua conta Google</p>
                        <p className="text-muted-foreground">Permita que a Clara verifique conflitos com seus compromissos pessoais ou sincronize contatos.</p>
                    </div>
                    <Button onClick={handleGoogleConnect} disabled={isGoogleLoading} size="lg" className="px-8">
                        <LinkIcon className="mr-2 h-4 w-4" /> Conectar Agora
                    </Button>
                </div>
            ) : (
                <form onSubmit={handleSaveGoogleConfig} className="space-y-8">
                    {/* Account Info */}
                     <div className="flex items-center justify-between p-4 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900 rounded-lg">
                        <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                                {googleConfig.email?.charAt(0).toUpperCase() || "G"}
                             </div>
                             <div>
                                 <p className="text-base font-medium text-foreground">{googleConfig.email}</p>
                                 <p className="text-sm text-green-700 dark:text-green-400 font-medium">Conta Vinculada Corretamente</p>
                             </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={handleGoogleDisconnect} className="text-destructive hover:bg-destructive/10">
                            <LogOut className="mr-2 h-4 w-4"/> Desconectar
                        </Button>
                    </div>

                     {/* 1. SELEÇÃO DE CALENDÁRIO & CONTATOS */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Calendar Selection */}
                        <div className="space-y-4">
                            <Label className="text-base">1. Qual calendário a Clara deve acessar?</Label>
                            <Select
                                value={googleConfig.selectedCalendarId || ""}
                                onValueChange={(val) => setGoogleConfig(prev => ({ ...prev, selectedCalendarId: val }))}
                            >
                                <SelectTrigger className="h-12">
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
                            <p className="text-sm text-muted-foreground">O calendário onde a Clara verificará disponibilidade.</p>
                        </div>

                         <div className="space-y-4">
                             <Label className="text-base">Funcionalidades Extras</Label>
                             <div className="flex items-center justify-between p-3 border rounded-lg h-12">
                                <div className="flex items-center gap-3">
                                     <Contact2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                     <Label className="text-sm font-medium cursor-pointer" htmlFor="syncContacts">Sincronizar Contatos (CRM)</Label>
                                </div>
                                <Switch 
                                    id="syncContacts"
                                    checked={googleConfig.syncContactsToGoogle} 
                                    onCheckedChange={(c) => setGoogleConfig(prev => ({...prev, syncContactsToGoogle: c}))} 
                                />
                            </div>
                         </div>
                    </div>

                    {/* AGENDAMENTO INTELIGENTE (TABS) */}
                    <div className="space-y-4 pt-4 border-t">
                        <Label className="text-lg font-semibold flex items-center gap-2">
                             <CalendarCheck className="h-5 w-5 text-indigo-600" />
                             Agendamento Inteligente
                             <Badge variant="secondary" className="text-xs">Novo ✨</Badge>
                        </Label>
                        
                        <Tabs defaultValue="confirmation" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="confirmation" className="flex items-center gap-2">
                                    <CheckSquare className="h-4 w-4" /> Confirmação
                                </TabsTrigger>
                                <TabsTrigger value="reminder" className="flex items-center gap-2">
                                    <Bell className="h-4 w-4" /> Lembrete
                                </TabsTrigger>
                            </TabsList>
                            
                            {/* TAB 1: CONFIRMAÇÃO */}
                            <TabsContent value="confirmation" className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Ativar Pedido de Confirmação</Label>
                                        <p className="text-sm text-muted-foreground">A Clara perguntará ao paciente se ele vai comparecer.</p>
                                    </div>
                                    <Switch 
                                        checked={googleConfig.confirmationEnabled}
                                        onCheckedChange={(c) => setGoogleConfig(prev => ({...prev, confirmationEnabled: c}))}
                                    />
                                </div>

                                {googleConfig.confirmationEnabled && (
                                    <div className="bg-muted/30 border rounded-lg p-4 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label>Horário de Disparo</Label>
                                                <Input 
                                                    type="time" 
                                                    value={googleConfig.confirmationTime} 
                                                    onChange={(e) => setGoogleConfig(prev => ({...prev, confirmationTime: e.target.value}))}
                                                />
                                                <p className="text-xs text-muted-foreground">Horário ideal para pedir confirmação (Ex: 19:00).</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Antecedência (Dias)</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input 
                                                        type="number" 
                                                        min={1} 
                                                        max={7}
                                                        value={googleConfig.confirmationDaysBefore} 
                                                        onChange={(e) => setGoogleConfig(prev => ({...prev, confirmationDaysBefore: parseInt(e.target.value) || 1}))}
                                                        className="w-24"
                                                    />
                                                    <span className="text-sm text-muted-foreground">dia(s) antes da consulta.</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MessageSquare className="h-5 w-5 text-primary" />
                                                    <h5 className="font-semibold text-primary">Mensagens Geradas por I.A.</h5>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Para garantir a máxima naturalidade e evitar que o WhatsApp detecte padrões de robô, a Clara agora escreve cada mensagem de confirmação de forma única, amigável e contextualmente rica. Não é mais necessário configurar templates fixos.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            {/* TAB 2: LEMBRETE */}
                            <TabsContent value="reminder" className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2">
                                 <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Ativar Lembretes Simples</Label>
                                        <p className="text-sm text-muted-foreground">Apenas avisar sobre a consulta, sem pedir confirmação.</p>
                                    </div>
                                    <Switch 
                                        checked={googleConfig.remindersEnabled}
                                        onCheckedChange={(c) => setGoogleConfig(prev => ({...prev, remindersEnabled: c}))}
                                    />
                                </div>

                                {googleConfig.remindersEnabled && (
                                    <div className="bg-muted/30 border rounded-lg p-4 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label>Horário de Disparo</Label>
                                                <Input 
                                                    type="time" 
                                                    value={googleConfig.reminderTime} 
                                                    onChange={(e) => setGoogleConfig(prev => ({...prev, reminderTime: e.target.value}))}
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label>Quando enviar?</Label>
                                                <div className="flex flex-col gap-2">
                                                    {[0, 1, 2].map((day) => (
                                                        <div key={day} className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id={`day-${day}`} 
                                                                checked={googleConfig.reminderDaysBefore?.includes(day)}
                                                                onCheckedChange={(checked) => {
                                                                    setGoogleConfig(prev => {
                                                                        const current = prev.reminderDaysBefore || [];
                                                                        const updated = checked 
                                                                            ? [...current, day]
                                                                            : current.filter(d => d !== day);
                                                                        return { ...prev, reminderDaysBefore: updated.sort() };
                                                                    });
                                                                }}
                                                            />
                                                            <label
                                                                htmlFor={`day-${day}`}
                                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                            >
                                                                {day === 0 ? "No dia da consulta" : `${day} dia${day > 1 ? 's' : ''} antes`}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MessageSquare className="h-5 w-5 text-primary" />
                                                    <h5 className="font-semibold text-primary">Mensagens Geradas por I.A.</h5>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    A Clara utilizará sua Inteligência Artificial para gerar lembretes humanizados e exclusivos para cada paciente, garantindo uma melhor taxa de engajamento e evitando bloqueios por spam.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* 2. ESTRATÉGIA (INTENT) */}
                    <div className="space-y-4 pt-4 border-t">
                        <Label className="text-lg font-semibold">2. Qual é a estratégia da Clara com este calendário?</Label>
                        <RadioGroup value={calendarStrategy} onValueChange={(val) => handleStrategyChange(val as CalendarStrategy)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* Strategy: Availability Only */}
                            <Label className={`flex flex-col space-y-3 border-2 rounded-xl p-5 cursor-pointer hover:bg-muted/50 transition-all ${calendarStrategy === 'availability_only' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border'}`}>
                                <RadioGroupItem value="availability_only" className="sr-only" />
                                <div className="flex items-center gap-2 font-bold text-lg">
                                     <ShieldCheck className="h-5 w-5 text-blue-500" />
                                     Bloqueio
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    A Clara <strong>apenas lê</strong> a agenda para evitar agendar reuniões em horários que você tem compromissos pessoais.
                                </p>
                                <div className="mt-auto pt-3 flex gap-2">
                                    <Badge variant="secondary">Leitura: Sim</Badge>
                                    <Badge variant="outline">Escrita: Não</Badge>
                                </div>
                            </Label>

                            {/* Strategy: Full Sync */}
                            <Label className={`flex flex-col space-y-3 border-2 rounded-xl p-5 cursor-pointer hover:bg-muted/50 transition-all ${calendarStrategy === 'full_sync' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border'}`}>
                                <RadioGroupItem value="full_sync" className="sr-only" />
                                <div className="flex items-center gap-2 font-bold text-lg">
                                     <ArrowRightLeft className="h-5 w-5 text-green-500" />
                                     Sync Total
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    A Clara <strong>evita conflitos</strong> e também <strong>cria eventos</strong> na sua agenda Google quando marca algo no sistema.
                                </p>
                                <div className="mt-auto pt-3 flex gap-2">
                                    <Badge variant="secondary">Leitura: Sim</Badge>
                                    <Badge variant="secondary">Escrita: Sim</Badge>
                                </div>
                            </Label>

                            {/* Strategy: Backup Log */}
                            <Label className={`flex flex-col space-y-3 border-2 rounded-xl p-5 cursor-pointer hover:bg-muted/50 transition-all ${calendarStrategy === 'backup_only' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border'}`}>
                                <RadioGroupItem value="backup_only" className="sr-only" />
                                <div className="flex items-center gap-2 font-bold text-lg">
                                     <UploadCloud className="h-5 w-5 text-orange-500" />
                                     Backup
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    A Clara <strong>não verifica conflitos</strong>, mas copia todos os agendamentos feitos como um backup.
                                </p>
                                <div className="mt-auto pt-3 flex gap-2">
                                    <Badge variant="outline">Leitura: Não</Badge>
                                    <Badge variant="secondary">Escrita: Sim</Badge>
                                </div>
                            </Label>
                        </RadioGroup>
                    </div>

                    {/* 3. REGRAS PERSONALIZADAS (NEW!) */}
                    <div className="space-y-4 pt-4 border-t">
                        <Label className="text-lg font-semibold flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            3. Regras de Agendamento Personalizadas
                            <Badge variant="secondary" className="text-xs font-normal">IA Rules 👩‍⚖️</Badge>
                        </Label>
                        <div className="bg-muted/50 border border-primary/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Info className="h-4 w-4" />
                                <h5 className="font-semibold leading-none tracking-tight">Como isso funciona?</h5>
                            </div>
                            <div className="text-sm text-muted-foreground pl-6">
                                Descreva regras que <strong>bloqueiam</strong> a Clara de agendar. 
                                Ex: "Não agende nada nas quartas de manhã" ou "Só agende após o almoço". 
                                A IA lerá isso antes de confirmar qualquer horário.
                            </div>
                        </div>
                        <Textarea 
                            placeholder="Ex: Minha agenda é bloqueada todas as segundas de manhã. Não marque reuniões das 12h as 14h..." 
                            className="min-h-[120px] text-base resize-none"
                            value={googleConfig.schedulerInstruction || ""}
                            onChange={(e) => setGoogleConfig(prev => ({ ...prev, schedulerInstruction: e.target.value }))}
                        />
                    </div>

                    <div className="pt-6">
                         <Button type="submit" disabled={isGoogleLoading || !googleConfig.selectedCalendarId} size="lg" className="w-full md:w-auto md:min-w-[200px]">
                            {isGoogleLoading ? "Aplicando Alterações..." : "Salvar Definições"}
                        </Button>
                    </div>
                </form>
            )}
          </CardContent>
      </Card>
    </div>
  );
}
