
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow sm:rounded-lg">
        
        {/* Header */}
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center gap-4">
          <Link href="/">
             <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
             </Button>
          </Link>
          <h1 className="text-lg leading-6 font-medium text-gray-900">
            Política de Privacidade
          </h1>
        </div>

        {/* Content */}
        <div className="px-4 py-5 sm:p-6 text-gray-800 space-y-6 text-sm leading-relaxed">
          
          <div className="text-center mb-8 border-b pb-4">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-900">Política de Privacidade</h2>
            <p className="mt-2 text-gray-500">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">1. Introdução</h3>
            <p>
              A sua privacidade é importante para nós. É política do <strong>Clara</strong> respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site e em nossa aplicação.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">2. Coleta de Dados</h3>
            <p>
              Solicitamos informações pessoais (como nome, e-mail, telefone) apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento.
            </p>
            <p className="mt-2">
              <strong>Dados do Google (OAuth):</strong> Ao conectar sua conta Google (Agenda/Calendar), acessamos apenas os dados necessários para a funcionalidade de agendamento da IA. Não armazenamos seus eventos além do necessário para o funcionamento da automação e não compartilhamos esses dados com terceiros para fins de publicidade.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">3. Uso de Dados</h3>
            <p>
              Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">4. Compartilhamento</h3>
            <p>
              Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei ou para o funcionamento essencial do serviço (ex: APIs de IA e WhatsApp).
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">5. Compromisso do Usuário</h3>
            <p>
              O usuário se compromete a fazer uso adequado dos conteúdos e da informação que o Clara oferece no site e com caráter enunciativo, mas não limitativo:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>A) Não se envolver em atividades que sejam ilegais ou contrárias à boa fé e à ordem pública;</li>
                <li>B) Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, ou contra os direitos humanos;</li>
                <li>C) Não causar danos aos sistemas físicos (hardware) e lógicos (software) do Clara, de seus fornecedores ou terceiros.</li>
            </ul>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
             <p className="text-gray-500 text-xs">
               Para mais informações, entre em contato com nosso suporte.
             </p>
          </div>

        </div>
      </div>
    </div>
  )
}
