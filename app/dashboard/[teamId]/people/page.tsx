"use client";

import React, { useState, FormEvent } from 'react'; // FormEvent adicionado
import { useUser, type TeamInvitation } from '@stackframe/stack';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Adicionado Label se for usar com Input
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, XCircle, LogOut, UserPlus } from 'lucide-react'; // Adicionado UserPlus
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // CardDescription adicionada

const logger = console;

export default function PeoplePage() {
  const user = useUser({ or: "redirect" });
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const team = user?.useTeam(params.teamId);

  const teamMembers = team?.useUsers() || [];
  const teamInvitations = team?.useInvitations() || [];

  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // isLoading agora considera se team, teamMembers ou teamInvitations não estão prontos
  const isLoading = !user || !team || !Array.isArray(teamMembers) || !Array.isArray(teamInvitations);

  const handleInviteUser = async (e: FormEvent) => { // Adicionado tipo FormEvent
    e.preventDefault();
    if (!team || !inviteEmail.trim()) {
      toast.error("Email para convite é obrigatório.");
      return;
    }
    setIsInviting(true);
    try {
      // O callbackUrl é opcional, mas útil para direcionar o usuário após aceitar o convite.
      // Substitua 'https://seuapp.com/convite-aceito' pela sua URL real.
      const callbackUrl = `${window.location.origin}/auth/callback`; // Exemplo
      await team.inviteUser({ email: inviteEmail, callbackUrl: callbackUrl });
      toast.success(`Convite enviado para ${inviteEmail}!`);
      setInviteEmail('');
      // A lista de teamInvitations deve atualizar automaticamente (se o hook useInvitations for reativo)
      // ou você pode precisar de um fetch manual se o hook não for automaticamente reativo a essa ação.
    } catch (error: any) {
      logger.error("Erro ao convidar usuário:", error);
      toast.error(error.response?.data?.message || error.message || "Falha ao enviar convite.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitation: TeamInvitation) => {
    if (!team) return;
    if (!confirm(`Tem certeza que deseja revogar o convite para ${invitation.recipientEmail || 'este usuário'}?`)) return;
    try {
      await invitation.revoke(); // Método do objeto invitation
      toast.success("Convite revogado.");
      // Lista deve atualizar
    } catch (error: any) {
      logger.error("Erro ao revogar convite:", error);
      toast.error(error.message || "Falha ao revogar convite.");
    }
  };

  const handleLeaveTeam = async () => {
     if (!user || !team) {
        toast.error("Informações do usuário ou time não disponíveis.");
        return;
     }
     if (!confirm(`Tem certeza que deseja sair do time "${team.displayName}"? Você perderá o acesso aos recursos deste time.`)) {
        return;
     }
     try {
        await user.leaveTeam(team);
        toast.success(`Você saiu do time "${team.displayName}".`);
        router.push('/dashboard'); // Redireciona para a página inicial do dashboard (onde pode escolher outro time ou criar um)
     } catch (error: any) {
        logger.error("Erro ao sair do time:", error);
        toast.error(error.message || "Falha ao sair do time.");
     }
  };


  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-12 w-full mb-6" /> {/* Para o formulário de convite */}
        <Skeleton className="h-8 w-1/4 mt-8 mb-4" /> {/* Para título de Membros */}
        <Skeleton className="h-40 w-full rounded-lg" /> {/* Para tabela de Membros */}
        <Skeleton className="h-8 w-1/4 mt-8 mb-4" /> {/* Para título de Convites */}
        <Skeleton className="h-20 w-full rounded-lg" /> {/* Para tabela de Convites */}
      </div>
    )
  }

  if (!user || !team) {
    logger.warn("PeoplePage: User ou Team não está definido após o carregamento inicial.");
    // O layout já deve ter redirecionado se !team, mas como segurança.
    return <div className="p-6">Carregando informações do time ou redirecionando...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pessoas no Time: {team.displayName}</h1>
        <p className="text-muted-foreground mt-1">Gerencie os membros e convites do seu time.</p>
      </div>

      {/* Convidar Novo Membro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <UserPlus className="mr-2 h-5 w-5" /> Convidar Novo Membro
          </CardTitle>
          <CardDescription>Envie um convite por email para adicionar pessoas ao seu time.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div>
              <Label htmlFor="inviteEmail" className="sr-only">Email do Convidado</Label>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="exemplo@dominio.com"
                  required
                  className="flex-grow"
                />
                <Button type="submit" disabled={isInviting} className="w-full sm:w-auto">
                  <Mail className="mr-2 h-4 w-4" />
                  {isInviting ? "Enviando..." : "Enviar Convite"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>


      {/* Membros Atuais */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Membros Atuais ({teamMembers.length})</h2>
        {teamMembers.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>ID do Usuário</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.teamProfile.profileImageUrl || undefined} alt={member.teamProfile.displayName || 'Avatar'} />
                          <AvatarFallback className="text-xs">
                            {member.teamProfile.displayName
                                ? member.teamProfile.displayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()
                                : member.id.substring(0,2).toUpperCase()
                            }
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.teamProfile.displayName || 'Usuário Sem Nome'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.id}</TableCell>
                    <TableCell className="text-right">
                      {member.id === user.id && (
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold italic">Você</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <p className="text-muted-foreground">Nenhum membro no time (isso geralmente significa que apenas você, o criador, está aqui, mas a lista está vazia).</p>
        )}
      </div>

      {/* Convites Pendentes */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Convites Pendentes ({teamInvitations.length})</h2>
        {teamInvitations.length > 0 ? (
           <Card>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Email Convidado</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {teamInvitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.recipientEmail || 'N/A'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                        {new Date(invitation.expiresAt).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleRevokeInvitation(invitation)} className="text-destructive hover:text-destructive/80 px-2">
                            <XCircle className="h-4 w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Revogar</span>
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
           </Card>
        ) : (
          <p className="text-muted-foreground">Nenhum convite pendente no momento.</p>
        )}
      </div>

      {/* Ação de Sair do Time */}
      <div className="mt-8 pt-6 border-t border-border">
        <Card className="max-w-lg border-red-500/50 dark:border-red-500/30 bg-card">
            <CardHeader>
                <CardTitle className="text-destructive text-lg flex items-center">
                    <LogOut className="mr-2 h-5 w-5" /> Sair do Time &quot;{team.displayName}&quot;
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    Ao sair deste time, você perderá o acesso aos seus recursos e dashboards.
                    Esta ação não poderá ser desfeita por você. Para retornar, você precisaria ser convidado novamente por um membro do time.
                </p>
                <Button variant="destructive" onClick={handleLeaveTeam} className="w-full sm:w-auto">
                    Sair deste Time
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}