'use client'

import { isValidPhone, formatPhone } from '@/lib/validation';
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
    X,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Download,
    Upload,
    Calendar,
    Brain,
    Building2,
    User,
    Star,
    History,
    MessageSquare
} from 'lucide-react'
import { useParams } from 'next/navigation'
import React, {
	useState,
	useEffect,
	useCallback,
	FormEvent,
	ChangeEvent,
    useRef,
} from 'react'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import AES from 'crypto-js/aes'
import encUtf8 from 'crypto-js/enc-utf8'

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
    google_calendar_id?: string | null // NEW: Agenda específica
}

interface GoogleCalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
  backgroundColor?: string;
}

interface PersonaKnowledge {
    id: string;
    persona_id: string;
    knowledge_key: string;
    knowledge_value: string;
    category: 'preference' | 'business_rule' | 'client_fact' | 'learned_behavior' | 'manual_entry';
    source: string;
    created_at: string;
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

interface MemoryStats {
    retention_days: number;
    facts_stored: number;
    active_context_messages: number;
    active_context_chats: number;
    period_start: string;
}

export default function AiConfigurationPage() {
	const user = useUser()
	const params = useParams<{ teamId: string }>()
	const team = user?.useTeam(params.teamId)

	const [personas, setPersonas] = useState<PersonaFromAPI[]>([])
    const [userCalendars, setUserCalendars] = useState<GoogleCalendarListItem[]>([]); // NEW
	const [isLoading, setIsLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showFormDialog, setShowFormDialog] = useState(false)
	const [activeTab, setActiveTab] = useState('basic')
    const [knowledgeList, setKnowledgeList] = useState<PersonaKnowledge[]>([])
    const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false)
    const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
    const [isUpdatingMemory, setIsUpdatingMemory] = useState(false);
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
        googleCalendarId: '' as string, // NEW
	})

    // Whitelist State
    const [phoneNumberWhitelist, setPhoneNumberWhitelist] = useState<string[]>([]);
    const [newWhiteListPhone, setNewWhiteListPhone] = useState('');
    const [isSavingWhitelist, setIsSavingWhitelist] = useState(false);
    
    // Delete Confirmation State
    const [personaToDelete, setPersonaToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [newOwnerPhone, setNewOwnerPhone] = useState('') // Input temporário

	const [instructionFormData, setInstructionFormData] =
		useState<EditablePersonaInstruction>(initialInstructionFormData)

	const [subscriptionInfo, setSubscriptionInfo] =
		useState<SubscriptionInfo | null>(null)
	const [selectedTemplate, setSelectedTemplate] = useState<string>('generico')
    // Generic Templates
    const [apiTemplates, setApiTemplates] = useState<Record<string, PersonaInstruction>>({})
    
    // Auto-Save Logic
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const debouncedFormData = useDebounce(instructionFormData, 2000); // 2 segundos de inatividade
    const debouncedPersonaDetails = useDebounce(personaDetails, 2000);

    const lastSavedData = useRef<string>(""); // Para evitar salvar se não mudou
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- EXPORT/IMPORT LOGIC ---
    const handleExportPersona = async (persona: PersonaFromAPI) => {
        try {
            // 1. Get Encryption Key from API
            const keyRes = await apiClient.get('/client/backup-key');
            const secretKey = keyRes.data.key;

            if (!secretKey) throw new Error("Chave de criptografia não disponível.");
        
            // 2. Fetch Google Calendar Config (Best Effort)
            let googleConfig = null;
            try {
                const googleRes = await apiClient.get('/integrations/google/config');
                googleConfig = googleRes.data;
            } catch (e) {
                console.warn("Could not fetch google config for backup", e);
            }

            const exportData = {
                version: "1.1", // Bump version
                exportedAt: new Date().toISOString(),
                persona: {
                    personaDisplayName: persona.persona_name,
                    instruction: persona.instruction,
                    ownerPhones: persona.owner_phones || [],
                    ownerToolInstruction: persona.owner_tool_instruction,
                    ownerAlertInstruction: persona.owner_alert_instruction
                },
                googleConfig: googleConfig // Include in backup
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const encrypted = AES.encrypt(jsonString, secretKey).toString();

            const blob = new Blob([encrypted], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Use .enc extension to denote encrypted content, or .json with encrypted content?
            // User said "encrypted file". A custom extension is safer.
            a.download = `persona_${persona.persona_name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.clara-backup`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Persona exportada (encriptada) com sucesso!");
        } catch (error) {
            console.error("Erro ao exportar persona:", error);
            toast.error("Erro ao gerar arquivo de exportação.");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const encryptedContent = e.target?.result as string;
                
                // 1. Get Encryption Key
                const keyRes = await apiClient.get('/client/backup-key');
                const secretKey = keyRes.data.key;

                if (!secretKey) throw new Error("Chave de criptografia não disponível.");

                // 2. Decrypt
                const bytes = AES.decrypt(encryptedContent, secretKey);
                const decryptedString = bytes.toString(encUtf8);

                if (!decryptedString) throw new Error("Falha na decriptação. Arquivo inválido ou chave incorreta.");

                const importData = JSON.parse(decryptedString);
                
                if (!importData.persona || !importData.persona.instruction) {
                    throw new Error("Formato de arquivo inválido.");
                }

                // Preenche o form com os dados importados
                setPersonaDetails(prev => ({
                    ...prev,
                    personaDisplayName: importData.persona.personaDisplayName || prev.personaDisplayName,
                    ownerPhones: importData.persona.ownerPhones || [],
                    ownerToolInstruction: importData.persona.ownerToolInstruction || '',
                    ownerAlertInstruction: importData.persona.ownerAlertInstruction || ''
                }));

                setInstructionFormData(importData.persona.instruction);
                // Restore Google Config if present
                if (importData.googleConfig) {
                    try {
                        // Only sync non-null/undefined fields
                        const { errorMessage, email, ...configToRestore } = importData.googleConfig;
                        await apiClient.post('/integrations/google/config', configToRestore);
                        toast.success("Configurações de Calendário restauradas.");
                    } catch (e) {
                        console.error("Erro ao restaurar Google Config", e);
                        toast.error("Falha ao restaurar configurações de calendário.");
                    }
                }
                
                // Abre o modal se não estiver aberto
                if (!showFormDialog) {
                    // Se for importação "limpa", reseta o ID para criar nova
                    setEditingPersona(null); 
                    setShowFormDialog(true);
                }

                toast.success("Backup importado e decriptado com sucesso! (Persona + Calendário)");
            } catch (error) {
                console.error("Erro ao importar:", error);
                toast.error("Erro ao ler backup. Arquivo corrompido ou inválido.");
            }
        };
        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    };


	const fetchPersonasAndSubscription = useCallback(async () => {
		// ... (lógica para buscar personas e info de assinatura, como antes)
		if (!user || !team) return
		setIsLoading(true)
		try {
			const [personasRes, subInfoRes, templatesRes, clientConfigRes, calendarsRes] = await Promise.all([
				apiClient.get('/personas'),
				apiClient.get('/subscriptions/current'),
                apiClient.get('/personas/templates'),
                apiClient.get('/client/config'), // Fetch client config for whitelist
                apiClient.get('/integrations/google/calendars').catch(() => ({ data: [] })), // NEW: Best effort fetch
			])
			setPersonas(personasRes.data.personas || [])
            setUserCalendars(calendarsRes.data || []); // NEW

            // Process Whitelist
            if (clientConfigRes.data && Array.isArray(clientConfigRes.data.phoneNumberWhitelist)) {
                setPhoneNumberWhitelist(clientConfigRes.data.phoneNumberWhitelist.map(String));
            } else {
                setPhoneNumberWhitelist([]);
            }
            
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
        if (newOwnerPhone && !personaDetails.ownerPhones.includes(newOwnerPhone)) {
             if (!isValidPhone(newOwnerPhone)) {
                toast.error("Número de telefone inválido. Use o formato com DDD: 11999999999");
                return;
            }
            setPersonaDetails({
                ...personaDetails,
                ownerPhones: [...personaDetails.ownerPhones, newOwnerPhone]
            });
            setNewOwnerPhone('');
        }
    };

    const handleRemoveOwnerPhone = (phoneToRemove: string) => {
        setPersonaDetails(prev => ({
            ...prev,
            ownerPhones: prev.ownerPhones.filter(p => p !== phoneToRemove)
        }));
    };

    // Whitelist Handlers
    const handleAddWhitelistPhone = async () => {
         if (newWhiteListPhone && !phoneNumberWhitelist.includes(newWhiteListPhone)) {
             if (!isValidPhone(newWhiteListPhone)) {
                toast.error("Número inválido. Use formato DDI+DDD+Numero (Ex: 5511999999999)");
                return;
            }
            const updatedList = [...phoneNumberWhitelist, newWhiteListPhone];
            setPhoneNumberWhitelist(updatedList);
            setNewWhiteListPhone('');
            await saveWhitelist(updatedList);
        }
    };

    const handleRemoveWhitelistPhone = async (phone: string) => {
        const updatedList = phoneNumberWhitelist.filter(p => p !== phone);
        setPhoneNumberWhitelist(updatedList);
        await saveWhitelist(updatedList);
    };

    const saveWhitelist = async (newList: string[]) => {
        setIsSavingWhitelist(true);
        try {
            await apiClient.post('/client/config', {
                phoneNumberWhitelist: newList
            });
            toast.success("Whitelist atualizada!");
        } catch (error) {
            console.error("Erro ao salvar whitelist:", error);
            toast.error("Erro ao salvar whitelist.");
            // Reverter em caso de erro? O ideal seria, mas por simplificação deixamos assim por enquanto.
        } finally {
            setIsSavingWhitelist(false);
        }
    }


	const resetForm = () => {
		setEditingPersona(null)
		setPersonaDetails({
			personaDisplayName: '',
			// model: 'gemini-2.0-flash',
			isDefault: false, // Reset explicit
            ownerPhones: [],
            ownerToolInstruction: '',
            ownerAlertInstruction: '',
            googleCalendarId: '',
		})
        setNewOwnerPhone('');
		setInstructionFormData(initialInstructionFormData)
		setInstructionFormData(initialInstructionFormData)
		setSelectedTemplate('generico')
        setActiveTab('basic');
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
            googleCalendarId: persona.google_calendar_id || '',
		})
        
        setSaveStatus('idle'); // Reset status on edit start
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
        
        // Initialize lastSavedData to avoid immediate save trigger
        const initialDataToHash = JSON.stringify({
            details: {
                personaDisplayName: persona.persona_name,
                isDefault: persona.is_default,
                ownerPhones: phones,
                ownerToolInstruction: persona.owner_tool_instruction || '',
                ownerAlertInstruction: persona.owner_alert_instruction || '',
                googleCalendarId: persona.google_calendar_id || '',
            },
            instruction: {
                ...initialInstructionFormData,
                ...(instructionObject as EditablePersonaInstruction),
                customAiName: subscriptionInfo?.canChangeAiName ? instructionObject.aiName || '' : '',
            }
        });
        lastSavedData.current = initialDataToHash;

		setSelectedTemplate(
			instructionObject.businessTypeForTemplate || 'generico'
		)
        setActiveTab('basic');
		setShowFormDialog(true)
	}

    const fetchMemoryStats = useCallback(async (personaId: string) => {
        try {
            const res = await apiClient.get<MemoryStats>(`/personas/${personaId}/memory-stats`);
            setMemoryStats(res.data);
        } catch (error) {
            console.error("Failed to fetch memory stats:", error);
        }
    }, []);

    const updateMemoryRetention = async (days: number) => {
        if (!editingPersona) return;
        setIsUpdatingMemory(true);
        try {
             await apiClient.put(`/personas/${editingPersona.id}/memory-settings`, { retention_days: days });
             setMemoryStats(prev => prev ? { ...prev, retention_days: days } : null);
             toast.success("Configuração de memória atualizada.");
        } catch (error) {
             toast.error("Erro ao atualizar configuração.");
        } finally {
            setIsUpdatingMemory(false);
        }
    }

    const fetchKnowledge = useCallback(async (personaId: string) => {
        setIsLoadingKnowledge(true);
        try {
            const res = await apiClient.get<PersonaKnowledge[]>(`/personas/${personaId}/knowledge`);
            setKnowledgeList(res.data);
            fetchMemoryStats(personaId);
        } catch (error) {
            console.error("Failed to fetch knowledge:", error);
            toast.error("Erro ao carregar memória da persona.");
        } finally {
            setIsLoadingKnowledge(false);
        }
    }, [fetchMemoryStats]);

    const handleDeleteKnowledge = async (id: string) => {
        try {
             await apiClient.delete(`/knowledge/${id}`);
             setKnowledgeList(prev => prev.filter(k => k.id !== id));
             toast.success("Regra apagada da memória.");
        } catch (error) {
             toast.error("Erro ao apagar regra.");
        }
    }


    const performSave = useCallback(async (isAutoSave: boolean = false) => {
        // Validation checks (Skip strict toast validation for auto-save to not annoy, but only if name is present)
        if (!personaDetails.personaDisplayName) { 
            if (!isAutoSave) toast.error('Nome da persona é obrigatório.');
            return;
        }

        // if (!editingPersona) return; // Only auto-save existing personas for safety? Or allow new? Allow new logic is tricky without ID.
        // DECISION: Only auto-save if we are EDITING an existing persona. 
        // Auto-creating on typing might spam the backend with half-empty personas.
        if (!editingPersona && isAutoSave) return; 

		if (isAutoSave) setSaveStatus('saving');
        else setIsSubmitting(true);

		const finalInstruction: PersonaInstruction = {
			...instructionFormData,
			aiName:
				subscriptionInfo?.canChangeAiName &&
				instructionFormData.customAiName?.trim()
					? instructionFormData.customAiName.trim()
					: 'Clara',
		}
		
		const { customAiName, ...instructionPayloadForDB } =
			finalInstruction as EditablePersonaInstruction & {
				customAiName?: string
			}

		const payload = {
			persona_name: personaDetails.personaDisplayName,
			model: 'auto',
			instruction: instructionPayloadForDB, 
			is_default: personaDetails.isDefault,
            owner_phones: personaDetails.ownerPhones,
            owner_tool_instruction: personaDetails.ownerToolInstruction,
            owner_alert_instruction: personaDetails.ownerAlertInstruction,
            google_calendar_id: personaDetails.googleCalendarId || null, // NEW
		}

		try {
			if (editingPersona) {
				await apiClient.put(`/personas/${editingPersona.id}`, payload)
				if (!isAutoSave) toast.success('Persona atualizada com sucesso!')
                else {
                    setSaveStatus('saved');
                    // Optimistic update for auto-save to reflect changes in the list without refetching
                    setPersonas(prev => prev.map(p => 
                        p.id === editingPersona.id ? { ...p, ...payload, id: p.id, instruction: payload.instruction as PersonaInstruction } : p
                    ));
                }
			} else {
				const res = await apiClient.post('/personas', payload)
				if (!isAutoSave) toast.success('Persona criada com sucesso!')
                // If we allow auto-save on new, we would need to setEditingPersona here to switch mode
                // For now, manual save only for NEW.
			}
            
            // Update reference
            lastSavedData.current = JSON.stringify({
                details: personaDetails,
                instruction: instructionFormData
            });

			if (!isAutoSave) {
                setShowFormDialog(false)
                resetForm()
                fetchPersonasAndSubscription()
            } else {
                 // Refresh list silently if needed, but maybe not needed for auto-save content updates
                 // fetchPersonasAndSubscription() // Skip to avoid jitter
            }

		} catch (error: any) {
			logger.error('Erro ao salvar persona:', error)
			if (!isAutoSave) toast.error(error.response?.data?.message || 'Falha ao salvar persona.')
            else setSaveStatus('error');
		} finally {
			if (!isAutoSave) setIsSubmitting(false)
		}
    }, [editingPersona, instructionFormData, personaDetails, subscriptionInfo, personas.length]); // Dependencies

    // Effect for Auto-Save
    useEffect(() => {
        // Check if we have an active editing session and data has completely changed from last save
        if (!editingPersona || !showFormDialog) return;

        const currentDataHash = JSON.stringify({
             details: debouncedPersonaDetails,
             instruction: debouncedFormData
        });

        if (currentDataHash !== lastSavedData.current) {
             performSave(true);
        }

    }, [debouncedFormData, debouncedPersonaDetails, performSave, editingPersona, showFormDialog]);


	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
        await performSave(false);
	}

	const handleDeleteClick = (personaId: string) => {
        setPersonaToDelete(personaId);
    }
    
    const confirmDelete = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent auto-close if using AlertDialogAction
        if (!personaToDelete) return;

        setIsDeleting(true);
		try {
			await apiClient.delete(`/personas/${personaToDelete}`)
			toast.success('Persona deletada com sucesso.')
			fetchPersonasAndSubscription()
            setPersonaToDelete(null); // Close dialog manually on success
		} catch (error: any) {
			console.error('CRITICAL ERROR DELETING PERSONA:', error); // Explicit log for user
            logger.error('Erro ao deletar persona:', error)
			toast.error(
				error.response?.data?.message || 'Falha ao deletar persona.'
			)
            // Do NOT close dialog on error, so user can retry or see error
		} finally {
            setIsDeleting(false);
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
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".clara-backup,.json" 
                        onChange={handleFileChange} 
                    />
                     <Button variant="outline" onClick={handleImportClick}>
                        <Upload className="mr-2 h-4 w-4" /> Importar Config
                    </Button>
				    <Button onClick={() => { resetForm(); setShowFormDialog(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nova Persona
                    </Button>
                </div>
			</div>



            {/* WHITELIST SECTION - Separado das Personas pois é global do cliente */}
            <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                         <Shield className="h-5 w-5 text-blue-500" /> Whitelist (Ignorar Números)
                    </CardTitle>
                    <CardDescription>
                         Configure os números de telefone que a Inteligência Artificial deve IGNORAR. 
                         A Clara não responderá a mensagens vindas destes números.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                      <div className="flex gap-2 max-w-md mb-4">
                        <Input 
                            placeholder="Ex: (11) 99999-9999" 
                            value={newWhiteListPhone}
                            onChange={(e) => setNewWhiteListPhone(formatPhone(e.target.value))}
                        />
                        <Button onClick={handleAddWhitelistPhone} disabled={isSavingWhitelist}>
                            {isSavingWhitelist ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                        </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {phoneNumberWhitelist.length === 0 && (
                            <span className="text-sm text-muted-foreground italic">Nenhum número na whitelist.</span>
                        )}
                        {phoneNumberWhitelist.map(phone => (
                            <Badge key={phone} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                {phone}
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-4 w-4 rounded-full hover:bg-destructive/20 hover:text-destructive p-0"
                                    onClick={() => handleRemoveWhitelistPhone(phone)}
                                    disabled={isSavingWhitelist}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

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
                                <Button variant="ghost" size="sm" onClick={() => handleExportPersona(persona)} title="Exportar Backup">
                                    <Download className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                 <Button variant="outline" size="sm" onClick={() => handleEdit(persona)}>
                                     <Edit3 className="h-4 w-4 mr-1" /> Editar
                                 </Button>
                                 <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(persona.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                     <Trash2 className="h-4 w-4" />
                                 </Button>
                             </div>
                         </CardContent>
                    </Card>
                ))}
            </div>

            <AlertDialog open={!!personaToDelete} onOpenChange={(open) => !open && setPersonaToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Essa ação não pode ser desfeita. Isso excluirá permanentemente a persona e poderá afetar instâncias que dependem dela.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? "Deletando..." : "Sim, deletar persona"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

			<Dialog
				open={showFormDialog}
				onOpenChange={(isOpen) => {
					setShowFormDialog(isOpen)
					if (!isOpen) resetForm()
				}}
			>
				<DialogContent className='max-w-[95vw] w-full sm:max-w-[90vw]'>
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
                        {/* Auto-Save Indicator */}
                        {editingPersona && (
                            <div className="flex items-center gap-2 text-xs font-medium ml-auto sm:ml-4">
                                {saveStatus === 'saving' && (
                                    <span className="text-muted-foreground flex items-center animate-pulse">
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Salvando...
                                    </span>
                                )}
                                {saveStatus === 'saved' && (
                                    <span className="text-green-600 flex items-center">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Salvo
                                    </span>
                                )}
                                {saveStatus === 'error' && (
                                    <span className="text-red-500 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" /> Erro ao salvar
                                    </span>
                                )}
                            </div>
                        )}
					</DialogHeader>
					<form
						onSubmit={handleSubmit}
						className='space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-2'
					>
                    {/* TABS NAVIGATION */}
                    <div className="flex gap-2 border-b mb-4">
                        <button 
                            type="button"
                            onClick={() => setActiveTab('basic')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                activeTab === 'basic' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Principal
                        </button>
                       {editingPersona && (
                            <button 
                                type="button"
                                onClick={() => {
                                    setActiveTab('knowledge');
                                    fetchKnowledge(editingPersona.id);
                                }}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'knowledge' ? "border-violet-500 text-violet-600" : "border-transparent text-muted-foreground hover:text-foreground hover:text-violet-500"
                                )}
                            >
                                <BrainCircuit className="w-4 h-4" />
                                Memória
                            </button>
                       )}
                    </div>

                    {/* BASIC TAB CONTENT WRAPPER */}
					<div className={cn("grid gap-4 py-4", activeTab !== 'basic' && "hidden")}>

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
                                        onChange={(e) => setNewOwnerPhone(formatPhone(e.target.value))}
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

                        {/* GOOGLE CALENDAR OVERRIDE SECTION */}
                        <Card>
                            <CardHeader>
                                <CardTitle className='text-lg flex items-center gap-2'>
                                    <Calendar className="h-5 w-5 text-indigo-500" /> Agenda Específica
                                </CardTitle>
                                <DialogDescription>
                                    Defina qual agenda do Google esta persona deve usar. Se deixado em branco, usará o padrão da conta.
                                </DialogDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Label>Selecione a Agenda</Label>
                                <Select
                                    value={personaDetails.googleCalendarId || "default"}
                                    onValueChange={(val) => setPersonaDetails({...personaDetails, googleCalendarId: val === "default" ? "" : val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Usar Padrão da Conta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">
                                            <span className="text-muted-foreground italic">Usar Padrão da Conta (Lógica Global)</span>
                                        </SelectItem>
                                        {userCalendars.map(cal => (
                                            <SelectItem key={cal.id} value={cal.id}>
                                                {cal.summary} {cal.primary && "(Principal)"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>

						{/* PROTOCOLOS DE SEGURANÇA MOVIDOS PARA DENTRO DE INSTRUÇÕES DETALHADAS */}

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
                                                    {/* Tenta usar o nome formatado da API se disponível (but here we only have the instruction)
                                                        Let's format the key itself */}
                                                    {key === 'DENTIST' ? 'Clínica Odontológica' :
                                                     key === 'GYM' ? 'Academia' :
                                                     key === 'RESTAURANT' ? 'Restaurante' :
                                                     key === 'RETAIL' ? 'Varejo' :
                                                     key.charAt(0).toUpperCase() + key.slice(1).toLowerCase().replace(/_/g, ' ')}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            /* Fallback to hardcoded if API fails */
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
								{/* SEÇÃO UNIFICADA DE HANDOFF */}
                                <div className="border p-4 rounded-md space-y-4 bg-muted/20 mt-4">
                                    <h3 className="font-semibold flex items-center gap-2 text-primary">
                                       <Shield className="h-4 w-4" /> Protocolo de Atendimento Humano
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* OPÇÃO 1: Escalada e Aprovação (Ferramentas Ativas) */}
                                        <div className="space-y-2">
                                            <Label htmlFor='ownerToolInstruction' className="text-red-600 font-medium flex items-center gap-1">
                                                1. Aprovações e Escalada (Ferramentas) <Badge variant="outline" className="text-[0.6rem] border-red-200 text-red-500">Prioridade</Badge>
                                            </Label>
                                            <p className="text-[0.8rem] text-muted-foreground h-10">
                                                Defina quando a Clara deve <b>pausar para pedir sua aprovação</b> (ex: descontos) ou <b>chamar intervenção urgente</b> (ex: conflitos).
                                            </p>
                                            <Textarea
                                                id='ownerToolInstruction'
                                                value={personaDetails.ownerToolInstruction}
                                                onChange={(e) => setPersonaDetails(p => ({ ...p, ownerToolInstruction: e.target.value }))}
                                                rows={3}
                                                placeholder="Ex: Se pedir desconto > 20%, solicite aprovação. Se o cliente estiver muito irritado e pedir gerente, chame ajuda humana urgente."
                                                className="resize-none"
                                            />
                                        </div>

                                        {/* OPÇÃO 2: Contato Passivo */}
                                        <div className="space-y-2">
                                            <Label htmlFor='humanHandoffContact' className="text-blue-600 font-medium">
                                                2. Contato Passivo (Informativo)
                                            </Label>
                                            <p className="text-[0.8rem] text-muted-foreground h-10">
                                                O que responder se o usuário pedir contato, mas o caso <b>não for crítico</b> e nem precisar de aprovação imediata.
                                            </p>
                                            <Textarea
                                                id='humanHandoffContact'
                                                name='humanHandoffContact'
                                                value={instructionFormData.humanHandoffContact}
                                                onChange={(e) => handleInstructionInputChange(e)}
                                                rows={3}
                                                placeholder='Ex: Para outros assuntos, ligue para (XX) XXXXX-XXXX em horário comercial ou envie e-mail.'
                                                className="resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* ALERTA SILENCIOSO */}
                                    <div className="pt-2 border-t border-dashed border-gray-300">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Label htmlFor='ownerAlertInstruction' className="font-medium">
                                                Monitoramento Silencioso (Opcional)
                                            </Label>
                                            <span className="text-[0.7rem] bg-gray-200 px-2 py-0.5 rounded text-gray-600">Invisível ao cliente</span>
                                        </div>
                                        <Textarea
                                            id='ownerAlertInstruction'
                                            value={personaDetails.ownerAlertInstruction}
                                            onChange={(e) => setPersonaDetails(p => ({ ...p, ownerAlertInstruction: e.target.value }))}
                                            rows={2}
                                            placeholder="Ex: Me notifique se o assunto for 'Cancelamento' ou 'Reembolso', mas continue o atendimento."
                                        />
                                    </div>
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

                    </div> {/* END BASIC TAB CONTENT */}

                    {/* KNOWLEDGE TAB CONTENT */}
                    {activeTab === 'knowledge' && (
                        <div className="space-y-4 py-2 h-[60vh] overflow-y-auto px-1">
                            
                            {/* STATS DASHBOARD */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Retention Card */}
                                <Card className="bg-muted/30">
                                    <CardContent className="p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                <History className="h-4 w-4" /> Janela de Memória
                                            </span>
                                            {isUpdatingMemory && <Loader2 className="h-3 w-3 animate-spin" />}
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <Select 
                                                value={memoryStats?.retention_days.toString() || "30"} 
                                                onValueChange={(val) => updateMemoryRetention(Number(val))}
                                                disabled={isUpdatingMemory}
                                            >
                                                <SelectTrigger className="h-8 w-[110px] bg-background border-violet-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="15">15 dias</SelectItem>
                                                    <SelectItem value="30">30 dias</SelectItem>
                                                    <SelectItem value="45">45 dias</SelectItem>
                                                    <SelectItem value="60">60 dias</SelectItem>
                                                    <SelectItem value="90">90 dias</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Período que a IA "lembra" das conversas.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Facts Count Card */}
                                <Card className="bg-muted/30">
                                    <CardContent className="p-4 space-y-2">
                                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <BrainCircuit className="h-4 w-4" /> Fatos Aprendidos
                                        </span>
                                        <div className="text-2xl font-bold text-violet-600">
                                            {memoryStats?.facts_stored || 0}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Regras e preferências salvas.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Context Load Card */}
                                <Card className="bg-muted/30">
                                    <CardContent className="p-4 space-y-2">
                                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" /> Contexto Ativo
                                        </span>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {memoryStats?.active_context_messages || 0}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Mensagens analisadas por resposta.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div>
                                    <h3 className="text-lg font-medium flex items-center gap-2 text-violet-700">
                                        <BrainCircuit className="w-5 h-5" />
                                        Banco de Conhecimento
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Fatos e regras que a Clara aprendeu sozinha.
                                    </p>
                                </div>
                                <Badge variant="outline" className="gap-1">
                                    {knowledgeList.length} memórias
                                </Badge>
                            </div>

                            {isLoadingKnowledge ? (
                                <div className="flex flex-col items-center justify-center h-40 space-y-2 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                                    <p>Acessando córtex cerebral...</p>
                                </div>
                            ) : knowledgeList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-xl space-y-4 text-muted-foreground bg-muted/20">
                                    <div className="p-4 bg-muted rounded-full">
                                        <BrainCircuit className="w-12 h-12 text-muted-foreground/50" />
                                    </div>
                                    <div className="text-center max-w-xs">
                                        <h4 className="font-medium text-foreground">Mente em branco</h4>
                                        <p className="text-sm mt-1">
                                            Ainda não aprendi nada específico para esta persona. Converse comigo e me ensine novas regras!
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {knowledgeList.map((fact) => {
                                        let Icon = BrainCircuit;
                                        let colorClass = "text-slate-500";
                                        let bgClass = "bg-slate-100";

                                        switch(fact.category) {
                                            case 'business_rule': 
                                                Icon = Building2; 
                                                colorClass = "text-blue-600";
                                                bgClass = "bg-blue-50";
                                                break;
                                            case 'preference':
                                                Icon = Star;
                                                colorClass = "text-amber-600";
                                                bgClass = "bg-amber-50";
                                                break;
                                            case 'client_fact':
                                                Icon = User;
                                                colorClass = "text-emerald-600";
                                                bgClass = "bg-emerald-50";
                                                break;
                                        }

                                        return (
                                            <Card key={fact.id} className="group hover:border-violet-200 transition-all">
                                                <CardContent className="p-4 flex items-start justify-between gap-4">
                                                    <div className="flex gap-3">
                                                        <div className={cn("p-2 rounded-lg h-fit", bgClass)}>
                                                            <Icon className={cn("w-5 h-5", colorClass)} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-sm">{fact.knowledge_key}</span>
                                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 uppercase tracking-wider">
                                                                    {fact.source === 'chat' ? 'Aprendido' : 'Manual'}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                                {fact.knowledge_value}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground/60 pt-1">
                                                                Aprendido em {new Date(fact.created_at).toLocaleDateString('pt-BR')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        type="button"
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-1"
                                                        onClick={() => handleDeleteKnowledge(fact.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

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
