'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import apiClient from '@/lib/axios'
// Adicionado Select
import { cn } from '@/lib/utils'
import {
	KnowledgeSubSection,
	PersonaInstruction,
	personaTemplates,
	SalesFunnelStage,
} from '@/types/persona-instruction'
import { useUser } from '@stackframe/stack'
import {
	PlusCircle,
	Edit3,
	Trash2,
	RefreshCw,
	BrainCircuit,
    Shield,
    X
} from 'lucide-react'
import { useParams } from 'next/navigation'
import React, {
	useState,
	useEffect,
	useCallback,
	FormEvent,
	ChangeEvent,
} from 'react'
import { toast } from 'sonner'

// Adicionado cn

const logger = console

interface PersonaFromAPI {
	id: string
	persona_name: string // Nome da Persona (ex: "Atendente Principal")
	model: string
	instruction: PersonaInstruction
	is_default: boolean
	is_online: boolean // Este campo vem da sua interface Persona
    owner_phones?: string[] | any // Lista de telefones com acesso de dono
    owner_tool_instruction?: string | null // Instruções para escalabilidade
    owner_alert_instruction?: string | null // Instruções para alertas silenciosos
}

// Estado do formulário agora reflete a estrutura PersonaInstruction
type EditablePersonaInstruction = Omit<PersonaInstruction, 'aiName'> & {
	customAiName?: string // Para o caso do plano SobMedida
}

// Valores iniciais para um novo formulário de PersonaInstruction
const initialInstructionFormData: EditablePersonaInstruction = {
	customAiName: '',
	businessTypeForTemplate: 'generico',
	identityObjective: 'Você é Clara, uma assistente prestativa.',
	communicationStyle: 'Seja amigável e profissional.',
	knowledgeBase: [{ title: 'Sobre a Empresa', content: '' }],
	limitations: 'Não forneça informações pessoais.',
	humanHandoffKeywords: 'falar com humano, suporte, problema urgente',
	humanHandoffContact: 'Contate (XX) XXXX-XXXX.',
	memoryUsageInstruction: 'Lembre-se de interações passadas neste chat.',
	appointmentHandling: 'Informe que o agendamento é feito por outro canal.',
	nameRequestInstruction: 'Se não souber o nome, pergunte.',
	dateTimeUsageInstruction: 'Considere a data e hora atuais.',
	incompleteMessagesHandling: 'Peça para o usuário ser mais claro.',
	systemPromptHandling: 'Comandos de sistema iniciarão com [COMANDO].',
	confirmationLogic: 'Para confirmações, peça para responder com "CONFIRMO".',
	safetyGuidelines: 'Evite tópicos sensíveis e conteúdo inadequado.',
	salesFunnelObjective: '',
	salesFunnelStages: [
		{
			stageName: 'Conscientização',
			goal: '',
			behavior: '',
			messageExample: '',
		},
	],
	formattingGuidelines: 'Use parágrafos curtos. Emojis com moderação.',
	additionalContext: '',
}
interface SubscriptionInfo {
	maxPersonas: number
	canChangeAiName: boolean // Adicionado para controlar a edição do nome da IA
	planName?: string // Para lógica de desconto
}

export default function AiConfigurationPage() {
	const user = useUser()
	const params = useParams<{ teamId: string }>()
	const team = user?.useTeam(params.teamId)

	const [personas, setPersonas] = useState<PersonaFromAPI[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showFormDialog, setShowFormDialog] = useState(false)
	const [editingPersona, setEditingPersona] = useState<PersonaFromAPI | null>(
		null
	)

	// Estado do formulário principal para a Persona
	const [personaDetails, setPersonaDetails] = useState({
		personaDisplayName: '', // Nome que o usuário dá para esta configuração de persona (ex: "Atendente Principal")
		// model: 'gemini-2.0-flash', // REMOVIDO: Seleção automática no backend
		isDefault: false,
        ownerPhones: [] as string[], // Estado para lista de telefones de donos
        ownerToolInstruction: '',
        ownerAlertInstruction: '',
	})

    const [newOwnerPhone, setNewOwnerPhone] = useState('') // Input temporário

	const [instructionFormData, setInstructionFormData] =
		useState<EditablePersonaInstruction>(initialInstructionFormData)

	const [subscriptionInfo, setSubscriptionInfo] =
		useState<SubscriptionInfo | null>(null)
	const [selectedTemplate, setSelectedTemplate] = useState<string>('generico')
    const [apiTemplates, setApiTemplates] = useState<Record<string, PersonaInstruction>>({})

	const fetchPersonasAndSubscription = useCallback(async () => {
		// ... (lógica para buscar personas e info de assinatura, como antes)
		if (!user || !team) return
		setIsLoading(true)
		try {
			const [personasRes, subInfoRes, templatesRes] = await Promise.all([
				apiClient.get('/personas'),
				apiClient.get('/subscriptions/current'),
                apiClient.get('/personas/templates'),
			])
			setPersonas(personasRes.data.personas || [])
            
            // Process Templates
            if (templatesRes.data.templates && Array.isArray(templatesRes.data.templates)) {
                const templatesMap: Record<string, PersonaInstruction> = {};
                templatesRes.data.templates.forEach((t: any) => {
                    templatesMap[t.id] = t.instruction;
                });
                setApiTemplates(templatesMap);
            }

			const subData = subInfoRes.data
			setSubscriptionInfo({
				maxPersonas: subData.max_personas_count || 1,
				planName: subData.plan_name,
				// Exemplo: Habilita mudança de nome da IA para plano "Sob Medida"
				canChangeAiName: subData.plan_name === 'Sob Medida',
			})
		} catch (error) {
			/* ... */
            console.error("Erro ao carregar dados:", error);
		} finally {
			setIsLoading(false)
		}
	}, [user, team])

	useEffect(() => {
		fetchPersonasAndSubscription()
	}, [fetchPersonasAndSubscription])

	const handleTemplateChange = (templateKey: string) => {
		setSelectedTemplate(templateKey)
		// Usa apiTemplates em vez do hardcoded personaTemplates
        // Se a API falhar, pode cair no fallback (personaTemplates) ou vazio
        const template = apiTemplates[templateKey] || personaTemplates[templateKey]
		if (template) {
			setInstructionFormData((prev) => ({
				...initialInstructionFormData, // Reseta para o base para não acumular de templates diferentes
				...template, // Aplica o template
				// aiName é tratado separadamente pela lógica de plano
				customAiName: prev.customAiName, // Mantém o nome customizado se já estava sendo editado
				businessTypeForTemplate: templateKey,
			}))
		}
	}

	const handleInstructionInputChange = (
		e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		section?: keyof PersonaInstruction,
		index?: number,
		field?: keyof KnowledgeSubSection | keyof SalesFunnelStage
	) => {
		const { name, value } = e.target

		if (section === 'knowledgeBase' && typeof index === 'number' && field) {
			setInstructionFormData((prev) => ({
				...prev,
				knowledgeBase: prev.knowledgeBase.map((item, i) =>
					i === index ? { ...item, [field]: value } : item
				),
			}))
		} else if (
			section === 'salesFunnelStages' &&
			typeof index === 'number' &&
			field
		) {
			setInstructionFormData((prev) => ({
				...prev,
				salesFunnelStages: (prev.salesFunnelStages || []).map(
					(item, i) =>
						i === index ? { ...item, [field]: value } : item
				),
			}))
		} else {
			setInstructionFormData((prev) => ({ ...prev, [name]: value }))
		}
	}

	const addKnowledgeSection = () => {
		setInstructionFormData((prev) => ({
			...prev,
			knowledgeBase: [...prev.knowledgeBase, { title: '', content: '' }],
		}))
	}
	const removeKnowledgeSection = (index: number) => {
		setInstructionFormData((prev) => ({
			...prev,
			knowledgeBase: prev.knowledgeBase.filter((_, i) => i !== index),
		}))
	}

    // Handlers para Owner Phones
    const handleAddOwnerPhone = () => {
        if (!newOwnerPhone.trim()) return;
        // Limpeza básica: manter apenas números
        const cleanPhone = newOwnerPhone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            toast.error("Número de telefone inválido (muito curto).");
            return;
        }
        if (personaDetails.ownerPhones.includes(cleanPhone)) {
             toast.error("Este número já está na lista.");
             return;
        }
        setPersonaDetails(prev => ({
            ...prev,
            ownerPhones: [...prev.ownerPhones, cleanPhone]
        }));
        setNewOwnerPhone('');
    };

    const handleRemoveOwnerPhone = (phoneToRemove: string) => {
        setPersonaDetails(prev => ({
            ...prev,
            ownerPhones: prev.ownerPhones.filter(p => p !== phoneToRemove)
        }));
    };


	const resetForm = () => {
		setEditingPersona(null)
		setPersonaDetails({
			personaDisplayName: '',
			// model: 'gemini-2.0-flash',
			isDefault: false, // Reset explicit
            ownerPhones: [],
            ownerToolInstruction: '',
            ownerAlertInstruction: '',
		})
        setNewOwnerPhone('');
		setInstructionFormData(initialInstructionFormData)
		setSelectedTemplate('generico')
	}

	const handleEdit = (persona: PersonaFromAPI) => {
		setEditingPersona(persona)
        
        // Process owner_phones which might come as JSON array or string array from API
        let phones: string[] = [];
        if (Array.isArray(persona.owner_phones)) {
            phones = persona.owner_phones.map(String);
        }

		setPersonaDetails({
			personaDisplayName: persona.persona_name,
			// model: persona.model,
			isDefault: persona.is_default,
            ownerPhones: phones,
            ownerToolInstruction: persona.owner_tool_instruction || '',
            ownerAlertInstruction: persona.owner_alert_instruction || '',
		})
		// Desestrutura a instrução JSON do banco para o formulário
		// Se instruction for string (JSON antigo), tenta parsear. Se for objeto, usa direto.
		let instructionObject: Partial<PersonaInstruction> = {}
		if (typeof persona.instruction === 'string') {
			try {
				instructionObject = JSON.parse(persona.instruction)
			} catch (e) {
				logger.error('Falha ao parsear instrução JSON antiga:', e)
			}
		} else if (
			typeof persona.instruction === 'object' &&
			persona.instruction !== null
		) {
			instructionObject = persona.instruction
		}

		setInstructionFormData({
			...initialInstructionFormData, // Começa com defaults para garantir todos os campos
			...(instructionObject as EditablePersonaInstruction), // Sobrescreve com dados do DB
			customAiName: subscriptionInfo?.canChangeAiName
				? instructionObject.aiName || ''
				: '',
		})
		setSelectedTemplate(
			instructionObject.businessTypeForTemplate || 'generico'
		)
		setShowFormDialog(true)
	}

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		if (!personaDetails.personaDisplayName) { // Removida checagem de model
			toast.error('Nome da persona é obrigatório.')
			return
		}

		if (
			!editingPersona &&
			subscriptionInfo &&
			personas.length >= subscriptionInfo.maxPersonas
		) {
			toast.error(
				`Limite de ${subscriptionInfo.maxPersonas} persona(s) do plano atingido.`
			)
			return
		}

		setIsSubmitting(true)

		// Monta o objeto de instrução final
		const finalInstruction: PersonaInstruction = {
			...instructionFormData,
			aiName:
				subscriptionInfo?.canChangeAiName &&
				instructionFormData.customAiName?.trim()
					? instructionFormData.customAiName.trim()
					: 'Clara',
		}
		// Remove customAiName se existir, pois ele já foi incorporado em aiName
		const { customAiName, ...instructionPayloadForDB } =
			finalInstruction as EditablePersonaInstruction & {
				customAiName?: string
			}

		const payload = {
			persona_name: personaDetails.personaDisplayName,
			model: 'auto', // Backend agora decide ou usa padrão
			instruction: instructionPayloadForDB, 
			is_default: personaDetails.isDefault,
            owner_phones: personaDetails.ownerPhones, // Envia lista de donos
            owner_tool_instruction: personaDetails.ownerToolInstruction,
            owner_alert_instruction: personaDetails.ownerAlertInstruction,
		}

		try {
			if (editingPersona) {
				await apiClient.put(`/personas/${editingPersona.id}`, payload)
				toast.success('Persona atualizada com sucesso!')
			} else {
				await apiClient.post('/personas', payload)
				toast.success('Persona criada com sucesso!')
			}
			setShowFormDialog(false)
			resetForm()
			fetchPersonasAndSubscription()
		} catch (error: any) {
			logger.error('Erro ao salvar persona:', error)
			toast.error(
				error.response?.data?.message || 'Falha ao salvar persona.'
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleDelete = async (personaId: string) => {
		if (
			!confirm(
				'Tem certeza que deseja deletar esta persona? Instâncias associadas podem precisar ser reconfiguradas.'
			)
		) {
			return
		}
		try {
			await apiClient.delete(`/personas/${personaId}`)
			toast.success('Persona deletada com sucesso.')
			fetchPersonasAndSubscription()
		} catch (error: any) {
			logger.error('Erro ao deletar persona:', error)
			toast.error(
				error.response?.data?.message || 'Falha ao deletar persona.'
			)
		}
	}

	if (isLoading) {
		return (
			<div className='p-4 md:p-6 space-y-6'>
				<Skeleton className='h-8 w-1/3 mb-2' />
				<Skeleton className='h-6 w-1/2 mb-6' />
				<Skeleton className='h-12 w-40 mb-6' />
				<div className='grid md:grid-cols-2 gap-6'>
					<Skeleton className='h-[200px] rounded-lg' />
					<Skeleton className='h-[200px] rounded-lg' />
				</div>
			</div>
		)
	}
	if (!user || !team) {
		return <div className='p-6'>Carregando informações...</div>
	}

	const canCustomizeAiName = subscriptionInfo?.canChangeAiName
	const currentAiName =
		canCustomizeAiName && instructionFormData.customAiName?.trim()
			? instructionFormData.customAiName.trim()
			: 'Clara'
	const getsDiscount =
		!canCustomizeAiName || (canCustomizeAiName && currentAiName === 'Clara')

	return (
		<div className='p-4 md:p-6 space-y-8'>
			<div className='flex flex-col sm:flex-row justify-between sm:items-center gap-4'>
				<div>
					<h1 className='text-3xl font-bold text-foreground'>
						Configurações de IA (Personas)
					</h1>
					<p className='text-muted-foreground mt-1'>
						Crie e gerencie as personalidades da sua assistente
						virtual. Você pode ter até{' '}
						{subscriptionInfo?.maxPersonas || 1} persona(s) em seu
						plano atual.
					</p>
				</div>
                <div className='flex gap-2'>
				<Button onClick={() => { resetForm(); setShowFormDialog(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Nova Persona
                </Button>
                </div>
			</div>

            {/* LISTA DE PERSONAS */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {personas.map(persona => (
                    <Card key={persona.id} className={cn("relative", persona.is_default ? "border-primary border-2" : "")}>
                        {persona.is_default && (
                            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded-bl-lg font-medium">
                                Padrão
                            </div>
                        )}
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BrainCircuit className="h-5 w-5 text-muted-foreground" />
                                {persona.persona_name}
                            </CardTitle>
                        </CardHeader>
                         <CardContent>
                             <div className="space-y-2 text-sm text-muted-foreground">
                                 <p>Modelo: Automático (Gerenciado por IA)</p>
                                 <p>Instância Online: {persona.is_online ? <Badge variant="success">Sim</Badge> : <Badge variant="secondary">Não</Badge>}</p>
                                 {persona.owner_phones && Array.isArray(persona.owner_phones) && persona.owner_phones.length > 0 && (
                                     <p className="flex items-center gap-1">
                                         <Shield className="h-3 w-3" /> {persona.owner_phones.length} admins
                                     </p>
                                 )}
                             </div>
                             <div className="mt-4 flex gap-2 justify-end">
                                 <Button variant="outline" size="sm" onClick={() => handleEdit(persona)}>
                                     <Edit3 className="h-4 w-4 mr-1" /> Editar
                                 </Button>
                                 <Button variant="ghost" size="sm" onClick={() => handleDelete(persona.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                     <Trash2 className="h-4 w-4" />
                                 </Button>
                             </div>
                         </CardContent>
                    </Card>
                ))}
            </div>

			<Dialog
				open={showFormDialog}
				onOpenChange={(isOpen) => {
					setShowFormDialog(isOpen)
					if (!isOpen) resetForm()
				}}
			>
				<DialogContent className='max-w-5xl'>
					{' '}
					{/* Aumentado para mais campos */}
					<DialogHeader>
						<DialogTitle>
							{editingPersona
								? 'Editar Configuração da Persona'
								: 'Nova Configuração de Persona'}
						</DialogTitle>
						<DialogDescription>
							Defina os detalhes e as instruções avançadas
							para esta IA.
						</DialogDescription>
					</DialogHeader>
					<form
						onSubmit={handleSubmit}
						className='space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-2'
					>
						{/* Detalhes Básicos da Persona (Nome da Configuração, Modelo, Default) */}
						<Card>
							<CardHeader>
								<CardTitle className='text-lg'>
									Informações Gerais da Persona
								</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div>
									<Label htmlFor='personaDisplayName'>
										Nome desta Configuração de Persona
									</Label>
									<Input
										id='personaDisplayName'
										value={
											personaDetails.personaDisplayName
										}
										onChange={(e) =>
											setPersonaDetails((p) => ({
												...p,
												personaDisplayName:
													e.target.value,
											}))
										}
										placeholder='Ex: Atendente Clínica Principal'
										required
									/>
								</div>
								
                                {/* MODEL SELECT REMOVED - AUTOMATED BACKEND */}

								<div className='flex items-center space-x-2'>
									<Switch
										id='isDefault'
										checked={personaDetails.isDefault}
										onCheckedChange={(checked) =>
											setPersonaDetails((p) => ({
												...p,
												isDefault: checked,
											}))
										}
									/>
									<Label htmlFor='isDefault'>
										Definir como Padrão para Novas
										Instâncias
									</Label>
								</div>
							</CardContent>
						</Card>

                         {/* SEÇÃO DE DONOS/ADMINS */}
                        <Card>
							<CardHeader>
								<CardTitle className='text-lg flex items-center gap-2'>
									<Shield className="h-5 w-5 text-primary" /> Telefones dos Donos (Admins)
								</CardTitle>
                                <DialogDescription>
                                    Estes números serão identificados pela Clara como "chefes", tendo acesso a comandos de sistema e diagnósticos.
                                </DialogDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Ex: 5511999999999 (apenas números)" 
                                        value={newOwnerPhone}
                                        onChange={(e) => setNewOwnerPhone(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="button" onClick={handleAddOwnerPhone} variant="secondary">Adicionar</Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {personaDetails.ownerPhones.length === 0 && (
                                        <span className="text-sm text-muted-foreground italic">Nenhum telefone de admin configurado.</span>
                                    )}
                                    {personaDetails.ownerPhones.map(phone => (
                                        <Badge key={phone} variant="outline" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                            {phone}
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-4 w-4 rounded-full hover:bg-destructive/20 hover:text-destructive"
                                                onClick={() => handleRemoveOwnerPhone(phone)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

						{/* PROTOCOLOS DE ESCALABILIDADE & ALERTAS (NOVO) */}
                        <Card>
							<CardHeader>
								<CardTitle className='text-lg flex items-center gap-2'>
									<Shield className="h-5 w-5 text-red-500" /> Protocolos de Segurança & Alertas
								</CardTitle>
                                <DialogDescription>
                                    Defina quando a Clara deve solicitar sua interveção.
                                </DialogDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
                                <div>
                                    <Label htmlFor='ownerToolInstruction'>
                                        Quando solicitar ajuda humana? (Escalabilidade)
                                    </Label>
                                    <Textarea
                                        id='ownerToolInstruction'
                                        value={personaDetails.ownerToolInstruction}
                                        onChange={(e) => setPersonaDetails(p => ({ ...p, ownerToolInstruction: e.target.value }))}
                                        rows={3}
                                        placeholder="Ex: Apenas me chame se o cliente insistir em um horário indisponível ou pedir para falar com o gerente."
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Clara irá pausar a conversa e enviar uma notificação para os donos cadastrados.</p>
                                </div>
                                <div>
                                    <Label htmlFor='ownerAlertInstruction'>
                                        Alertas Silenciosos (Monitoramento)
                                    </Label>
                                    <Textarea
                                        id='ownerAlertInstruction'
                                        value={personaDetails.ownerAlertInstruction}
                                        onChange={(e) => setPersonaDetails(p => ({ ...p, ownerAlertInstruction: e.target.value }))}
                                        rows={3}
                                        placeholder="Ex: Me avise imediatamente se o cliente usar termos agressivos, falar em processo ou cancelar o plano."
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Clara continuará a conversa normalmente, mas enviará um alerta para você.</p>
                                </div>
                            </CardContent>
                        </Card>

						{/* Seleção de Template */}
						<Card>
							<CardHeader>
								<CardTitle className='text-lg'>
									Template de Instruções
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Label htmlFor='templateSelect'>
									Comece com um modelo (opcional)
								</Label>
								<Select
									value={selectedTemplate}
									onValueChange={handleTemplateChange}
								>
									<SelectTrigger
										id='templateSelect'
										className='w-full mt-1'
									>
										<SelectValue placeholder='Selecione um template' />
									</SelectTrigger>
									<SelectContent>
										{Object.keys(apiTemplates).length > 0 ? (
                                            Object.entries(apiTemplates).map(([key, template]) => (
                                                <SelectItem key={key} value={key}>
                                                    {/* Tenta usar o nome formatado da API se disponível (mas aqui temos só a instrução)
                                                        Vamos formatar a chave mesmo */}
                                                    {key === 'DENTIST' ? 'Clínica Odontológica' :
                                                     key === 'GYM' ? 'Academia' :
                                                     key === 'RESTAURANT' ? 'Restaurante' :
                                                     key === 'RETAIL' ? 'Varejo' :
                                                     key.charAt(0).toUpperCase() + key.slice(1).toLowerCase().replace(/_/g, ' ')}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            /* Fallback para hardcoded se API falhar */
                                            Object.entries(personaTemplates).map(([key, template]) => (
                                                <SelectItem key={key} value={key}>
                                                    {template.aiName
                                                        ? `${template.aiName} para ${key.charAt(0).toUpperCase() + key.slice(1)}`
                                                        : key.charAt(0).toUpperCase() + key.slice(1)}
                                                </SelectItem>
                                            ))
                                        )}
									</SelectContent>
								</Select>
							</CardContent>
						</Card>

						{/* Campos Detalhados da Instrução */}
						<Card>
							<CardHeader>
								<CardTitle className='text-lg'>
									Instruções Detalhadas da IA
								</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								{canCustomizeAiName && (
									<div>
										<Label htmlFor='customAiName'>
											Nome da IA (Personalizável)
										</Label>
										<Input
											id='customAiName'
											name='customAiName'
											value={
												instructionFormData.customAiName
											}
											onChange={(e) =>
												handleInstructionInputChange(
													e
												)
											}
											placeholder='Ex: Bia, Max, Atendente Digital'
										/>
										<p className='text-xs text-muted-foreground mt-1'>
											Seu plano permite um nome
											customizado. Deixe &ldquo;Clara&ldquo; para
											um possível desconto.
										</p>
									</div>
								)}
								<p className='text-sm font-semibold'>
									A IA se apresentará como:{' '}
									<span className='text-primary'>
										{currentAiName}
									</span>
									{getsDiscount &&
										canCustomizeAiName &&
										currentAiName === 'Clara' && (
											<Badge
												variant='outline'
												className='ml-2 bg-green-100 text-green-700 border-green-300'
											>
												Desconto Aplicável
											</Badge>
										)}
								</p>

								<div>
									<Label htmlFor='identityObjective'>
										Identidade e Objetivo Principal
									</Label>
									<Textarea
										id='identityObjective'
										name='identityObjective'
										value={
											instructionFormData.identityObjective
										}
										onChange={(e) =>
											handleInstructionInputChange(e)
										}
										rows={3}
										placeholder='Ex: Seu nome é [Nome da IA], uma recepcionista virtual de IA para [Nome da Clínica/Empresa]...'
									/>
								</div>
								<div>
									<Label htmlFor='communicationStyle'>
										Estilo de Comunicação
									</Label>
									<Textarea
										id='communicationStyle'
										name='communicationStyle'
										value={
											instructionFormData.communicationStyle
										}
										onChange={(e) =>
											handleInstructionInputChange(e)
										}
										rows={3}
										placeholder='Ex: Seja empática, acolhedora, use linguagem informal e amigável...'
									/>
								</div>

								<Label className='font-medium'>
									Base de Conhecimento
								</Label>
								{instructionFormData.knowledgeBase.map(
									(kb, index) => (
										<Card
											key={index}
											className='p-3 space-y-2 bg-muted/50'
										>
											<Input
												value={kb.title}
												onChange={(e) =>
													handleInstructionInputChange(
														e,
														'knowledgeBase',
														index,
														'title'
													)
												}
												placeholder='Título da Seção (Ex: Sobre a Clínica)'
											/>
											<Textarea
												value={kb.content}
												onChange={(e) =>
													handleInstructionInputChange(
														e,
														'knowledgeBase',
														index,
														'content'
													)
												}
												placeholder='Conteúdo da seção...'
												rows={3}
											/>
											<Button
												type='button'
												variant='ghost'
												size='sm'
												onClick={() =>
													removeKnowledgeSection(
														index
													)
												}
												className='text-destructive hover:text-destructive'
											>
												Remover Seção
											</Button>
										</Card>
									)
								)}
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={addKnowledgeSection}
								>
									Adicionar Seção de Conhecimento
								</Button>

								{/* Outros campos: limitations, humanHandoffKeywords, etc. como Textareas */}
								<div>
									<Label htmlFor='limitations'>
										Limitações e Proibições
									</Label>
									<Textarea
										id='limitations'
										name='limitations'
										value={
											instructionFormData.limitations
										}
										onChange={(e) =>
											handleInstructionInputChange(e)
										}
										rows={3}
									/>
								</div>
								<div>
									<Label htmlFor='humanHandoffKeywords'>
										Palavras-chave para Encaminhamento
										Humano
									</Label>
									<Textarea
										id='humanHandoffKeywords'
										name='humanHandoffKeywords'
										value={
											instructionFormData.humanHandoffKeywords
										}
										onChange={(e) =>
											handleInstructionInputChange(e)
										}
										rows={2}
										placeholder='Ex: problema, cancelar, falar com gerente'
									/>
								</div>
								<div>
									<Label htmlFor='humanHandoffContact'>
										Contato para Encaminhamento Humano
									</Label>
									<Input
										id='humanHandoffContact'
										name='humanHandoffContact'
										value={
											instructionFormData.humanHandoffContact
										}
										onChange={(e) =>
											handleInstructionInputChange(e)
										}
										placeholder='Ex: WhatsApp (XX) XXXXX-XXXX ou telefone YYYY-YYYY'
									/>
								</div>
								{/* ... Adicionar todos os campos de instructionFormData como Inputs/Textareas ... */}
								{/* Exemplo para salesFunnelStages (mais complexo, pode precisar de um componente dedicado) */}

								<div>
									<Label htmlFor='formattingGuidelines'>
										Diretrizes de Formatação
									</Label>
									<Textarea
										id='formattingGuidelines'
										name='formattingGuidelines'
										value={
											instructionFormData.formattingGuidelines
										}
										onChange={(e) =>
											handleInstructionInputChange(e)
										}
										rows={2}
									/>
								</div>
								<div>
									<Label htmlFor='additionalContext'>
										Contexto Adicional (Opcional)
									</Label>
									<Textarea
										id='additionalContext'
										name='additionalContext'
										value={
											instructionFormData.additionalContext ||
											''
										}
										onChange={(e) =>
											handleInstructionInputChange(e)
										}
										rows={3}
									/>
								</div>
							</CardContent>
						</Card>

						<DialogFooter>
							<DialogClose asChild>
								<Button type='button' variant='outline'>
									Cancelar
								</Button>
							</DialogClose>
							<Button type='submit' disabled={isSubmitting}>
								{isSubmitting
									? editingPersona
										? 'Salvando...'
										: 'Criando...'
									: editingPersona
									? 'Salvar Alterações'
									: 'Criar Persona'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			{subscriptionInfo &&
				personas.length >= subscriptionInfo.maxPersonas &&
				!editingPersona && (
					<p className='text-sm text-red-500 dark:text-red-400'>
						Você atingiu o limite de personas para o seu plano.
					</p>
				)}
		</div>
	)
}
