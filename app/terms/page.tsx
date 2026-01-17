
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export default function TermsPage() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto bg-white shadow sm:rounded-lg print:shadow-none">
        
        {/* Header - Hidden in Print */}
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center print:hidden">
          <h1 className="text-lg leading-6 font-medium text-gray-900">
            Termos de Uso e Contrato SaaS
          </h1>
          <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Baixar Contrato (PDF)
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 py-5 sm:p-6 text-gray-800 space-y-6 text-sm leading-relaxed print:text-xs print:leading-normal">
          
          <div className="text-center mb-8 border-b pb-4">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-900">Contrato de Licenciamento de Software (SaaS)</h2>
            <p className="mt-2 text-gray-500">Clara - Assistente Virtual Inteligente</p>
          </div>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">1. Das Partes</h3>
            <p>
              Ao utilizar a plataforma <strong>Clara</strong>, você (doravante denominado "CONTRATANTE" ou "USUÁRIO") concorda com os termos deste instrumento, firmado com a provedora do serviço (doravante denominada "CONTRATADA"), detentora dos direitos de propriedade intelectual do software.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">2. Do Objeto</h3>
            <p>
              O presente contrato tem por objeto o licenciamento de uso, em caráter não exclusivo e intransferível, do software <strong>Clara</strong>, disponibilizado na modalidade SaaS (Software as a Service), acessível via internet, destinado à gestão de atendimento e automação via inteligência artificial.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">3. Do Acesso e Disponibilidade</h3>
            <p>
              3.1. O acesso ao software será concedido mediante cadastro e pagamento do plano escolhido.<br/>
              3.2. A CONTRATADA envidará os melhores esforços para manter o sistema disponível 24/7, ressalvadas paradas para manutenção programada ou falhas de terceiros (servidores, internet, APIs de WhatsApp/Google).<br/>
              3.3. A CONTRATADA não se responsabiliza por instabilidades decorrentes de culpa exclusiva de terceiros ou má utilização pelo CONTRATANTE.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">4. Dos Pagamentos e Planos</h3>
            <p>
              4.1. O licenciamento é oneroso, pago na modalidade de assinatura (mensal ou anual), conforme valores vigentes na data da contratação.<br/>
              4.2. O não pagamento acarretará na suspensão temporária do acesso e, após 30 dias, no cancelamento do serviço e exclusão dos dados.<br/>
              4.3. Não há fidelidade mínima, podendo o cancelamento ser solicitado a qualquer momento, sem multa, cessando a cobrança no período subsequente.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">5. Da Segurança e Proteção de Dados</h3>
            <p>
              5.1. A CONTRATADA compromete-se a adotar medidas de segurança adequadas para proteção dos dados armazenados.<br/>
              5.2. O CONTRATANTE declara estar ciente e de acordo com a <strong>Política de Privacidade</strong>, parte integrante deste contrato.<br/>
              5.3. Os dados inseridos no sistema pertencem exclusivamente ao CONTRATANTE.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">6. Das Responsabilidades</h3>
            <p>
              6.1. O CONTRATANTE é o único responsável pelo conteúdo das mensagens enviadas através da plataforma (via WhatsApp ou outros canais).<br/>
              6.2. É vedado o uso da plataforma para envio de spam, conteúdo ilícito ou que viole direitos de terceiros.<br/>
              6.3. A IA (Clara) pode cometer erros ou alucinações ("hallucinations"). O CONTRATANTE deve supervisionar o uso da ferramenta, especialmente em situações críticas.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 uppercase mb-2">7. Disposições Gerais</h3>
            <p>
              7.1. Este contrato entra em vigor na data do aceite eletrônico (clique no checkbox "Li e concordo").<br/>
              7.2. A CONTRATADA poderá atualizar estes termos periodicamente, notificando o CONTRATANTE via e-mail ou aviso na plataforma.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200 print:mt-20">
             <p className="text-gray-500 text-xs">
               Este documento foi gerado eletronicamente e aceito digitalmente pelo usuário no momento da contratação.
               <br/>
               Data da impressão: {new Date().toLocaleDateString('pt-BR')}
             </p>
          </div>

        </div>
      </div>
    </div>
  )
}
