import Link from "next/link";
import type { Metadata } from "next";
import { getServerTranslation } from "@/lib/i18n/server-translation";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation();
  return {
    title: t("terms.title"),
    description: "Termos e condições de uso da LMS Platform.",
  };
}

export default async function TermsPage() {
  const { t } = await getServerTranslation();

  const sections = [
    {
      title: "1. Aceitação dos Termos",
      content: `Ao criar uma conta e utilizar a LMS Platform, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize nossos serviços.`,
    },
    {
      title: "2. Descrição do Serviço",
      content: `A LMS Platform é uma plataforma de cursos online (LMS - Learning Management System) que oferece:
        • Acesso a videoaulas e materiais didáticos
        • Questionários interativos com correção automática
        • Certificados digitais de conclusão
        • Acompanhamento de progresso de aprendizado
        • Sistema de gamificação (XP, badges, rankings)
      Atualmente, todos os cursos são oferecidos gratuitamente.`,
    },
    {
      title: "3. Cadastro e Conta",
      content: `Para utilizar a plataforma, você deve:
        • Fornecer informações precisas e completas
        • Manter seus dados de cadastro atualizados
        • Não compartilhar sua senha com terceiros
        • Ser responsável por todas as atividades em sua conta
      Reservamo-nos o direito de suspender contas que violem estes termos.`,
    },
    {
      title: "4. Conduta do Usuário",
      content: `Ao utilizar a plataforma, você concorda em:
        • Não compartilhar respostas de questionários publicamente
        • Não tentar burlar o sistema de avaliação
        • Não utilizar a plataforma para fins ilegais
        • Não violar direitos de propriedade intelectual
        • Não enviar conteúdo malicioso ou spam
        • Não criar múltiplas contas para obter benefícios indevidos`,
    },
    {
      title: "5. Propriedade Intelectual",
      content: `Todo o conteúdo disponível na plataforma (videoaulas, materiais, questionários) é protegido por leis de propriedade intelectual. Você pode:
        • Assistir e estudar o conteúdo para uso pessoal
        • Fazer download de materiais de apoio quando disponibilizados
      Você NÃO pode:
        • Reproduzir, distribuir ou revender o conteúdo
        • Utilizar o conteúdo para fins comerciais sem autorização
        • Criar obras derivadas baseadas no conteúdo`,
    },
    {
      title: "6. Certificados",
      content: `Os certificados digitais emitidos pela LMS Platform:
        • São gerados automaticamente ao cumprir os requisitos (100% das aulas + nota mínima de 70% no quiz final)
        • Possuem código único de verificação
        • Podem ser verificados por terceiros através do nosso sistema de validação
        • São fornecidos gratuitamente
      A emissão indevida de certificados pode resultar na suspensão da conta.`,
    },
    {
      title: "7. Limitação de Responsabilidade",
      content: `A LMS Platform se esforça para manter a plataforma disponível e o conteúdo atualizado, mas:
        • Não garantimos disponibilidade ininterrupta do serviço
        • Não nos responsabilizamos por danos decorrentes do uso da plataforma
        • O conteúdo dos cursos é fornecido "como está", podendo ser atualizado sem aviso prévio
        • Não garantimos que o conhecimento adquirido resultará em oportunidades profissionais específicas`,
    },
    {
      title: "8. Cancelamento e Exclusão",
      content: `Você pode cancelar sua conta a qualquer momento através das configurações do perfil ou entrando em contato conosco. Ao excluir sua conta:
        • Seus dados pessoais serão removidos em até 90 dias
        • Certificados emitidos permanecerão válidos e verificáveis
        • O progresso em cursos será perdido permanentemente`,
    },
    {
      title: "9. Disposições Gerais",
      content: `• Estes termos são regidos pela legislação brasileira
        • Qualquer disputa será resolvida no foro da comarca de São Paulo - SP
        • Caso alguma cláusula seja considerada inválida, as demais permanecem em vigor
        • Podemos alterar estes termos a qualquer momento, notificando os usuários por e-mail
        • O uso continuado após alterações constitui aceitação dos novos termos`,
    },
    {
      title: "10. Contato",
      content: `Para questões sobre estes Termos de Uso, entre em contato:
        • E-mail: suporte@lms.com
        • Prazo de resposta: até 5 dias úteis`,
    },
  ];

  return (
    <div className="min-h-screen bg-white px-4 py-16 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-zinc-400">
          <Link href="/" className="hover:text-zinc-600 dark:hover:text-zinc-300">{t("common.home")}</Link>
          <span>/</span>
          <span className="text-zinc-600 dark:text-zinc-300">{t("terms.title")}</span>
        </div>

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">
          {t("terms.title")}
        </h1>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {t("terms.updated")}
        </p>
        <p className="mt-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          {t("terms.intro")}
        </p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                {section.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("terms.consent")}
          </p>
        </div>
      </div>
    </div>
  );
}
