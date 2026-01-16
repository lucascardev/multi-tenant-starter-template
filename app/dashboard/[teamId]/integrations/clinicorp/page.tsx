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
import { AlertCircle, CheckCircle, Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

export default function ClinicorpIntegrationPage() {
  const user = useUser({ or: "redirect" });
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId || "curr";

  const [clinicorpFormData, setClinicorpFormData] = useState<ClinicorpFormData>({
    isActive: false, username: "", subscriberId: "", companyId: "",
    enableAppointmentConfirmation: true, enableReturnCallMessages: false, enableBudgetFollowupMessages: false,
  });
  const [isClinicorpLoading, setIsClinicorpLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

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
      setIsFetching(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsFetching(true);
      fetchClinicorpConfig();
    }
  }, [user, fetchClinicorpConfig]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClinicorpFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSwitchChange = (checked: boolean, name: keyof ClinicorpFormData) => {
    setClinicorpFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: FormEvent) => {
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

  if (isFetching) {
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
                <Zap className="h-8 w-8 text-blue-500" />
                Integração Clinicorp
            </h1>
            <p className="text-muted-foreground mt-1">
            Configure a conexão com seu sistema de gestão principal.
            </p>
        </div>
      </header>

      <Card className="max-w-3xl mx-auto border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="text-xl">Credenciais e Automação</CardTitle>
          <CardDescription>
            A Clara usará este sistema para verificar agenda oficial e buscar dados de clientes/pacientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-md bg-background shadow-sm">
               <div className="space-y-1">
                   <Label htmlFor="clinicorpIsActive" className="text-base font-medium">Ativar Integração</Label>
                   <p className="text-sm text-muted-foreground">Permitir que a Clara acesse o Clinicorp.</p>
               </div>
              <Switch
                id="clinicorpIsActive"
                name="isActive"
                checked={clinicorpFormData.isActive}
                onCheckedChange={(checked) => handleSwitchChange(checked, "isActive")}
              />
            </div>

            {clinicorpFormData.isActive && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="usernameClinicorp">Usuário Clinicorp</Label>
                        <Input id="usernameClinicorp" name="username" value={clinicorpFormData.username} onChange={handleInputChange} placeholder="seu_usuario_clinicorp" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="passwordClinicorp">Senha Clinicorp</Label>
                        <Input id="passwordClinicorp" name="password" type="password" value={clinicorpFormData.password} onChange={handleInputChange} placeholder="• • • • • •" autoComplete="new-password" />
                        <p className="text-[10px] text-muted-foreground">Deixe em branco para manter a senha atual.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subscriberId">ID de Assinante</Label>
                        <Input id="subscriberId" name="subscriberId" value={clinicorpFormData.subscriberId} onChange={handleInputChange} placeholder="Ex: 123456" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="companyId">ID da Empresa</Label>
                        <Input id="companyId" name="companyId" value={clinicorpFormData.companyId} onChange={handleInputChange} placeholder="Ex: 7890" />
                    </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Automações Ativas</h3>
                  <div className="space-y-4">
                    {[
                        {id: "enableAppointmentConfirmation", label: "Confirmar agendamentos do dia seguinte", desc: "A Clara envia mensagem pedindo confirmação."},
                        {id: "enableReturnCallMessages", label: "Reativar Clientes Antigos", desc: "Enviar mensagens para quem não vem há muito tempo."},
                        {id: "enableBudgetFollowupMessages", label: "Acompanhamento de Orçamentos", desc: "Perguntar sobre orçamentos em aberto."},
                    ].map(feature => (
                        <div key={feature.id} className="flex items-start space-x-3">
                            <Switch id={feature.id} checked={clinicorpFormData[feature.id as keyof ClinicorpFormData] as boolean} onCheckedChange={(checked) => handleSwitchChange(checked, feature.id as keyof ClinicorpFormData)} className="mt-1"/>
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor={feature.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {feature.label}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {feature.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
             <div className="pt-4">
                <Button type="submit" disabled={isClinicorpLoading || !clinicorpFormData.isActive} className="w-full md:w-auto min-w-[150px]">
                {isClinicorpLoading ? "Salvando..." : "Salvar Configurações"}
                </Button>
            </div>
          </form>
        </CardContent>
        {clinicorpFormData.isActive && (clinicorpFormData.lastSyncAt || clinicorpFormData.errorMessage) && (
            <CardFooter className="text-xs text-muted-foreground border-t pt-4 bg-muted/10">
                {clinicorpFormData.errorMessage ? (
                    <p className="text-destructive flex items-center"><AlertCircle className="h-4 w-4 mr-2"/>Falha na sincronização: {clinicorpFormData.errorMessage}</p>
                ) : clinicorpFormData.lastSyncAt ? (
                    <p className="text-emerald-600 dark:text-emerald-400 flex items-center font-medium"><CheckCircle className="h-4 w-4 mr-2"/>Sincronizado em: {clinicorpFormData.lastSyncAt}</p>
                ) : null}
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
