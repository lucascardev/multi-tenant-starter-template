'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/axios'; // Adjust path if needed
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, RefreshCw, Trash2, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduledMessage {
    id: string;
    content: string;
    scheduled_for: string;
    status: string;
    recurrence: string | null;
    type: string;
    instance?: { instance_name: string };
}

interface Instance {
    id: string;
    instance_name: string;
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<ScheduledMessage[]>([]);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    // New Task Form
    const [newTaskOpen, setNewTaskOpen] = useState(false);
    const [selectedInstance, setSelectedInstance] = useState<string>('');
    const [taskContent, setTaskContent] = useState('');
    const [taskDate, setTaskDate] = useState('');
    const [taskTime, setTaskTime] = useState('');
    const [recurrence, setRecurrence] = useState<string>('none');
    const [destinationPhone, setDestinationPhone] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [tasksRes, instancesRes] = await Promise.all([
                apiClient.get('/scheduled-messages'),
                apiClient.get('/instances')
            ]);
            console.log("Tasks Response:", tasksRes.data);
            console.log("Instances Response:", instancesRes.data);

            const tasksData = tasksRes.data;
            const instancesData = instancesRes.data.instances || instancesRes.data || [];

            setTasks(Array.isArray(tasksData) ? tasksData : []);
            setInstances(Array.isArray(instancesData) ? instancesData : []);
            
            // Auto-select first instance if available
            if (Array.isArray(instancesData) && instancesData.length > 0) {
                // Default to first instance if not set
               // setSelectedInstance(instancesRes.data[0].id);
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar tarefas.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateTask = async () => {
        if (!selectedInstance || !taskContent || !taskDate || !taskTime) {
            toast.error("Preencha todos os campos obrigatórios.");
            return;
        }

        const scheduledDateTime = new Date(`${taskDate}T${taskTime}:00`);
        
        // Basic validation
        if (scheduledDateTime < new Date()) {
            toast.error("A data deve ser futura.");
            return;
        }

        setIsCreating(true);
        try {
            // Determine type automatically based on intent? 
            // Or let user choose? For "Tasks", we assume INTERNAL_TASK unless it's just a message.
            // Let's deduce: If phone is provided -> REMINDER (Message). If not -> INTERNAL_TASK.
            // Or explicit toggle? Let's use logic:
            const type = destinationPhone ? 'REMINDER' : 'INTERNAL_TASK';

            await apiClient.post('/scheduled-messages', {
                instanceId: selectedInstance,
                content: taskContent,
                scheduled_for: scheduledDateTime.toISOString(),
                recurrence: recurrence === 'none' ? null : recurrence,
                type: type,
                phone: destinationPhone || undefined
            });

            toast.success("Tarefa agendada com sucesso!");
            setNewTaskOpen(false);
            fetchData();
            
            // Reset form
            setTaskContent('');
            setDestinationPhone('');
        } catch (error: any) {
            toast.error("Erro ao agendar: " + (error.response?.data?.error || error.message));
        } finally {
            setIsCreating(false);
        }
    };

    const handleCancel = async (id: string) => {
        try {
            await apiClient.delete(`/scheduled-messages/${id}`);
            toast.success("Tarefa cancelada.");
            fetchData();
        } catch (error) {
            toast.error("Erro ao cancelar.");
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tarefas & Automação</h1>
                    <p className="text-muted-foreground mt-1">
                        Agende comandos para a Clara ou mensagens automáticas para terceiros.
                    </p>
                </div>
                <Button onClick={() => setNewTaskOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">Fila de Execução</CardTitle>
                    <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            Nenhuma tarefa agendada.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data/Hora</TableHead>
                                    <TableHead>Instância</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Recorrência</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.map((task) => (
                                    <TableRow key={task.id}>
                                        <TableCell>
                                            {new Date(task.scheduled_for).toLocaleString('pt-BR')}
                                        </TableCell>
                                        <TableCell>{task.instance?.instance_name || '-'}</TableCell>
                                        <TableCell className="max-w-xs truncate" title={task.content}>
                                            {task.content}
                                        </TableCell>
                                        <TableCell>
                                            {task.type === 'INTERNAL_TASK' ? 
                                                <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"><CalendarCheck className="w-3 h-3 mr-1"/> Tarefa Interna</Badge> : 
                                                <Badge variant="outline"><CheckCircle2 className="w-3 h-3 mr-1"/> Lembrete</Badge>
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {task.recurrence ? <Badge variant="outline">{task.recurrence}</Badge> : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={task.status === 'PENDING' ? 'secondary' : task.status === 'SENT' ? 'default' : 'destructive'}>
                                                {task.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {task.status === 'PENDING' && (
                                                <Button variant="ghost" size="icon" onClick={() => handleCancel(task.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Nova Automação</DialogTitle>
                        <DialogDescription>
                            Configure uma ação para a Clara executar no futuro.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Hora</Label>
                                <Input type="time" value={taskTime} onChange={e => setTaskTime(e.target.value)} />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Instância (Bot)</Label>
                            <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o WhatsApp..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {instances.map(inst => (
                                        <SelectItem key={inst.id} value={inst.id}>{inst.instance_name} ({inst.id.substring(0,4)}...)</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>O que a Clara deve fazer?</Label>
                            <Textarea 
                                placeholder="Ex: 'Verificar se existem novas mensagens', 'Mandar msg para 719999... cobrando fatura'"
                                value={taskContent}
                                onChange={e => setTaskContent(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                             <Label>Telefone Destino (Opcional - Para mensagens diretas)</Label>
                             <Input 
                                placeholder="Se preenchido, envia mensagem direta (Agendamento simples)" 
                                value={destinationPhone}
                                onChange={e => setDestinationPhone(e.target.value)}
                             />
                             <p className="text-xs text-muted-foreground">Deixe em branco para Comandos Internos (Internal Tasks).</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Recorrência</Label>
                            <Select value={recurrence} onValueChange={setRecurrence}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Uma vez</SelectItem>
                                    <SelectItem value="DAILY">Diariamente</SelectItem>
                                    <SelectItem value="WEEKLY">Semanalmente</SelectItem>
                                    <SelectItem value="MONTHLY">Mensalmente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewTaskOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateTask} disabled={isCreating}>
                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Agendar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
