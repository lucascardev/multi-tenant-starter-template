"use client";

import React, { useState, useEffect, FormEvent, useCallback } from "react";
import { useUser } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import apiClient from "@/lib/axios";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    AlertCircle, 
    CheckCircle2, 
    Zap, 
    ArrowLeft, 
    RefreshCcw, 
    Clock, 
    Shield, 
    Calendar,
    MessageSquare,
    DollarSign,
    Lock
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// --- Components ---
const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`backdrop-blur-xl bg-card/40 border border-white/10 shadow-xl rounded-2xl overflow-hidden ${className}`}>
        {children}
    </div>
);

const FeatureToggle = ({ 
    id, 
    checked, 
    onChange, 
    label, 
    desc, 
    icon: Icon 
}: { 
    id: string, 
    checked: boolean, 
    onChange: (c: boolean) => void, 
    label: string, 
    desc: string, 
    icon: any 
}) => (
    <div className={`group flex items-start gap-4 p-4 rounded-xl transition-all duration-300 border ${checked ? 'bg-primary/5 border-primary/20' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
        <div className={`p-2.5 rounded-lg ${checked ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
                <Label htmlFor={id} className="text-base font-semibold cursor-pointer group-hover:text-primary transition-colors">{label}</Label>
                <Switch id={id} checked={checked} onCheckedChange={onChange} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
        </div>
    </div>
);

// --- Types ---
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

export default function ClinicorpIntegrationPage() {
  const user = useUser({ or: "redirect" });
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId || "curr";

  const [form, setForm] = useState<ClinicorpFormData>({
    isActive: false, username: "", subscriberId: "", companyId: "",
    enableAppointmentConfirmation: true, enableReturnCallMessages: false, enableBudgetFollowupMessages: false,
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [googleActive, setGoogleActive] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [res, googleRes] = await Promise.all([
        apiClient.get<ClinicorpFormData>('/integrations/clinicorp'),
        apiClient.get<{ isActive: boolean }>('/integrations/google/config')
      ]);
      const data = res.data;
      setForm({
        ...data,
        password: "", // Security
        enableAppointmentConfirmation: data.enableAppointmentConfirmation ?? true,
        lastSyncAt: data.lastSyncAt ? new Date(data.lastSyncAt).toLocaleString('pt-BR') : null,
      });
      setGoogleActive(googleRes.data?.isActive || false);
    } catch (err: any) {
      toast.error("Falha ao carregar dados.");
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const handleChange = (name: keyof ClinicorpFormData, value: any) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSync = async () => {
      setSyncing(true);
      try {
          await apiClient.post('/integrations/clinicorp/sync');
          toast.success("Sync iniciado! Verifique o Google Calendar.");
           // Refresh data to show new sync time eventually
           setTimeout(fetchData, 2000); 
      } catch (err: any) {
          toast.error("Erro no Sync: " + err.message);
      } finally {
          setSyncing(false);
      }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.password?.trim()) delete payload.password;
      
      const res = await apiClient.post('/integrations/clinicorp', payload);
      toast.success("Configurações salvas!");
      if (res.data.integration) {
          const updated = res.data.integration;
          setForm(prev => ({ 
              ...prev, 
              lastSyncAt: updated.lastSyncAt ? new Date(updated.lastSyncAt).toLocaleString('pt-BR') : null,
              errorMessage: updated.errorMessage || null
          }));
      }
    } catch (err) {
      toast.error("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8"><Skeleton className="h-96 w-full rounded-3xl opacity-20"/></div>;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background to-background/50 p-4 md:p-8 font-sans animate-in fade-in duration-700">
      
      {/* --- Header --- */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10" asChild>
                <Link href={`/dashboard/${teamId}/integrations`}><ArrowLeft className="w-5 h-5"/></Link>
            </Button>
            <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Clinicorp
                </h1>
                <p className="text-muted-foreground font-medium mt-1">Sincronização inteligente de agenda e pacientes</p>
            </div>
        </div>
        
        {/* Connection Status Badge */}
        <div className={`px-4 py-2 rounded-full border flex items-center gap-3 backdrop-blur-md ${form.isActive && googleActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] ${form.isActive && googleActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-semibold tracking-wide text-sm">
                {form.isActive && googleActive ? "CONECTADO" : "DESCONECTADO"}
            </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- Left Column: Configuration --- */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Google Dependency Alert */}
            {!googleActive && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-start gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500"><AlertCircle className="w-6 h-6"/></div>
                    <div>
                        <h3 className="text-lg font-bold text-amber-500">Google Calendar Necessário</h3>
                        <p className="text-amber-200/80 mt-1 leading-relaxed">
                            A Clara usa o Google Calendar como fonte oficial. Conecte-o primeiro para habilitar o espelhamento do Clinicorp.
                        </p>
                        <Button asChild variant="link" className="px-0 text-amber-400 hover:text-amber-300 mt-2 font-semibold">
                            <Link href={`/dashboard/${teamId}/integrations/google`}>Conectar Google Agora &rarr;</Link>
                        </Button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <GlassCard className={`p-8 space-y-8 ${!googleActive ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    
                    {/* Switch: Activate */}
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-card/50 border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Habilitar Integração</h3>
                                <p className="text-sm text-muted-foreground">Permitir leitura e escrita de dados.</p>
                            </div>
                        </div>
                        <Switch checked={form.isActive} onCheckedChange={c => handleChange('isActive', c)} className="scale-125 data-[state=checked]:bg-blue-500" />
                    </div>

                    {/* Credentials Form */}
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 mb-4">
                            <p className="text-xs text-blue-400 flex items-center gap-2">
                                <Shield className="w-3 h-3" />
                                <strong>Nota de Segurança:</strong> A integração via API Legacy requer Usuário e Senha. Chaves de API ainda não são suportadas neste endpoint.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Usuário</Label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/50" />
                                    <Input 
                                        className="pl-9 h-12 bg-background/50 border-white/10 focus:border-blue-500/50 transition-all rounded-xl" 
                                        placeholder="usuario.clinicorp"
                                        value={form.username}
                                        onChange={e => handleChange('username', e.target.value)}
                                    />
                                </div>
                             </div>
                             <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Senha</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/50" />
                                    <Input 
                                        type="password" 
                                        className="pl-9 h-12 bg-background/50 border-white/10 focus:border-blue-500/50 transition-all rounded-xl" 
                                        placeholder="••••••••" 
                                        value={form.password || ""}
                                        onChange={e => handleChange('password', e.target.value)}
                                        autoComplete="new-password"
                                    />
                                </div>
                             </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">ID Assinante (Auto)</Label>
                                <div className="relative">
                                    <Zap className="absolute left-3 top-3 w-4 h-4 text-emerald-500" />
                                    <Input 
                                        className="pl-9 h-12 bg-white/5 border-white/5 rounded-xl font-mono text-sm text-muted-foreground cursor-not-allowed" 
                                        placeholder="Auto-detectado..." 
                                        value={form.subscriberId || ""}
                                        readOnly
                                        disabled
                                    />
                                </div>
                             </div>
                             <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">ID Empresa (Opcional)</Label>
                                <div className="relative">
                                    <Zap className="absolute left-3 top-3 w-4 h-4 text-emerald-500" />
                                    <Input 
                                        className="pl-9 h-12 bg-white/5 border-white/5 rounded-xl font-mono text-sm text-muted-foreground cursor-not-allowed" 
                                        placeholder="Auto-detectado..." 
                                        value={form.companyId || ""}
                                        readOnly
                                        disabled
                                    />
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-end">
                        <Button size="lg" disabled={loading} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20 rounded-xl px-8 transition-all hover:scale-105 active:scale-95">
                            {loading ? <RefreshCcw className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
                            {loading ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>

                </GlassCard>
            </form>
        </div>

        {/* --- Right Column: Features & Status --- */}
        <div className="space-y-6">
            
            {/* Sync Control Card */}
            {form.isActive && googleActive && (
                <GlassCard className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20">
                     <div className="flex items-center justify-between mb-4">
                        <Label className="text-xs font-bold uppercase text-indigo-400 tracking-wider">Status da Sincronização</Label>
                        <div className={`p-1.5 rounded-full ${form.errorMessage ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                            {form.errorMessage ? <AlertCircle className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                        </div>
                    </div>
                    
                    <div className="text-center space-y-2 mb-6">
                         <p className="text-sm text-muted-foreground">Última atualização</p>
                         <p className="text-xl font-mono font-medium text-foreground">{form.lastSyncAt || "Nunca"}</p>
                         {form.errorMessage && (
                             <p className="text-xs text-red-400 bg-red-950/30 p-2 rounded border border-red-500/10">{form.errorMessage}</p>
                         )}
                    </div>

                    <Button 
                        variant="default" 
                        size="lg" 
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 rounded-xl"
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        <RefreshCcw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? "Sincronizando..." : "Sincronizar Agora"}
                    </Button>
                </GlassCard>
            )}

            {/* Features List */}
            <GlassCard className="p-0 divide-y divide-white/5">
                <div className="p-4 bg-white/5">
                    <h3 className="font-semibold text-foreground">Automações</h3>
                </div>
                
                <FeatureToggle 
                    id="confirm"
                    checked={form.enableAppointmentConfirmation}
                    onChange={c => handleChange('enableAppointmentConfirmation', c)}
                    label="Confirmação Inteligente (WhatsApp)"
                    desc="A Clara usará o Google Calendar (espelho) para confirmar agendamentos via WhatsApp."
                    icon={Calendar}
                />

                <FeatureToggle 
                    id="return"
                    checked={form.enableReturnCallMessages}
                    onChange={c => handleChange('enableReturnCallMessages', c)}
                    label="Reativação de Ex-Pacientes"
                    desc="Envia mensagens para pacientes sem retorno há mais de 6 meses."
                    icon={MessageSquare}
                />

                <FeatureToggle 
                    id="budget"
                    checked={form.enableBudgetFollowupMessages}
                    onChange={c => handleChange('enableBudgetFollowupMessages', c)}
                    label="Recuperação de Orçamentos"
                    desc="Acompanha orçamentos em aberto para tentar o fechamento."
                    icon={DollarSign}
                />
            </GlassCard>
        </div>
      </main>
    </div>
  );
}

