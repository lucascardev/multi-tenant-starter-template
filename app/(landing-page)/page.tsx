import { FeatureGrid } from '@/components/features'
import { Hero } from '@/components/hero'
import { PricingSection } from '@/components/pricing-section'
import { stackServerApp } from '@/stack'
import { SubscriptionPlan } from '@/types/plan'
import { GitHubLogoIcon } from '@radix-ui/react-icons'
import { ComponentIcon, Users } from 'lucide-react'
import { SocialProofCarousel } from '@/components/social-proof-carousel'
import { ScrollFadeIn } from '@/components/scroll-fade-in'


export const dynamic = 'force-dynamic';

const MOCK_PLANS: SubscriptionPlan[] = [
  {
    id: "mock_inicial",
    plan_name: "Inicial",
    price_monthly: 345,
    price_yearly: 3450,
    currency: "BRL",
    description: "Para uso inicial de pequenas clínicas e consultórios.",
    features: [
      "Assistente virtual completa",
      "Suporte",
      "Integração com seu sistema de gestão",
      "300 atendimentos por mês",
      "Teste grátis de 7 dias."
    ],
    max_messages_count: 0,
    max_customers_count: 300,
    max_personas_count: 1,
    max_instances_count: 1,
    is_active: true,
    display_order: 1
  },
  {
    id: "mock_basico",
    plan_name: "Básico",
    price_monthly: 435,
    price_yearly: 4350,
    currency: "BRL",
    description: "Para uso de clínicas e consultórios em expansão.",
    features: [
      "Mesmo que o plano inicial",
      "600 atendimentos por mês",
      "IA pode ser nomeada"
    ],
    max_messages_count: 0,
    max_customers_count: 600,
    max_personas_count: 1,
    max_instances_count: 1,
    is_active: true,
    display_order: 2
  },
  {
    id: "mock_sob_medida",
    plan_name: "Sob medida",
    price_monthly: 525,
    price_yearly: 5250,
    currency: "BRL",
    description: "Ideal para empresas com maior uso das nossas ferramentas.",
    features: [
      "Mesmo que o plano básico",
      "900 atendimentos por mês"
    ],
    max_messages_count: 0,
    max_customers_count: 900,
    max_personas_count: 1,
    max_instances_count: 1,
    is_active: true,
    display_order: 3
  }
];

async function fetchPlans(): Promise<SubscriptionPlan[]> {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
        ? "https://api.clara-ia.online" 
        : "http://localhost:3030";
        
    const res = await fetch(`${baseUrl}/api/public/plans`, { cache: "no-store", next: { revalidate: 0 } });
    if (!res.ok) {
        throw new Error("Failed to fetch plans");
    }
    const data = await res.json();
    return data.plans || [];
  } catch (error) {
    console.warn("Error fetching plans, using mock data for development:", error);
    return MOCK_PLANS;
  }
}

export default async function IndexPage() {
    const plans = await fetchPlans();
	let project
	try {
		project = await stackServerApp.getProject()
	} catch (e) {
		console.warn('Failed to fetch Stack project (likely due to invalid keys in .env.local). Using mock for dev.')
		project = { config: { clientTeamCreationEnabled: true } }
	}

	if (!project.config.clientTeamCreationEnabled) {
		return (
			<div className='w-full min-h-96 flex items-center justify-center'>
				<div className='max-w-xl gap-4'>
					<p className='font-bold text-xl'>Setup Required</p>
					<p className=''>
						{
							'To start using this project, please enable client-side team creation in the Stack Auth dashboard (Project > Team Settings). This message will disappear once the feature is enabled.'
						}
					</p>
				</div>
			</div>
		)
	}

	return (
		<>
			<Hero
				capsuleText='Falar com a Equipe'
				capsuleLink='https://wa.me/5577999457636?text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20um%20consultor%20sobre%20a%20Clara%21'
				title='A IA feita para trabalhar com você.'
				subtitle='Construída para atender as necessidades de sua clínica.'
                subtitlePrefix='Construída para atender as necessidades de'
                typingWords={['sua clínica.', 'sua academia.', 'sua loja.', 'seu negócio.', 'seu salão.']}
				primaryCtaText='Inscreva-se'
				primaryCtaLink={stackServerApp.urls.signUp}
				secondaryCtaText='Teste a Clara na Prática'
				secondaryCtaLink='https://wa.me/5571987632774?text=Ol%C3%A1%2C%20gostaria%20de%20testar%20a%20Clara%21'
			/>
			<ScrollFadeIn delay={0.2}>
				<div className="bg-muted/30">
					<SocialProofCarousel />
				</div>
			</ScrollFadeIn>

			<div id='features' />
			<ScrollFadeIn>
				<FeatureGrid
					title='Para quem é a Clara?'
					subtitle='Desenvolvida para negócios de saúde, bem-estar e estética que precisam de atendimento rápido e sem falhas.'
				items={[
					{
						icon: (
							<svg fill="currentColor" viewBox="0 0 24 24" className="h-12 w-12"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
						),
						title: 'Clínicas Odontológicas',
						description:
							'Recepção ágil de pacientes, agendamentos via WhatsApp e integração total com o Clinicorp.',
					},
					{
						icon: <Users className='h-12 w-12' />,
						title: 'Psicologia e Nutrição',
						description:
							'Gestão inteligente de horários, confirmação de consultas e atendimento humanizado.',
					},
					{
						icon: <ComponentIcon className='h-12 w-12' />,
						title: 'Estúdios e Academias',
						description:
							'Tire dúvidas sobre planos, agende aulas experimentais e retenha mais alunos 24h por dia.',
					},
					{
						icon: (
							<svg fill="currentColor" viewBox="0 0 24 24" className="h-12 w-12"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
						),
						title: 'Clínicas de Estética',
						description:
							'Apresentação de procedimentos, reagendamentos fáceis e lembretes automáticos.',
					},
				]}
			/>
			</ScrollFadeIn>

			<div id='how-it-works' />
			<ScrollFadeIn>
				<FeatureGrid
					title='Como a Clara funciona na prática?'
					subtitle='Automatize seu atendimento do primeiro contato até o comparecimento.'
					items={[
						{
							icon: (
								<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-12 w-12"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
							),
							title: '1. Conexão Oficial e Segura',
							description:
								'A Clara utiliza a API oficial do WhatsApp para o seu número comercial. Sem bloqueios, sem baixar novos apps.',
						},
						{
							icon: (
								<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-12 w-12"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
							),
							title: '2. Sincronização e Google',
							description:
								'Ela sincroniza em tempo real com seu Clinicorp e integra-se nativamente ao Google Calendar.',
						},
						{
							icon: (
								<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-12 w-12"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
							),
							title: '3. Atendimento Inteligente',
							description:
								'Ao receber uma mensagem, a Clara conversa natural, tira dúvidas e agenda no melhor horário.',
						},
						{
							icon: (
								<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-12 w-12"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
							),
							title: '4. Confirmação Ativa',
							description:
								'Um dia antes, ela manda um lembrete no WhatsApp para confirmar a presença e reduzir faltas.',
						},
					]}
				/>
			</ScrollFadeIn>

			<div id='pricing' />
			<ScrollFadeIn>
				<PricingSection plans={plans} />
			</ScrollFadeIn>
		</>
	)
}
