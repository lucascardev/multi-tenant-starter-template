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
import { useUser } from '@stackframe/stack'
import {
	PlusCircle,
	Edit3,
	Trash2,
	RefreshCw,
	BrainCircuit,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import React, { useState, useEffect, useCallback, FormEvent } from 'react'
import { toast } from 'sonner'

// Adicionado cn

const logger = console

interface Persona {
	id: string
	persona_name: string
	model: string
	instruction: any
	is_default: boolean
	is_online: boolean
	client_id?: string
}

interface PersonaFormData {
	personaName: string
	model: string
	instructionJson: string
	isDefault: boolean
}
interface SubscriptionInfo {
	maxPersonas: number
}

export default function AiConfigurationPage() {
	const user = useUser()
	const params = useParams<{ teamId: string }>()
	const team = user?.useTeam(params.teamId)

	const [personas, setPersonas] = useState<Persona[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showFormDialog, setShowFormDialog] = useState(false)
	const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
	const [formData, setFormData] = useState<PersonaFormData>({
		personaName: '',
		model: 'gemini-1.5-flash-latest',
		instructionJson: JSON.stringify(
			{ system_instruction: 'Você é uma IA prestativa.' },
			null,
			2
		),
		isDefault: false,
	})
	const [subscriptionInfo, setSubscriptionInfo] =
		useState<SubscriptionInfo | null>(null)

	const fetchPersonas = useCallback(async () => {
		if (!user || !team) return
		setIsLoading(true)
		try {
			const [personasRes, subInfoRes] = await Promise.all([
				apiClient.get('/personas'),
				apiClient.get('/subscriptions/current'),
			])

			setPersonas(personasRes.data.personas || [])
			setSubscriptionInfo({
				maxPersonas: subInfoRes.data.max_personas_count || 1,
			})
			logger.info('Personas carregadas:', personasRes.data.personas)
		} catch (error) {
			logger.error('Erro ao buscar personas:', error)
			toast.error('Não foi possível carregar as personas.')
		} finally {
			setIsLoading(false)
		}
	}, [user, team])

	useEffect(() => {
		fetchPersonas()
	}, [fetchPersonas])

	// CORRIGIDO: handleFormChange para Inputs e Textareas (que usam 'value')
	const handleFormChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target
		setFormData((prev) => ({ ...prev, [name]: value }))
	}

	// handleSwitchChange para o componente Switch (que passa 'checked' diretamente)
	const handleSwitchChange = (checked: boolean, name: string) => {
		setFormData((prev) => ({ ...prev, [name]: checked }))
	}

	const resetForm = () => {
		setEditingPersona(null)
		setFormData({
			personaName: '',
			model: 'gemini-1.5-flash-latest',
			instructionJson: JSON.stringify(
				{ system_instruction: 'Você é uma IA prestativa.' },
				null,
				2
			),
			isDefault: false,
		})
	}

	const handleEdit = (persona: Persona) => {
		setEditingPersona(persona)
		setFormData({
			personaName: persona.persona_name,
			model: persona.model,
			instructionJson:
				typeof persona.instruction === 'string'
					? persona.instruction
					: JSON.stringify(
							persona.instruction || { system_instruction: '' },
							null,
							2
					  ),
			isDefault: persona.is_default,
		})
		setShowFormDialog(true)
	}

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		if (
			!formData.personaName ||
			!formData.model ||
			!formData.instructionJson
		) {
			toast.error('Nome, modelo e instrução são obrigatórios.')
			return
		}
		let parsedInstruction
		try {
			parsedInstruction = JSON.parse(formData.instructionJson)
		} catch (jsonError) {
			toast.error('Instrução JSON inválida.')
			return
		}

		if (
			!editingPersona &&
			subscriptionInfo &&
			personas.length >= subscriptionInfo.maxPersonas
		) {
			toast.error(
				`Você atingiu o limite de ${subscriptionInfo.maxPersonas} persona(s) para o seu plano.`
			)
			return
		}

		setIsSubmitting(true)
		const payload = {
			personaName: formData.personaName,
			model: formData.model,
			instruction: parsedInstruction,
			isDefault: formData.isDefault,
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
			fetchPersonas()
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
			fetchPersonas()
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
				<Dialog
					open={showFormDialog}
					onOpenChange={(isOpen) => {
						setShowFormDialog(isOpen)
						if (!isOpen) resetForm()
					}}
				>
					<DialogTrigger asChild>
						<Button
							onClick={() => {
								resetForm()
								setShowFormDialog(true)
							}}
							disabled={
								!!(
									subscriptionInfo &&
									personas.length >=
										subscriptionInfo.maxPersonas
								)
							} // CORRIGIDO
						>
							<PlusCircle className='mr-2 h-4 w-4' /> Criar Nova
							Persona
						</Button>
					</DialogTrigger>
					<DialogContent className='sm:max-w-[525px]'>
						<DialogHeader>
							<DialogTitle>
								{editingPersona
									? 'Editar Persona'
									: 'Criar Nova Persona'}
							</DialogTitle>
							<DialogDescription>
								Defina o nome, modelo de IA e as instruções para
								esta personalidade.
							</DialogDescription>
						</DialogHeader>
						<form
							onSubmit={handleSubmit}
							className='space-y-4 py-4'
						>
							<div>
								<Label htmlFor='personaName'>
									Nome da Persona
								</Label>
								<Input
									id='personaName'
									name='personaName'
									value={formData.personaName}
									onChange={handleFormChange}
									placeholder='Ex: Atendente Principal'
									required
									className='mt-1'
								/>
							</div>
							<div>
								<Label htmlFor='model'>Modelo de IA</Label>
								<Select
									name='model'
									value={formData.model}
									onValueChange={(value) =>
										setFormData((p) => ({
											...p,
											model: value,
										}))
									}
								>
									<SelectTrigger className='w-full mt-1'>
										<SelectValue placeholder='Selecione um modelo' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='gemini-2.0-flash'>
											Gemini 2.0 Flash (Recomendado)
										</SelectItem>
										<SelectItem value='gemini-2.0-flash-lite'>
											Gemini 2.0 Flash-lite (Casos simples)
										</SelectItem>
										{/* Adicione outros modelos se disponíveis */}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor='instructionJson'>
									Instrução do Sistema (JSON)
								</Label>
								<Textarea
									id='instructionJson'
									name='instructionJson'
									value={formData.instructionJson}
									onChange={handleFormChange}
									rows={8}
									placeholder='{ "system_instruction": "Você é a Clara..." }'
									required
									className='mt-1 font-mono text-sm'
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Deve ser um objeto JSON válido.
								</p>
							</div>
							<div className='flex items-center space-x-2'>
								<Switch
									id='isDefault'
									name='isDefault'
									checked={formData.isDefault}
									onCheckedChange={(checked) =>
										handleSwitchChange(checked, 'isDefault')
									}
								/>
								<Label htmlFor='isDefault'>
									Definir como Persona Padrão
								</Label>
							</div>
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
			</div>
			{subscriptionInfo &&
				personas.length >= subscriptionInfo.maxPersonas &&
				!editingPersona && (
					<p className='text-sm text-red-500 dark:text-red-400'>
						Você atingiu o limite de personas para o seu plano.
					</p>
				)}

			<div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
				{personas.map((persona) => (
					<Card key={persona.id} className='flex flex-col'>
						<CardHeader>
							<div className='flex justify-between items-start'>
								<CardTitle className='text-xl'>
									{persona.persona_name}
								</CardTitle>
								<BrainCircuit className='h-6 w-6 text-primary' />
							</div>
							<p className='text-xs text-muted-foreground'>
								Modelo: {persona.model}
							</p>
							{persona.is_default && (
								<Badge variant='outline' className='w-fit'>
									Padrão
								</Badge>
							)}
						</CardHeader>
						<CardContent className='flex-grow'>
							<p className='text-sm text-muted-foreground line-clamp-3'>
								Instrução:{' '}
								{typeof persona.instruction === 'string'
									? persona.instruction
									: JSON.stringify(persona.instruction)}
							</p>
						</CardContent>
						<div className='p-4 border-t border-border flex gap-2'>
							<Button
								variant='outline'
								size='sm'
								onClick={() => handleEdit(persona)}
								className='flex-1'
							>
								<Edit3 className='mr-2 h-4 w-4' /> Editar
							</Button>
							<Button
								variant='destructive'
								size='sm'
								onClick={() => handleDelete(persona.id)}
								className='flex-1'
								disabled={
									persona.is_default && personas.length <= 1
								}
							>
								{' '}
								{/*Não deletar se for a única e default*/}
								<Trash2 className='mr-2 h-4 w-4' /> Deletar
							</Button>
						</div>
					</Card>
				))}
				{personas.length === 0 && !isLoading && (
					<p className='text-muted-foreground col-span-full text-center py-8'>
						Nenhuma persona configurada ainda. Crie uma para
						começar!
					</p>
				)}
			</div>
		</div>
	)
}
