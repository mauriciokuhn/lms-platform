import Link from "next/link";
import type { Metadata } from "next";
import { getServerTranslation } from "@/lib/i18n/server-translation";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation();
  return {
    title: t("privacy.title"),
    description: "Política de privacidade do Ponto do Saber em conformidade com a LGPD.",
  };
}

export default async function PrivacyPage() {
  const { t } = await getServerTranslation();

  const sections = [
    {
      title: "1. Dados Coletados",
      content: `Coletamos os seguintes dados pessoais dos usuários:
        • Nome completo
        • Endereço de e-mail
        • Foto de perfil (opcional)
        • Dados de navegação (cursos acessados, tempo de visualização, progresso)
        • Informações de dispositivo e navegador
        • Cookies de autenticação e preferências`,
    },
    {
      title: "2. Finalidade do Tratamento",
      content: `Seus dados são utilizados para:
        • Criar e gerenciar sua conta na plataforma
        • Fornecer acesso aos cursos e materiais didáticos
        • Rastrear seu progresso de aprendizado
        • Emitir certificados de conclusão
        • Enviar notificações sobre cursos e conquistas
        • Melhorar nossa plataforma com base em dados de uso
        • Cumprir obrigações legais e regulatórias`,
    },
    {
      title: "3. Base Legal",
      content: `O tratamento de dados pessoais realizado pelo Ponto do Saber tem como base legal:
        • Consentimento do titular (art. 7º, I da LGPD)
        • Execução de contrato (art. 7º, V da LGPD)
        • Legítimo interesse (art. 7º, IX da LGPD)
        • Cumprimento de obrigação legal (art. 7º, II da LGPD)`,
    },
    {
      title: "4. Compartilhamento de Dados",
      content: `Compartilhamos seus dados apenas com:
        • Prestadores de serviço essenciais (hospedagem, armazenamento em nuvem, envio de e-mails)
        • Google (para autenticação social, quando utilizada)
        • Órgãos reguladores, quando exigido por lei
      Não vendemos seus dados pessoais para terceiros em hipótese alguma.`,
    },
    {
      title: "5. Cookies",
      content: `Utilizamos cookies necessários para:
        • Manter sua sessão ativa
        • Lembrar suas preferências (tema escuro/claro, idioma)
        • Armazenar tokens de autenticação
      Não utilizamos cookies de rastreamento ou publicidade.`,
    },
    {
      title: "6. Direitos do Usuário (LGPD)",
      content: `Você tem direito a:
        • Confirmar a existência de tratamento de seus dados
        • Acessar seus dados pessoais
        • Corrigir dados incompletos, inexatos ou desatualizados
        • Solicitar a portabilidade dos dados
        • Revogar o consentimento a qualquer momento
        • Solicitar a exclusão dos dados
        • Solicitar informação sobre entidades com as quais compartilhamos dados
      Para exercer seus direitos, entre em contato pelo e-mail: privacidade@lms.com`,
    },
    {
      title: "7. Segurança dos Dados",
      content: `Adotamos medidas técnicas e organizacionais para proteger seus dados:
        • Criptografia de senhas (bcrypt)
        • Conexão HTTPS em toda a plataforma
        • Acesso restrito a dados pessoais
        • Backups regulares do banco de dados
        • Monitoramento de tentativas de acesso não autorizado`,
    },
    {
      title: "8. Retenção dos Dados",
      content: `Mantemos seus dados pessoais enquanto sua conta estiver ativa. Após exclusão da conta, os dados são mantidos por até 90 dias para cumprimento de obrigações legais e posteriormente eliminados permanentemente.`,
    },
    {
      title: "9. Contato do DPO",
      content: `Caso tenha dúvidas sobre esta política ou queira exercer seus direitos, entre em contato com nosso Encarregado de Dados (DPO):
        • E-mail: dpo@lms.com
        • Prazo de resposta: até 15 dias úteis`,
    },
  ];

  return (
    <div className="min-h-screen bg-white px-4 py-16 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-zinc-400">
          <Link href="/" className="hover:text-zinc-600 dark:hover:text-zinc-300">{t("common.home")}</Link>
          <span>/</span>
          <span className="text-zinc-600 dark:text-zinc-300">{t("privacy.title")}</span>
        </div>

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">
          {t("privacy.title")}
        </h1>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {t("privacy.updated")}
        </p>
        <p className="mt-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          {t("privacy.intro")}
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
            {t("privacy.consent")}
          </p>
        </div>
      </div>
    </div>
  );
}
