"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useUser } from "@stackframe/stack"; // Removido useTeam, não usado diretamente aqui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import apiClient from "@/lib/axios";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Zap } from "lucide-react";

const logger = console;

interface ClinicorpFormData {
  isActive: boolean;
  username: string;
  password?: string; // Senha é opcional no formulário para não forçar a redigitar
  subscriberId: string;
  companyId: string;
  enableAppointmentConfirmation: boolean;
  enableReturnCallMessages: boolean;
  enableBudgetFollowupMessages: boolean;
}

export default function IntegrationSegmentsPage() { // Nome da página pode ser mais genérico
  const user = useUser({ or: "redirect" });

  const [formData, setFormData] = useState<ClinicorpFormData>({
    isActive: false,
    username: "",
    password: "",
    subscriberId: "",
    companyId: "",
    enableAppointmentConfirmation: true,
    enableReturnCallMessages: false,
    enableBudgetFollowupMessages: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingConfig, setIsFetchingConfig] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);


  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;
      setIsFetchingConfig(true);
      try {
        const response = await apiClient.get<ClinicorpFormData & {lastSyncAt?: string, errorMessage?: string}>('/integrations/clinicorp');
        const config = response.data;
        setFormData({
          isActive: config.isActive || false,
          username: config.username || "",
          password: "", // Nunca preencher a senha
          subscriberId: config.subscriberId || "",
          companyId: config.companyId || "",
          enableAppointmentConfirmation: typeof config.enableAppointmentConfirmation === 'boolean' ? config.enableAppointmentConfirmation : true,
          enableReturnCallMessages: typeof config.enableReturnCallMessages === 'boolean' ? config.enableReturnCallMessages : false,
          enableBudgetFollowupMessages: typeof config.enableBudgetFollowupMessages === 'boolean' ? config.enableBudgetFollowupMessages : false,
        });
        setLastSync(config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString('pt-BR') : null);
        setSyncError(config.errorMessage || null);
        logger.info("Configurações da Clinicorp carregadas:", config);
      } catch (error: any) {
        logger.error("Erro ao buscar configurações da Clinicorp:", error.response?.data || error.message);
        toast.error(error.response?.data?.message || "Não foi possível carregar as configurações da Clinicorp.");
      } finally {
        setIsFetchingConfig(false);
      }
    };
    if (user) fetchConfig();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
   const handleSwitchChange = (checked: boolean, name: keyof ClinicorpFormData) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sessão não encontrada."); return; }
    setIsLoading(true);
    try {
      const payload: Partial<ClinicorpFormData> = { ...formData };
      // Só envia a senha se ela foi de fato digitada/alterada e não é apenas espaços
      if (!formData.password || formData.password.trim() === "") {
        delete payload.password;
      }

      const response = await apiClient.post('/integrations/clinicorp', payload);
      toast.success(response.data.message || "Configuração Clinicorp salva com sucesso!");
      if (payload.password) { // Limpa o campo de senha se ela foi enviada
        setFormData(prev => ({ ...prev, password: "" }));
      }
      // Opcional: re-buscar a config para mostrar lastSync, etc.
      // fetchConfig(); // ou apenas atualizar o estado local se a API retornar o objeto atualizado
       if (response.data.integration) {
            const updatedIntegration = response.data.integration;
            setLastSync(updatedIntegration.lastSyncAt ? new Date(updatedIntegration.lastSyncAt).toLocaleString('pt-BR') : null);
            setSyncError(updatedIntegration.errorMessage || null);
        }


    } catch (error: any) {
      logger.error("Erro ao salvar configuração Clinicorp:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Ocorreu um erro ao salvar.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingConfig) {
    return (
        <div className="p-4 md:p-6 space-y-6">
            <Skeleton className="h-8 w-1/3 mb-2"/>
            <Skeleton className="h-6 w-2/3 mb-6"/>
            <div className="max-w-lg space-y-4">
                {[1,2,3,4,5,6].map(i=><Skeleton key={i} className="h-16 w-full"/>)}
                <Skeleton className="h-10 w-32 mt-4"/>
            </div>
        </div>
    );
  }
  if (!user) return <div className="p-6">Carregando usuário...</div>;


  return (
    <div className="p-4 md:p-6 space-y-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Zap className="mr-3 h-6 w-6 text-primary" /> Integração com Clinicorp
          </CardTitle>
          <CardDescription>
            Conecte sua conta Clinicorp para automatizar agendamentos, confirmações e mais.
            As informações aqui são usadas exclusivamente para a comunicação entre a Clara e seu sistema Clinicorp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center space-x-2 p-4 border rounded-md bg-card">
              <Switch
                id="isActive"
                name="isActive" // Embora o nome não seja usado por handleSwitchChange, é bom para semântica
                checked={formData.isActive}
                onCheckedChange={(checked) => handleSwitchChange(checked, "isActive")}
              />
              <Label htmlFor="isActive" className="text-base font-medium">
                Ativar Integração Clinicorp
              </Label>
            </div>

            {formData.isActive && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="username">Usuário Clinicorp</Label>
                  <Input id="username" name="username" value={formData.username} onChange={handleChange} placeholder="seu_usuario_clinicorp" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password">Senha Clinicorp</Label>
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Digite para alterar" autoComplete="new-password" />
                  <p className="text-xs text-muted-foreground">Deixe em branco se não deseja alterar a senha atual.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subscriberId">ID de Assinante Clinicorp</Label>
                  <Input id="subscriberId" name="subscriberId" value={formData.subscriberId} onChange={handleChange} placeholder="12345" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="companyId">ID da Empresa Clinicorp</Label>
                  <Input id="companyId" name="companyId" value={formData.companyId} onChange={handleChange} placeholder="67890" />
                </div>

                <fieldset className="pt-4">
                  <legend className="text-md font-semibold mb-2 text-foreground">Funcionalidades da Integração</legend>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch id="enableAppointmentConfirmation" checked={formData.enableAppointmentConfirmation} onCheckedChange={(checked) => handleSwitchChange(checked, "enableAppointmentConfirmation")} />
                      <Label htmlFor="enableAppointmentConfirmation">Confirmar agendamentos do dia seguinte</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="enableReturnCallMessages" checked={formData.enableReturnCallMessages} onCheckedChange={(checked) => handleSwitchChange(checked, "enableReturnCallMessages")} />
                      <Label htmlFor="enableReturnCallMessages">Enviar mensagens para pacientes antigos (retorno)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="enableBudgetFollowupMessages" checked={formData.enableBudgetFollowupMessages} onCheckedChange={(checked) => handleSwitchChange(checked, "enableBudgetFollowupMessages")} />
                      <Label htmlFor="enableBudgetFollowupMessages">Enviar mensagens para acompanhamento de orçamentos</Label>
                    </div>
                  </div>
                </fieldset>
              </>
            )}
             <Button type="submit" disabled={isLoading || !formData.isActive} className="w-full sm:w-auto mt-4">
              {isLoading ? "Salvando..." : "Salvar Configurações Clinicorp"}
            </Button>
          </form>
        </CardContent>
        {formData.isActive && (lastSync || syncError) && (
            <CardFooter className="text-xs text-muted-foreground border-t pt-4">
                {syncError ? (
                    <p className="text-destructive flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>Última tentativa de sincronização falhou: {syncError}</p>
                ) : lastSync ? (
                    <p className="text-green-600 flex items-center"><CheckCircle className="h-4 w-4 mr-1"/>Última sincronização bem-sucedida: {lastSync}</p>
                ) : null}
            </CardFooter>
        )}
      </Card>

      {/* Placeholder para outras integrações */}
      {/* <Card className="max-w-2xl mx-auto mt-8"> ... Google Agenda ... </Card> */}

    </div>
  );
}