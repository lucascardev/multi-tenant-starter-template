"use client";

import React, { useEffect, useState } from "react";
import apiClient from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, Trash2, Shield, Key, ArrowLeft, Users as UsersIcon } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  added_by: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  // State for Activations
  const [selectedPlan, setSelectedPlan] = useState("basico_brl_435");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [tokenCount, setTokenCount] = useState(1);
  const [generatedTokens, setGeneratedTokens] = useState<any[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  
  // State for Feature Tokens
  const [selectedFeature, setSelectedFeature] = useState("extended_memory_168h");
  const [featureTokenCount, setFeatureTokenCount] = useState(1);
  const [loadingFeatureTokens, setLoadingFeatureTokens] = useState(false);

  // State for Admin Management
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [superAdmin, setSuperAdmin] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // State for User Management
  const [searchEmail, setSearchEmail] = useState("");
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [usageMessages, setUsageMessages] = useState(0);
  const [usageTalking, setUsageTalking] = useState(0);
  const [limitsOverride, setLimitsOverride] = useState<any>({});

  // General Access State
  const [accessDenied, setAccessDenied] = useState(false);

  // --- Fetch Functionality ---

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await apiClient.get("/admin/users");
      setAdmins(res.data.admins);
      setSuperAdmin(res.data.super_admin);
      setAccessDenied(false);
    } catch (error: any) {
      if (error.response?.status === 403) {
        setAccessDenied(true);
      } else {
        toast.error("Failed to fetch admins.");
      }
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    // Initial fetch to check access
    fetchAdmins();
  }, []);

  // --- Handlers ---

  const handleGenerateTokens = async () => {
    setLoadingTokens(true);
    try {
      const res = await apiClient.post("/admin/activation-tokens", {
        planId: selectedPlan,
        count: tokenCount,
        billing_cycle: billingCycle,
      });
      setGeneratedTokens(res.data.tokens);
      toast.success(`Generated ${res.data.tokens.length} tokens.`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to generate tokens.");
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleGenerateFeatureTokens = async () => {
    setLoadingFeatureTokens(true);
    try {
      const res = await apiClient.post("/admin/feature-tokens", {
        feature_key: selectedFeature,
        count: featureTokenCount,
      });
      setGeneratedTokens(res.data.tokens);
      toast.success(`Generated ${res.data.tokens.length} feature tokens.`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to generate tokens.");
    } finally {
      setLoadingFeatureTokens(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    try {
      await apiClient.post("/admin/users", { email: newAdminEmail });
      toast.success("Admin added successfully.");
      setNewAdminEmail("");
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to add admin.");
    }
  };

  const handleSearchUser = async () => {
    if(!searchEmail) return;
    setLoadingUser(true);
    setSearchedUser(null);
    try {
        const res = await apiClient.get(`/admin/clients/${searchEmail}`);
        const data = res.data;
        setSearchedUser(data);
        
        // Init form states
        setUsageMessages(data.client.messages_sent || 0);
        setUsageTalking(data.client.customers_ansewered || 0); // Typo in DB 'customers_ansewered'
        
        const sub = data.activeSubscription;
        if(sub) {
            setLimitsOverride({
                max_messages: sub.max_messages_override,
                max_customers: sub.max_customers_override,
                max_personas: sub.max_personas_override,
                max_instances: sub.max_instances_override
            });
        } else {
             setLimitsOverride({});
        }

    } catch (error: any) {
        toast.error(error.response?.data?.message || error.response?.data?.error || "User not found.");
    } finally {
        setLoadingUser(false);
    }
  };

  const handleUpdateSubscription = async (payload: any) => {
      if(!searchedUser) return;
      try {
          await apiClient.patch(`/admin/users/${searchedUser.client.email}/subscription`, payload);
          toast.success("Subscription updated successfully.");
          handleSearchUser(); // Refresh data
      } catch (error: any) {
          toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to update subscription.");
      }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email}?`)) return;
    try {
      await apiClient.delete(`/admin/users/${email}`);
      toast.success("Admin removed.");
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to remove admin.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (accessDenied) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to view this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage activation tokens and team access.
          </p>
        </div>
         <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
      </div>

      <Tabs defaultValue="activations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activations" className="flex items-center gap-2">
            <Key className="h-4 w-4" /> Activations
          </TabsTrigger>
          <TabsTrigger value="admins" className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Access Management
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" /> Manage Users
          </TabsTrigger>
        </TabsList>

        {/* --- Activations Tab --- */}
        <TabsContent value="activations">
          <Card>
            <CardHeader>
              <CardTitle>Generate Activation Tokens</CardTitle>
              <CardDescription>
                Create one-time use tokens for subscription plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan</label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inicial_brl_345">Plano Inicial</SelectItem>
                      <SelectItem value="basico_brl_435">Plano Básico</SelectItem>
                      <SelectItem value="sob_medida_brl_525">Plano Sob Medida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Billing Cycle</label>
                  <Select value={billingCycle} onValueChange={setBillingCycle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={tokenCount}
                    onChange={(e) => setTokenCount(Number(e.target.value))}
                  />
                </div>
              </div>

              {generatedTokens.length > 0 && (
                <div className="mt-6 rounded-md border p-4">
                  <h3 className="mb-4 text-sm font-medium">Generated Tokens:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {generatedTokens.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-md bg-secondary p-2 text-sm font-mono"
                      >
                        <span>{t.token}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(t.token)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleGenerateTokens} disabled={loadingTokens}>
                {loadingTokens ? "Generating..." : "Generate Codes"}
              </Button>
            </CardFooter>
          </Card>

          <Card className="mt-8 border-violet-200">
            <CardHeader>
              <CardTitle className="text-violet-700">Unlock Specific Features (Add-ons)</CardTitle>
              <CardDescription>
                Create tokens to unlock specific premium features independent of the plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Feature</label>
                  <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Feature" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="extended_memory_168h">Memória Estendida (1 Sem)</SelectItem>
                      {/* Adicionar novas features aqui futuramente */}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={featureTokenCount}
                    onChange={(e) => setFeatureTokenCount(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleGenerateFeatureTokens} 
                disabled={loadingFeatureTokens}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {loadingFeatureTokens ? "Generating..." : "Generate Feature Codes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- Admins Tab --- */}
        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>Admin Users</CardTitle>
              <CardDescription>
                Manage who has access to this developer dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email to add (e.g., dev@example.com)"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="max-w-md"
                />
                <Button onClick={handleAddAdmin} disabled={!newAdminEmail}>
                  Add Admin
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>Since</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {superAdmin && (
                      <TableRow className="bg-muted/50">
                        <TableCell className="font-medium">{superAdmin} <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Super Admin</span></TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" disabled>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                    {admins.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.added_by}</TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAdmin(user.email)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {admins.length === 0 && !superAdmin && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                            No admins found (database empty).
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- User Management Tab --- */}
        <TabsContent value="users">
            <Card>
                <CardHeader>
                    <CardTitle>Gerenciar Usuários</CardTitle>
                    <CardDescription>Busque um usuário por email para editar assinatura e limites.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Email do usuário (ex: cliente@email.com)" 
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            className="max-w-md"
                        />
                        <Button onClick={handleSearchUser} disabled={loadingUser}>
                            {loadingUser ? "Buscando..." : "Buscar Usuário"}
                        </Button>
                    </div>

                    {searchedUser && (
                        <div className="space-y-6 border rounded-md p-4 bg-muted/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-bold text-lg">{searchedUser.client.business_name}</h3>
                                    <p className="text-sm text-muted-foreground">{searchedUser.client.email}</p>
                                    <p className="text-sm">ID: <span className="font-mono text-xs">{searchedUser.client.client_id}</span></p>
                                    <p className="text-sm">Criado em: {new Date(searchedUser.client.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold">Assinatura Atual</h4>
                                    {searchedUser.activeSubscription ? (
                                        <>
                                            <p className="text-sm">Plano: {searchedUser.activeSubscription.subscription.plan_name}</p>
                                            <p className="text-sm">Status: <span className="uppercase text-xs font-bold">{searchedUser.activeSubscription.status}</span></p>
                                            <p className="text-sm">Expira em: {searchedUser.activeSubscription.end_date ? new Date(searchedUser.activeSubscription.end_date).toLocaleDateString() : 'N/A'}</p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-red-500">Nenhuma assinatura ativa encontrada.</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Usage Logic */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2">Consumo Atual</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Mensagens Enviadas</label>
                                            <Input type="number" value={usageMessages} onChange={(e) => setUsageMessages(Number(e.target.value))} />
                                        </div>
                                         <div className="space-y-1">
                                            <label className="text-xs font-medium">Clientes Atendidos</label>
                                            <Input type="number" value={usageTalking} onChange={(e) => setUsageTalking(Number(e.target.value))} />
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleUpdateSubscription({ set_usage_messages: usageMessages, set_usage_talking: usageTalking })}>
                                        Atualizar Consumo Manualmente
                                    </Button>
                                </div>

                                {/* Limits Override */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2">Override de Limites (Personalizado)</h4>
                                     <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Max Mensagens</label>
                                            <Input type="number" placeholder="Default" value={limitsOverride.max_messages || ''} onChange={(e) => setLimitsOverride({...limitsOverride, max_messages: Number(e.target.value)})} />
                                        </div>
                                         <div className="space-y-1">
                                            <label className="text-xs font-medium">Max Clientes</label>
                                            <Input type="number" placeholder="Default" value={limitsOverride.max_customers || ''} onChange={(e) => setLimitsOverride({...limitsOverride, max_customers: Number(e.target.value)})} />
                                        </div>
                                         <div className="space-y-1">
                                            <label className="text-xs font-medium">Max Personas</label>
                                            <Input type="number" placeholder="Default" value={limitsOverride.max_personas || ''} onChange={(e) => setLimitsOverride({...limitsOverride, max_personas: Number(e.target.value)})} />
                                        </div>
                                         <div className="space-y-1">
                                            <label className="text-xs font-medium">Max Instâncias</label>
                                            <Input type="number" placeholder="Default" value={limitsOverride.max_instances || ''} onChange={(e) => setLimitsOverride({...limitsOverride, max_instances: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={() => handleUpdateSubscription({ override_limits: limitsOverride })}>
                                        Salvar Novos Limites
                                    </Button>
                                </div>
                            </div>

                             <div className="border-t pt-4 space-y-4">
                                <h4 className="font-semibold">Ações Rápidas</h4>
                                <div className="flex gap-4">
                                    <Button onClick={() => handleUpdateSubscription({ add_days: 30 })}>
                                        +30 Dias de Validade
                                    </Button>
                                     <Button variant="secondary" onClick={() => handleUpdateSubscription({ renew: true })}>
                                        Renovar Ciclo (Resetar Datas & Uso)
                                    </Button>
                                </div>
                             </div>

                        </div>
                    )}

                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
