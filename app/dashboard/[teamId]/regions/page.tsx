'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogClose, // Removido DialogTrigger não usado diretamente aqui para <Dialog open>
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import apiClient from '@/lib/axios'
// Adicionado CardDescription
import { cn } from '@/lib/utils'
import { useUser } from '@stackframe/stack'
import {
	PlusCircle,
	RefreshCw,
	Trash2,
	PowerOff,
	ScanLine,
	Info,
	Locate,
	Wifi,
	WifiOff,
	RotateCcw,
} from 'lucide-react'
// Adicionado Wifi, WifiOff
import Image from 'next/image'
// Corrigido para useTeam se necessário
import { useParams } from 'next/navigation'
import React, { useState, useEffect, useCallback, FormEvent } from 'react'
import { toast } from 'sonner'

// Se você usar cn

const logger = console

interface Persona {
	id: string
	persona_name: string
	is_default: boolean
}
interface Instance {
	id: string
	instance_name: string
	status: string
	qr_code?: string | null
	qr_code_expires_at?: string | null // ISO string date
	last_status_message?: string | null
	persona_id: string
	persona?: { persona_name: string }
	last_connection_at?: string | null
	last_disconnection_at?: string | null
}

interface SubscriptionInfo {
	maxInstances: number
}

const LIST_POLLING_INTERVAL = 15000 // Polling da lista completa a cada 15 segundos
const QR_POLLING_INTERVAL = 5000 // Polling do QR Code focado a cada 5 segundos

export default function WhatsAppInstancesPage() {
	const user = useUser({ or: 'redirect' })
	const params = useParams<{ teamId: string }>()
	const team = user?.useTeam(params.teamId)

	const [instances, setInstances] = useState<Instance[]>([])
	const [personas, setPersonas] = useState<Persona[]>([])
	const [selectedPersonaId, setSelectedPersonaId] = useState<string>('')
	const [newInstanceName, setNewInstanceName] = useState('')
	const [isLoadingInitialData, setIsLoadingInitialData] = useState(true) // Loading inicial
	const [isSubmittingAction, setIsSubmittingAction] = useState(false) // Para ações como criar, deletar, desconectar

	// Estado para o Dialog do QR Code
	const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)
	const [qrDialogInstance, setQrDialogInstance] = useState<Instance | null>(
		null
	) // Instância cujo QR está no dialog
	const [currentQrCodeValue, setCurrentQrCodeValue] = useState<string | null>(
		null
	)
	const [isQrLoading, setIsQrLoading] = useState(false) // Loading específico para o QR dentro do dialog

	const [subscriptionInfo, setSubscriptionInfo] =
		useState<SubscriptionInfo | null>(null)

	const [connectingInstances, setConnectingInstances] = useState<Set<string>>(
		new Set()
	)

	const fetchAllData = useCallback(
		async (showLoadingSpinner = false) => {
			if (!user || !team) return
			if (showLoadingSpinner) setIsLoadingInitialData(true)

			try {
				const [instancesRes, personasRes, subInfoRes] =
					await Promise.all([
						apiClient.get('/instances'),
						apiClient.get('/personas'),
						apiClient.get('/subscriptions/current'),
					])

				const newInstancesData = instancesRes.data.instances || []
				setInstances(newInstancesData)
				const fetchedPersonas = personasRes.data.personas || []
				setPersonas(fetchedPersonas)
				setSubscriptionInfo({
					maxInstances: subInfoRes.data.max_instances_count || 1,
				})

				// Atualiza a instância do dialog do QR se ela estiver na nova lista
				if (qrDialogInstance) {
					const updatedDialogInstance = newInstancesData.find(
						(inst: Instance) => inst.id === qrDialogInstance.id
					)
					if (updatedDialogInstance) {
						setQrDialogInstance(updatedDialogInstance)
						setCurrentQrCodeValue(
							updatedDialogInstance.qr_code || null
						)
						// Lógica para fechar o dialog se conectado etc., já está no useEffect do QR polling
					} else {
						// Instância do dialog não existe mais
						setIsQrDialogOpen(false)
					}
				}

				if (fetchedPersonas.length > 0 && !selectedPersonaId) {
					// Define apenas se não estiver já definido
					const defaultPersona =
						fetchedPersonas.find((p: Persona) => p.is_default) ||
						fetchedPersonas[0]
					if (defaultPersona) setSelectedPersonaId(defaultPersona.id)
				}
			} catch (error: any) {
				logger.error(
					'Erro em fetchAllData:',
					error.response?.data || error.message
				)
				toast.error(
					error.response?.data?.message ||
						'Não foi possível atualizar os dados.'
				)
			} finally {
				if (showLoadingSpinner) setIsLoadingInitialData(false)
			}
		},
		[user, team, selectedPersonaId, qrDialogInstance]
	) // selectedPersonaId na dependência para evitar reset desnecessário

	// Fetch inicial de dados
	useEffect(() => {
		if (user && team) {
			fetchAllData(true) // Mostrar spinner no carregamento inicial
		}
	}, [user, team, fetchAllData]) // fetchAllData agora está no array de dependências

	// Polling para a lista completa de instâncias
	useEffect(() => {
		if (!user || !team) return // Não inicia o polling se user/team não estiverem prontos

		// logger.info("Iniciando polling da lista de instâncias...");
		const intervalId = setInterval(() => {
			// logger.info("Polling: buscando lista de instâncias...");
			fetchAllData(false) // Não mostra o spinner global para polling de fundo
		}, LIST_POLLING_INTERVAL)

		return () => {
			// logger.info("Limpando polling da lista de instâncias.");
			clearInterval(intervalId)
		}
	}, [user, team, fetchAllData]) // Re-inicia o polling se user/team/fetchAllData mudar

	// Polling focado no QR Code quando o dialog está aberto
	useEffect(() => {
		let qrIntervalId: NodeJS.Timeout | null = null

		const pollSpecificInstanceQr = async () => {
			if (
				!isQrDialogOpen ||
				!qrDialogInstance ||
				qrDialogInstance.status !== 'needs_qr'
			) {
				if (qrIntervalId) clearInterval(qrIntervalId)
				// logger.info(`Poll QR: Parando. DialogOpen: ${isQrDialogOpen}, InstanceStatus: ${qrDialogInstance?.status}`);
				return
			}
			// logger.info(`Poll QR: Buscando dados para instância ${qrDialogInstance.id}`);
			setIsQrLoading(true) // Ativa loading específico do QR
			try {
				const response = await apiClient.get<{ instance: Instance }>(
					`/instances/${qrDialogInstance.id}`
				)
				const updatedInstance = response.data.instance

				if (
					updatedInstance &&
					qrDialogInstance?.id === updatedInstance.id
				) {
					// Confirma que ainda é a mesma instância
					setQrDialogInstance(updatedInstance) // Atualiza a instância no estado do dialog
					setCurrentQrCodeValue(updatedInstance.qr_code || null)

					if (updatedInstance.status === 'connected') {
						toast.success(
							`Instância "${updatedInstance.instance_name}" conectada!`
						)
						setIsQrDialogOpen(false) // Fecha o dialog
						fetchAllData() // Força um refresh da lista principal
					} else if (
						updatedInstance.status === 'error' ||
						updatedInstance.status === 'disconnected'
					) {
						toast.error(
							`Instância "${updatedInstance.instance_name}" ${
								updatedInstance.status
							}. ${updatedInstance.last_status_message || ''}`
						)
						setIsQrDialogOpen(false)
						fetchAllData()
					} else if (updatedInstance.status !== 'needs_qr') {
						// Se o status mudou para algo que não é mais 'needs_qr' (ex: 'connecting')
						// O polling geral da lista deve pegar, mas podemos fechar o dialog se quisermos
						// setIsQrDialogOpen(false); // Opcional
					}
				}
			} catch (error) {
				logger.error(
					`Poll QR: Erro ao buscar dados da instância ${qrDialogInstance.id}:`,
					error
				)
				// Poderia adicionar um toast se o polling do QR falhar repetidamente
			} finally {
				setIsQrLoading(false)
			}
		}

		if (
			isQrDialogOpen &&
			qrDialogInstance &&
			qrDialogInstance.status === 'needs_qr'
		) {
			pollSpecificInstanceQr() // Busca imediata
			qrIntervalId = setInterval(
				pollSpecificInstanceQr,
				QR_POLLING_INTERVAL
			)
		}

		return () => {
			if (qrIntervalId) clearInterval(qrIntervalId)
		}
	}, [isQrDialogOpen, qrDialogInstance, fetchAllData])

	useEffect(() => {
		let intervalId: NodeJS.Timeout | null = null
		const pollInstanceData = async (instanceId: string) => {
			if (
				!isQrDialogOpen ||
				!qrDialogInstance ||
				qrDialogInstance.id !== instanceId
			) {
				// Se o dialog fechou ou a instância mudou, para o polling
				if (intervalId) clearInterval(intervalId)
				return
			}
			try {
				// logger.info(`Polling for instance ${instanceId}`);
				const response = await apiClient.get<{ instance: Instance }>(
					`/instances/${instanceId}`
				)
				const updatedInstance = response.data.instance

				if (updatedInstance) {
					// Atualiza a instância específica na lista de instâncias
					setInstances((prev) =>
						prev.map((inst) =>
							inst.id === instanceId ? updatedInstance : inst
						)
					)

					// Atualiza os dados da instância no dialog do QR
					if (qrDialogInstance?.id === instanceId) {
						setQrDialogInstance(updatedInstance)
						setCurrentQrCodeValue(updatedInstance.qr_code || null)
						setIsQrLoading(false) // Para o loading após a primeira tentativa de buscar QR

						if (updatedInstance.status === 'connected') {
							toast.success(
								`Instância "${updatedInstance.instance_name}" conectada com sucesso!`
							)
							setIsQrDialogOpen(false)
						} else if (
							updatedInstance.status === 'disconnected' ||
							updatedInstance.status === 'error'
						) {
							toast.error(
								`Instância "${updatedInstance.instance_name}" ${
									updatedInstance.status === 'error'
										? 'encontrou um erro'
										: 'foi desconectada'
								}. Detalhe: ${
									updatedInstance.last_status_message || ''
								}`
							)
							setIsQrDialogOpen(false)
						} else if (
							updatedInstance.status !== 'needs_qr' &&
							updatedInstance.status !== 'connecting'
						) {
							// Se o status mudou para algo que não requer QR, fecha o dialog
							setIsQrDialogOpen(false)
						}
					}
				}
			} catch (error) {
				logger.error(
					`Erro no polling para instância ${instanceId}:`,
					error
				)
				setIsQrLoading(false)
				// Não mostra toast para erro de polling para não ser invasivo,
				// mas pode ser útil se o QR não carregar de jeito nenhum.
			}
		}

		if (
			isQrDialogOpen &&
			qrDialogInstance &&
			(qrDialogInstance.status === 'needs_qr' ||
				qrDialogInstance.status === 'connecting')
		) {
			setIsQrLoading(!qrDialogInstance.qr_code) // Mostra loading se não tem QR e precisa
			pollInstanceData(qrDialogInstance.id) // Busca imediata
			intervalId = setInterval(
				() => pollInstanceData(qrDialogInstance.id!),
				QR_POLLING_INTERVAL
			)
		}

		return () => {
			if (intervalId) clearInterval(intervalId)
		}
	}, [isQrDialogOpen, qrDialogInstance]) // Depende apenas destes para controlar o polling

	const handleCreateInstance = async (e: FormEvent) => {
		e.preventDefault()
		if (!newInstanceName.trim() || !selectedPersonaId) {
			/* ... */ return
		}
		if (
			subscriptionInfo &&
			instances.length >= subscriptionInfo.maxInstances
		) {
			/* ... */ return
		}

		setIsSubmittingAction(true)
		let createdInstanceId: string | null = null
		try {
			const response = await apiClient.post('/instances', {
				instanceName: newInstanceName,
				personaId: selectedPersonaId,
			})
			toast.success(
				response.data.message || 'Instância solicitada para criação!'
			)
			setNewInstanceName('')
			createdInstanceId = response.data.instance?.id // Pega o ID da instância criada

			await fetchAllData(true) // Atualiza a lista completa, o que deve incluir a nova instância

			// Após fetchAllData, a lista 'instances' está atualizada.
			// Encontre a instância recém-criada na lista atualizada.
			if (createdInstanceId) {
				const newInstanceFromList = instances.find(
					(inst) => inst.id === createdInstanceId
				)

				if (newInstanceFromList) {
					logger.info(
						'Nova instância encontrada na lista após fetch:',
						newInstanceFromList.status,
						newInstanceFromList.id
					)
					// Se o status já for 'needs_qr' ou um estado que leva a isso, abre o dialog.
					// O bot pode levar alguns segundos para atualizar o status para 'needs_qr' e gerar o QR.
					// Abrimos o dialog, e o polling focado no QR se encarregará de buscar o QR.
					if (
						[
							'pending_creation',
							'connecting',
							'needs_qr',
							'disconnected',
							'error',
						].includes(newInstanceFromList.status)
					) {
						logger.info(
							`Abrindo dialog QR para a nova instância ${newInstanceFromList.instance_name} com status ${newInstanceFromList.status}`
						)
						handleOpenQrDialog(newInstanceFromList)
					}
				} else {
					logger.warn(
						`Instância recém-criada com ID ${createdInstanceId} não encontrada na lista após fetchAllData. O polling geral deverá pegá-la.`
					)
				}
			}
		} catch (error: any) {
			logger.error(
				'Erro ao criar instância:',
				error.response?.data || error.message
			)
			toast.error(
				error.response?.data?.message || 'Falha ao criar instância.'
			)
		} finally {
			setIsSubmittingAction(false)
		}
	}

	const handleOpenQrDialog = (instance: Instance) => {
		logger.info(
			`Abrindo dialog QR para: ${instance.instance_name}, Status: ${
				instance.status
			}, QR presente: ${!!instance.qr_code}`
		)
		setQrDialogInstance(instance)
		setCurrentQrCodeValue(instance.qr_code || null)
		// Ativa o loading SE o status for 'needs_qr' e não houver QR ainda,
		// OU se estiver 'connecting' (pois pode transitar para 'needs_qr').
		setIsQrLoading(
			(instance.status === 'needs_qr' && !instance.qr_code) ||
				instance.status === 'connecting' ||
				instance.status === 'pending_creation' // Se o bot ainda não processou
		)
		setIsQrDialogOpen(true)
	}

	const handleDeleteInstance = async (instanceId: string) => {
		if (
			!confirm(
				'Tem certeza que deseja deletar esta instância? Esta ação não pode ser desfeita e interromperá a conexão.'
			)
		) {
			return
		}
		setIsSubmittingAction(true)
		try {
			const response = await apiClient.delete(`/instances/${instanceId}`)
			toast.success(
				response.data.message || 'Instância deletada com sucesso.'
			)
			await fetchAllData(true)
		} catch (error: any) {
			logger.error(
				'Erro ao deletar instância:',
				error.response?.data || error.message
			)
			toast.error(
				error.response?.data?.message || 'Falha ao deletar instância.'
			)
		} finally {
			setIsSubmittingAction(false)
		}
	}

	const handleConnectInstance = async (instanceId: string) => {
		if (!confirm('Tentar conectar/reconectar esta instância do WhatsApp?'))
			return
		setConnectingInstances((prev) => new Set(prev).add(instanceId)) // Adiciona ao set de "conectando"
		setIsSubmittingAction(true) // Pode usar um estado de loading mais granular por card de instância
		try {
			const response = await apiClient.post(
				`/instances/${instanceId}/connect`
			)
			toast.info(
				response.data.message || 'Solicitação de conexão enviada.'
			)
			// O polling da lista (fetchAllData) vai atualizar o status eventualmente.
			// Forçar um fetch mais rápido para feedback imediato.
			setTimeout(() => fetchAllData(false), 1500)
		} catch (error: any) {
			logger.error(
				`Erro ao solicitar conexão para instância ${instanceId}:`,
				error.response?.data || error.message
			)
			toast.error(
				error.response?.data?.message || 'Falha ao solicitar conexão.'
			)
		} finally {
			setIsSubmittingAction(false)
			setConnectingInstances((prev) => {
				// Remove do set após a tentativa
				const next = new Set(prev)
				next.delete(instanceId)
				return next
			})
		}
	}

	const handleDisconnectInstance = async (instanceId: string) => {
		if (
			!confirm(
				'Tem certeza que deseja desconectar esta instância do WhatsApp?'
			)
		)
			return
		setIsSubmittingAction(true)
		setConnectingInstances((prev) => new Set(prev).add(instanceId)) // Reutiliza para indicar ação em progresso
		try {
			const response = await apiClient.post(
				`/instances/${instanceId}/disconnect`
			)
			toast.info(
				response.data.message || 'Solicitação de desconexão enviada.'
			)
			setTimeout(() => fetchAllData(false), 1500)
		} catch (error: any) {
			logger.error(
				'Erro ao solicitar desconexão:',
				error.response?.data || error.message
			)
			toast.error(
				error.response?.data?.message ||
					'Falha ao solicitar desconexão.'
			)
		} finally {
			setIsSubmittingAction(false)
			setConnectingInstances((prev) => {
				const next = new Set(prev)
				next.delete(instanceId)
				return next
			})
		}
	}

	const getStatusBadgeVariant = (
		status?: string
	):
		| 'default'
		| 'secondary'
		| 'destructive'
		| 'outline'
		| 'success'
		| 'warning' => {
		switch (status?.toLowerCase()) {
			case 'connected':
				return 'success'
			case 'disconnected':
				return 'destructive'
			case 'disconnected_qr_expired':
				return 'destructive'
			case 'error_logged_out':
				return 'destructive'
			case 'error_restarting':
				return 'destructive'
			case 'error_qr_processing':
				return 'destructive'
			case 'error':
				return 'destructive'
			case 'needs_qr':
				return 'warning'
			case 'connecting':
				return 'default'
			case 'restarting':
				return 'default'
			case 'pending_creation':
				return 'outline'
			default:
				return 'secondary'
		}
	}

	if (isLoadingInitialData && instances.length === 0) {
		// Mostra skeleton apenas no carregamento inicial da lista
		return (
			<div className='p-4 md:p-6 space-y-6'>
				<Skeleton className='h-10 w-1/2 mb-2' />
				<Skeleton className='h-6 w-3/4 mb-6' />
				<Skeleton className='h-48 w-full md:max-w-lg mb-6 rounded-lg' />
				<div className='flex justify-between items-center'>
					<Skeleton className='h-8 w-1/3' />
					<Skeleton className='h-10 w-32' />
				</div>
				<div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className='h-[220px] rounded-lg' />
					))}
				</div>
			</div>
		)
	}
	if (!user || !team) {
		return (
			<div className='p-6 text-center text-muted-foreground'>
				Carregando informações do usuário e time... Se demorar,
				verifique sua conexão ou recarregue a página.
			</div>
		)
	}

	return (
		<TooltipProvider>
			<div className='p-4 md:p-6 space-y-8'>
				{/* Seção do Título da Página e Informações do Plano */}
				<div>
					<h1 className='text-3xl font-bold text-foreground'>
						Instâncias do WhatsApp
					</h1>
					<p className='text-muted-foreground mt-1'>
						Gerencie suas conexões com o WhatsApp. Cada instância
						usa uma Persona de IA. Você pode ter até{' '}
						<span className='font-semibold text-primary'>
							{subscriptionInfo?.maxInstances ?? 1}
						</span>{' '}
						instância(s) ativa(s) em seu plano atual.
					</p>
				</div>

				{/* Card para Criar Nova Instância */}
				<Card>
					<CardHeader>
						<CardTitle className='text-xl'>
							Criar Nova Instância
						</CardTitle>
						<CardDescription>
							Associe uma Persona de IA a um novo número de
							WhatsApp para iniciar o atendimento.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={handleCreateInstance}
							className='max-w-lg space-y-4'
						>
							<div>
								<Label htmlFor='newInstanceName'>
									Nome da Instância (Ex: WhatsApp Clínica,
									Atendimento Vendas)
								</Label>
								<Input
									id='newInstanceName'
									value={newInstanceName}
									onChange={(e) =>
										setNewInstanceName(e.target.value)
									}
									placeholder='Ex: WhatsApp Principal'
									className='mt-1'
									required
								/>
							</div>
							<div>
								<Label htmlFor='selectedPersonaId'>
									Persona Associada
								</Label>
								{personas.length > 0 ? (
									<Select
										onValueChange={setSelectedPersonaId}
										value={selectedPersonaId}
										required
									>
										<SelectTrigger className='w-full mt-1'>
											<SelectValue placeholder='Selecione uma persona' />
										</SelectTrigger>
										<SelectContent>
											{personas.map((persona) => (
												<SelectItem
													key={persona.id}
													value={persona.id}
												>
													{persona.persona_name}{' '}
													{persona.is_default &&
														'(Padrão)'}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
									<p className='text-sm text-muted-foreground mt-1 bg-muted p-3 rounded-md'>
										Nenhuma persona encontrada.{' '}
										<a
											href={
												team
													? `/dashboard/${team.id}/configuration`
													: '#'
											}
											className='underline text-primary hover:text-primary/80'
										>
											Crie uma em "Configurações IA"
										</a>{' '}
										primeiro.
									</p>
								)}
							</div>
							<Button
								type='submit'
								disabled={
									isSubmittingAction ||
									personas.length === 0 ||
									(!!subscriptionInfo &&
										instances.length >=
											subscriptionInfo.maxInstances)
								}
							>
								<PlusCircle className='mr-2 h-4 w-4' />
								{isSubmittingAction
									? 'Criando...'
									: 'Criar Instância'}
							</Button>
							{!!subscriptionInfo &&
								instances.length >=
									subscriptionInfo.maxInstances && (
									<p className='text-xs text-destructive'>
										Limite de instâncias do plano atingido.
									</p>
								)}
						</form>
					</CardContent>
				</Card>

				{/* Seção da Lista de Instâncias */}
				<div className='space-y-4'>
					<div className='flex flex-col sm:flex-row justify-between sm:items-center gap-2'>
						<h2 className='text-xl font-semibold text-foreground'>
							Suas Instâncias ({instances.length})
						</h2>
						<Button
							variant='outline'
							size='sm'
							onClick={() => fetchAllData(true)}
							disabled={
								isLoadingInitialData || isSubmittingAction
							}
						>
							<RefreshCw
								className={`mr-2 h-4 w-4 ${
									isLoadingInitialData || isSubmittingAction
										? 'animate-spin'
										: ''
								}`}
							/>
							Atualizar Lista
						</Button>
					</div>
					{instances.length === 0 && !isLoadingInitialData && (
						<Card className='text-center p-8 border-dashed'>
							<CardContent className='flex flex-col items-center gap-4'>
								<Locate className='mx-auto h-16 w-16 text-muted-foreground ' />
								<p className='text-lg font-medium text-muted-foreground'>
									Nenhuma instância do WhatsApp configurada.
								</p>
								<p className='text-sm text-muted-foreground'>
									Crie sua primeira instância acima para
									conectar um número e começar a usar sua IA.
								</p>
							</CardContent>
						</Card>
					)}
					<div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
						{instances.map((instance) => {
							const isCurrentlyProcessingInstance =
								connectingInstances.has(instance.id) // Ação específica para esta instância
							const isAnyGlobalActionSubmitting =
								isSubmittingAction &&
								!connectingInstances.has(instance.id) // Uma ação global, mas não esta instância
							const isDisabled =
								isCurrentlyProcessingInstance ||
								isAnyGlobalActionSubmitting

							let mainButtonAction: (() => void) | null = null
							let mainButtonText = ''
							let mainButtonIcon = (
								<ScanLine className='mr-2 h-4 w-4' />
							)
							let mainButtonVariant: 'default' | 'outline' =
								'default'

							if (instance.status === 'connected') {
								// Já tratado pelo botão Desconectar
							} else if (instance.status === 'needs_qr') {
								mainButtonAction = () =>
									handleOpenQrDialog(instance)
								mainButtonText = 'Ver QR Code'
								mainButtonIcon =
									isCurrentlyProcessingInstance ? (
										<RefreshCw className='mr-2 h-4 w-4 animate-spin' />
									) : (
										<ScanLine className='mr-2 h-4 w-4' />
									)
							} else if (
								[
									'disconnected',
									'error',
									'pending_creation',
									'disconnected_qr_expired',
									'error_logged_out',
									'error_restarting',
									'error_qr_processing',
									'restarting',
									'connecting',
								].includes(instance.status)
							) {
								mainButtonAction = () =>
									handleConnectInstance(instance.id)
								mainButtonText = isCurrentlyProcessingInstance
									? 'Processando...'
									: 'Conectar / Tentar Novamente'
								mainButtonIcon =
									isCurrentlyProcessingInstance ? (
										<RefreshCw className='mr-2 h-4 w-4 animate-spin' />
									) : (
										<Wifi className='mr-2 h-4 w-4' />
									)
								mainButtonVariant = 'outline'
							}

							return (
								<Card
									key={instance.id}
									className='flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow duration-200'
								>
									<div>
										{' '}
										{/* Wrapper para CardHeader e CardContent */}
										<CardHeader className='pb-3'>
											<div className='flex justify-between items-start gap-2'>
												<CardTitle className='text-lg leading-tight text-card-foreground'>
													{instance.instance_name}
												</CardTitle>
												<Badge
													variant={getStatusBadgeVariant(
														instance.status
													)}
													className='whitespace-nowrap text-xs'
												>
													{instance.status
														?.replace(/_/g, ' ')
														.replace(/\b\w/g, (l) =>
															l.toUpperCase()
														) || 'DESCONHECIDO'}
												</Badge>
											</div>
											<CardDescription className='text-xs pt-1 text-muted-foreground'>
												Persona:{' '}
												{instance.persona
													?.persona_name ||
													'Não atribuída'}
											</CardDescription>
										</CardHeader>
										<CardContent className='space-y-2 text-sm flex-grow'>
											{' '}
											{/* Adicionado flex-grow */}
											{instance.last_status_message &&
												instance.status?.includes(
													'error'
												) && (
													<Tooltip>
														<TooltipTrigger asChild>
															<div className='flex items-start gap-2 text-xs bg-destructive/10 p-2 rounded text-destructive border border-destructive/30 cursor-help'>
																<Info className='h-4 w-4 mt-0.5 flex-shrink-0' />
																<p
																	className='truncate'
																	title={
																		instance.last_status_message
																	}
																>
																	Info:{' '}
																	{
																		instance.last_status_message
																	}
																</p>
															</div>
														</TooltipTrigger>
														<TooltipContent
															side='top'
															className='max-w-xs text-xs bg-popover text-popover-foreground p-2 rounded shadow-md'
														>
															<p>
																{
																	instance.last_status_message
																}
															</p>
														</TooltipContent>
													</Tooltip>
												)}
											{instance.status === 'connected' &&
												instance.last_connection_at && (
													<p className='text-xs text-muted-foreground flex items-center'>
														<Wifi className='h-3 w-3 mr-1 text-green-500' />{' '}
														Conectado em:{' '}
														{new Date(
															instance.last_connection_at
														).toLocaleString(
															'pt-BR',
															{
																dateStyle:
																	'short',
																timeStyle:
																	'short',
															}
														)}
													</p>
												)}
											{instance.status !== 'connected' &&
												instance.last_disconnection_at && (
													<p className='text-xs text-muted-foreground flex items-center'>
														<WifiOff className='h-3 w-3 mr-1 text-red-500' />{' '}
														Última desconexão:{' '}
														{new Date(
															instance.last_disconnection_at
														).toLocaleString(
															'pt-BR',
															{
																dateStyle:
																	'short',
																timeStyle:
																	'short',
															}
														)}
													</p>
												)}
										</CardContent>
									</div>
									<div className='p-4 border-t mt-auto flex flex-col sm:flex-row gap-2'>
										{/* Botão de Ação Principal (Conectar/Ver QR) */}
										{mainButtonAction && (
											<Button
												variant={mainButtonVariant}
												size='sm'
												onClick={mainButtonAction}
												className='flex-1'
												disabled={isDisabled}
											>
												{mainButtonIcon}
												{mainButtonText}
											</Button>
										)}

										{/* Botão Desconectar */}
										{instance.status === 'connected' && (
											<Button
												variant='outline'
												size='sm'
												onClick={() =>
													handleDisconnectInstance(
														instance.id
													)
												}
												className='flex-1 border-red-600 text-red-600 hover:bg-red-100 hover:text-red-600 dark:border-red-700 dark:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400'
												disabled={isDisabled}
											>
												{isCurrentlyProcessingInstance ? (
													<RefreshCw className='mr-2 h-4 w-4 animate-spin' />
												) : (
													<PowerOff className='mr-2 h-4 w-4' />
												)}
												{isCurrentlyProcessingInstance
													? 'Processando...'
													: 'Desconectar'}
											</Button>
										)}

										{/* Botão Deletar */}
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant='ghost'
													size='icon'
													onClick={() =>
														handleDeleteInstance(
															instance.id
														)
													}
													className='text-destructive hover:bg-destructive/10 hover:text-destructive'
													disabled={isDisabled}
													aria-label='Deletar instância'
												>
													<Trash2 className='h-4 w-4' />
												</Button>
											</TooltipTrigger>
											<TooltipContent className='bg-popover text-popover-foreground p-2 rounded shadow-md text-xs'>
												<p>Deletar Instância</p>
											</TooltipContent>
										</Tooltip>
									</div>
								</Card>
							)
						})}
					</div>
				</div>

				{/* Dialog para QR Code */}
				<Dialog
					open={isQrDialogOpen}
					onOpenChange={(open) => {
						setIsQrDialogOpen(open)
						if (!open) {
							setQrDialogInstance(null)
							setCurrentQrCodeValue(null)
							setIsQrLoading(false) // Garante que o loading do QR seja resetado
						}
					}}
				>
					<DialogContent
						className='sm:max-w-xs md:sm:max-w-sm p-0'
						onInteractOutside={(e) => {
							// Não previne default aqui, permite fechar clicando fora
							// A lógica no onOpenChange já limpa os estados.
						}}
					>
						<DialogHeader className='p-6 pb-4'>
							<DialogTitle>
								Conectar:{' '}
								{qrDialogInstance?.instance_name ||
									'Instância WhatsApp'}
							</DialogTitle>
							<DialogDescription>
								Escaneie com o WhatsApp: No seu celular, abra o
								WhatsApp {'>'} Configurações {'>'} Aparelhos
								conectados {'>'} Conectar um aparelho.
							</DialogDescription>
						</DialogHeader>
						<div className='px-6 py-2 flex justify-center items-center min-h-[280px] md:min-h-[320px] bg-muted/30 dark:bg-muted/10 rounded-md mx-6'>
							{isQrLoading && ( // Se isQrLoading for true
								<div className='flex flex-col items-center gap-2 text-muted-foreground'>
									<RefreshCw className='h-8 w-8 animate-spin' />
									<span>Aguardando QR Code...</span>
								</div>
							)}
							{!isQrLoading &&
								currentQrCodeValue && ( // Se não estiver carregando E tiver um QR
									<Image
										src={
											currentQrCodeValue.startsWith(
												'data:image'
											)
												? currentQrCodeValue
												: `data:image/png;base64,${currentQrCodeValue}`
										}
										alt='QR Code do WhatsApp'
										width={280}
										height={280}
										unoptimized
										className='rounded-md border bg-background p-1 shadow-md'
										onError={() => {
											/* ... */
										}}
									/>
								)}
							{/* Se não estiver carregando, NÃO tiver QR, E o status for apropriado */}
							{!isQrLoading &&
								!currentQrCodeValue &&
								qrDialogInstance &&
								(qrDialogInstance.status === 'needs_qr' ||
									qrDialogInstance.status === 'connecting' ||
									qrDialogInstance.status ===
										'pending_creation') && (
									<div className='text-center space-y-3'>
										<p className='text-muted-foreground'>
											Aguardando geração do QR Code pelo
											servidor...
										</p>
										<p className='text-xs text-muted-foreground'>
											(Isso pode levar alguns segundos
											após a criação da instância)
										</p>
										<Button
											variant='outline'
											size='sm'
											onClick={() => fetchAllData(true)}
										>
											<RefreshCw className='mr-2 h-4 w-4' />{' '}
											Forçar Atualização da Lista
										</Button>
									</div>
								)}
							{/* Se não estiver carregando E o status NÃO for de espera por QR */}
							{!isQrLoading &&
								qrDialogInstance &&
								qrDialogInstance.status !== 'needs_qr' &&
								qrDialogInstance.status !== 'connecting' &&
								qrDialogInstance.status !==
									'pending_creation' && (
									<p className='text-muted-foreground text-center p-4'>
										Instância{' '}
										<span className='font-semibold'>
											{qrDialogInstance.instance_name}
										</span>
										não está aguardando QR Code (Status:{' '}
										{qrDialogInstance.status
											?.replace('_', ' ')
											.toUpperCase()}
										).
									</p>
								)}
						</div>
						<DialogFooter className='p-6 pt-4 sm:justify-between items-center border-t'>
							<p className='text-xs text-muted-foreground text-center sm:text-left'>
								Este QR code expira rapidamente.
							</p>
							<DialogClose asChild>
								<Button type='button' variant='secondary'>
									Fechar
								</Button>
							</DialogClose>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</TooltipProvider>
	)
}
