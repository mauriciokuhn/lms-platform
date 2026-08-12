/**
 * 🌱 Seed — Curso: Alfabetização Digital e Gestão da Aula (Básico)
 *
 * Cria (idempotente, com atualização e limpeza) o instrutor Mauricio Kuhn e
 * o curso completo com 8 módulos e 65 aulas consolidadas.
 *
 * Cada aula cobre vários subtópicos organizados por SUBTÍTULOS internos
 * (linhas iniciadas com "## "), renderizados em destaque na página da aula.
 * Aulas-chave incluem vídeo didático do YouTube (contentType VIDEO).
 *
 * Uso:
 *   npx tsx scripts/seed-curso-alfabetizacao.ts
 */
import { PrismaClient, LessonContentType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ──────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────

type LessonData = { title: string; body: string; video?: string };
type ModuleData = { title: string; description: string; lessons: LessonData[] };
type CourseData = {
  title: string;
  description: string;
  category: string;
  instructorEmail: string;
  modules: ModuleData[];
};


// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.1 Google Drive (10 aulas)
// ──────────────────────────────────────────

const driveLessons: LessonData[] = [
  {
    title: "O que é a nuvem e como criar sua conta Google",
    video: "https://www.youtube.com/watch?v=8mIJiIDBKoo",
    body: `A nuvem é um espaço de armazenamento na internet: em vez de salvar seus arquivos apenas no computador, você os guarda nos servidores do Google e acessa de qualquer aparelho, em qualquer lugar, com um login. Para o professor, isso elimina o pendrive, o "deixei no outro computador" e o medo de perder material se a máquina quebrar.

## Como criar a conta Google
Acesse accounts.google.com, clique em "Criar conta", preencha nome e senha forte. Se a escola fornece uma conta institucional (professor@suaescola.edu.br), prefira usá-la: contas de escola costumam ter mais espaço e ferramentas liberadas. Ative a verificação em duas etapas em myaccount.google.com para proteger o material.

## Acessar o Drive
Depois de logado, acesse drive.google.com — você cai na tela inicial com seus arquivos. É aqui que tudo o que você criar ou enviar vai ficar guardado.

Dica de ouro: comece guardando na nuvem o essencial — planos de aula, caderno de notas e provas. Em pouco tempo, guardar tudo na nuvem vira um hábito natural.`,
  },
  {
    title: "Interface do Drive: navegar, criar pastas e enviar arquivos",
    body: `Ao abrir o Drive, você vê três regiões: a barra de busca no topo, o menu lateral à esquerda (Meu Drive, Compartilhados comigo, Recentes, Lixeira) e a área central com seus arquivos. O botão "Novo" (azul, no canto superior esquerdo) é o ponto de partida: criar pastas, documentos ou enviar arquivos.

## Criar, renomear e mover pastas
Clique em "Novo" > "Nova pasta" para criar; botão direito > "Renomear" (ou F2) para renomear; arraste com o mouse ou use "Mover para" para organizar. Crie primeiro as pastas grandes ("2026"), depois as menores dentro delas ("1º Ano", "Matemática") — organizar antes de guardar economiza horas depois.

## Enviar arquivos do computador
Clique em "Novo" > "Upload de arquivo" (ou arraste direto para a janela) para enviar arquivos; "Upload de pasta" envia uma pasta inteira com tudo dentro. O progresso aparece no canto inferior direito.

Dica: deixe a visualização em "Lista" (ícone no canto direito) para ver nome, dono e data de modificação de uma só vez — e aproveite o arrastar-e-soltar para enviar vários arquivos de uma vez.`,
  },
  {
    title: "Busca inteligente, Lixeira e espaço de armazenamento",
    body: `A busca do Drive é mais esperta do que parece: ela encontra arquivos pelo nome e até pelo texto dentro deles. Digite "prova 3º bimestre" e o Google acha o documento mesmo que o nome seja outro. Refine com os filtros da seta ao lado da barra: por tipo, dono ou data (ex.: "type:pdf before:2026-06-01").

## Lixeira e recuperação
Arquivos excluídos vão para a Lixeira e ficam lá por 30 dias — uma segunda chance. Para recuperar, botão direito > "Restaurar". Depois de 30 dias são apagados de vez; antes de esvaziar a Lixeira, confira se nada importante está lá.

## Espaço e gerenciamento
Contas gratuitas têm 15 GB compartilhados (Drive, Gmail e Fotos); contas escolares, muito mais. Veja o uso na engrenagem > "Armazenamento". O maior vilão são os vídeos: hospede-os no YouTube (modo não listado) e guarde só o link no Drive.

Dica: o Drive entende linguagem natural — tente "planilha de frequência" ou "fotos da formatura". Para a maioria dos arquivos, a busca é mais rápida do que navegar pasta por pasta.`,
  },
  {
    title: "Drive pessoal, Drive compartilhado e acesso offline",
    video: "https://www.youtube.com/watch?v=85CBSi7maC4",
    body: `O "Meu Drive" é o seu espaço pessoal: só você vê, a menos que compartilhe. O "Drive compartilhado" é o espaço da escola: todos os professores autorizados acessam, e os arquivos pertencem à instituição. A diferença prática: quando um professor sai, os arquivos do Drive compartilhado continuam — os do Meu Drive vão embora com a conta.

## O que vai onde
Materiais oficiais (planos aprovados, calendário, provas padrão) ficam no Drive compartilhado; rascunhos e arquivos pessoais ficam no Meu Drive até estarem prontos. Crie o Drive compartilhado com a coordenação e combine a estrutura padrão ("2026 > Planos de aula > 1º Ano").

## Acesso offline
Instale o "Google Drive para desktop" (google.com/drive/download) para usar sem internet no computador, ou marque arquivos como "Disponibilizar offline" no app do celular. Útil em escolas com conexão instável: prepare os materiais da semana quando a internet estiver estável.

Dica: o acesso offline funciona para documentos do Google (Docs, Planilhas, Apresentações), mas não para vídeos pesados — planeje com antecedência o que precisará estar disponível.`,
  },
  {
    title: "Drive no celular: capturar, sincronizar e consultar",
    body: `O Drive no celular é o companheiro de sala de aula: fotografa um trabalho do aluno e ele vai direto para a pasta certa, consulta materiais na hora, responde comentários e compartilha links pelo WhatsApp em segundos. O app também escaneia documentos — o botão de câmera transforma a foto em PDF automaticamente.

## Computador vs celular
Use o celular para capturar e consultar; o computador para organizar e editar em profundidade. Ative o upload automático de fotos no app para que nenhuma foto de aula se perca, e adicione atalhos das pastas mais usadas à tela inicial do celular.

## Sincronização
Tudo o que você cria em um aparelho aparece no outro em segundos — sem passos manuais. É a mesma conta Google, o mesmo Drive, sempre atualizado.

Dica: para verificar um arquivo rapidamente na reunião, o Drive do celular resolve na hora — sem precisar abrir o notebook. E o compartilhamento por link pelo app é o jeito mais rápido de mandar material para a turma no WhatsApp.`,
  },
  {
    title: "Compartilhar arquivos e pastas: permissões e links",
    video: "https://www.youtube.com/watch?v=CePaIDzQ19s",
    body: `Compartilhar é o coração do trabalho colaborativo. Clique com o botão direito no arquivo ou pasta > "Compartilhar" e digite os e-mails — ou gere um link para colar no Classroom e no WhatsApp.

## Os três níveis de permissão
Visualizador: só vê, não altera — ideal para material de apoio aos alunos. Comentador: vê e comenta, sem editar — perfeito para feedback de colegas. Editor: altera tudo — reservado para quem trabalha junto no mesmo arquivo.

## Gerar links
No botão "Compartilhar" > "Alterar" ao lado de "Restrito", escolha quem pode acessar pelo link: restrito, qualquer pessoa com o link, ou apenas a sua escola (ótimo para uso institucional). Para cada opção você define também a permissão do link.

Dica de segurança: para material finalizado (provas, gabaritos), use "visualizador" — e lembre que você pode desativar o link a qualquer momento, cortando os acessos na hora.`,
  },
  {
    title: "Controlar acessos: revogar, transferir e ver atividades",
    body: `Você tem controle total sobre quem acessa seus arquivos. Para revogar, abra "Compartilhar", clique no menu ao lado do nome e escolha "Remover acesso" — a pessoa perde o acesso imediatamente.

## Transferir propriedade
Em "Compartilhar" > ao lado do nome > "Transferir propriedade", o novo dono passa a gerenciar tudo. Use quando um colega assume sua turma, quando o material vai para a coordenação ou quando você encerra o uso de uma pasta compartilhada.

## Ver quem acessou e editou
Dentro de um documento do Google, "Ferramentas" > "Histórico de atividades" (Ctrl+Shift+H) mostra quem editou o quê e quando. No Drive, "Ver detalhes" > aba "Atividade" mostra quem abriu, comentou ou editou recentemente — e a janela Compartilhar indica a data do último acesso de cada pessoa.

Dica pedagógica: use o histórico de atividades em trabalhos em grupo — se dois alunos fizeram tudo e o terceiro nunca abriu o documento, você tem a informação para uma conversa construtiva sobre divisão de tarefas.`,
  },
  {
    title: "Organização da escola: pastas, nomenclatura e cores",
    video: "https://www.youtube.com/watch?v=4LRMNWyMBBA",
    body: `Organização no Drive é economia de tempo: quando tudo tem lugar certo, qualquer material é encontrado em segundos — por você e pelos colegas. A estrutura padrão mais eficiente: ano > turma > disciplina ("2026" > "1º Ano A" > "Matemática"). No fim do ano, renomeie a pasta anterior para "2025 - Arquivado" em vez de apagar.

## Padrão de nomenclatura
Um bom nome diz tudo sem abrir o arquivo: "2026_1A_Matematica_Prova_Bim1". Evite "final.docx" e "sem título". Quando toda a escola usa o mesmo formato, a busca fica padronizada — leve o padrão para a reunião pedagógica e combinem juntos.

## Cores e ícones
Clique com o botão direito na pasta > "Alterar cor" e use um sistema de cores: uma cor por disciplina ou por tipo de material (planejamento, avaliações, apoio). Emojis no nome também ajudam ("📝 Planos de aula"). Combine cores com nomes claros e explique o padrão à equipe.

Dica: a previsibilidade é o grande ganho — qualquer arquivo novo já nasce com lugar definido, e a pergunta "cadê a prova do ano passado?" vira resposta em segundos.`,
  },
  {
    title: "Estrelas, atalhos e modelos reutilizáveis",
    video: "https://www.youtube.com/watch?v=5AzJwS14gXU",
    body: `As estrelas são os favoritos do Drive: botão direito > "Adicionar à estrela" (ou a estrela ao lado do nome) e o arquivo aparece no item "Com estrela" do menu lateral. Marque os arquivos da rotina semanal — a planilha de notas, o plano da semana, a lista de chamada.

## Atalhos
O atalho é um ponteiro para um arquivo que mora em outro lugar: se o material oficial está no Drive compartilhado, crie um atalho dele no seu Meu Drive para acesso rápido, sem duplicar nada (botão direito > "Adicionar atalho ao Drive"). Use para pastas também.

## Modelos reutilizáveis
Monte uma vez os documentos que você usa sempre — prova com o cabeçalho da escola, plano de aula, bilhete aos pais — e para cada uso, botão direito > "Fazer uma cópia". Mantenha uma pasta "Modelos" com as versões atualizadas, e no Classroom use "Fazer uma cópia para cada aluno" para que cada estudante receba a própria cópia.

Dica: combine estrelas com atalhos para os materiais do dia a dia — o caminho até o que você usa toda semana fica reduzido a um clique.`,
  },
  {
    title: "Limpeza periódica e boas práticas de manutenção",
    body: `Um Drive sem manutenção vira depósito de versões antigas, rascunhos e arquivos "final final (2)". Reserve 15 minutos ao fim de cada bimestre: identifique versões antigas, mova sem uso para a Lixeira e esvazie ao final. Use a busca com filtros de data ("before:2025-12-31") para achar materiais há muito intocados.

## A regra dos três passos
Antes de excluir: 1) confira se o arquivo não é a única cópia de algo importante; 2) verifique se não é material oficial que deveria estar no Drive compartilhado; 3) em dúvida, arquive em uma pasta "Arquivado - 2025" em vez de excluir.

## Hábito de organização
A organização é um hábito coletivo: combine com a coordenação um calendário de limpeza (primeira semana do mês) e mantenha o padrão de pastas e nomes. Um Drive escolar limpo é o que permite que o conhecimento da escola seja encontrado por todos.

Dica: a limpeza periódica também libera espaço — esvaziar Lixeira e Spam do Gmail costuma resolver a maioria dos problemas de armazenamento antes de qualquer outra medida.`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.2 Google Docs (9 aulas)
// ──────────────────────────────────────────

const docsLessons: LessonData[] = [
  {
    title: "O que é o Google Docs e por que ele é melhor para a escola",
    video: "https://www.youtube.com/watch?v=Vy0EuXk7bW0",
    body: `O Google Docs é o editor de textos do Google, direto no navegador: sem instalação, sem licença e sem depender de um computador específico. Enquanto o Word é um programa instalado na máquina, o Docs é um serviço na nuvem que salva tudo automaticamente enquanto você digita.

## Vantagens para o professor
O salvamento automático elimina o "esqueci de salvar" — cada tecla já é salva na hora. E como o arquivo fica no Drive, você abre o mesmo documento em casa, na escola ou no celular, sempre na versão atual.

## Colaboração em tempo real
Várias pessoas podem editar o mesmo documento ao mesmo tempo, de computadores diferentes, vendo as mudanças ao vivo. Isso transforma o trabalho em grupo de professores e de alunos — e funciona em qualquer navegador, inclusive em computadores antigos da escola.

Dica: padronize os documentos da equipe no Docs — a formatação, o histórico e a colaboração ficam todos no mesmo lugar, sem versões espalhadas por e-mail.`,
  },
  {
    title: "Criar e formatar documentos: fonte, parágrafos e estilos",
    body: `Para criar um documento, no Drive clique em "Novo" > "Google Docs" (ou acesse docs.google.com e use o "+"). O primeiro hábito: nomeie o documento na hora, seguindo o padrão da escola ("2026_1A_Portugues_PlanoDeAula_Semana5") — um bom nome é o que permite encontrar o arquivo pela busca meses depois.

## Formatação de texto
Selecione o trecho e use a barra de ferramentas: fonte, tamanho, negrito (Ctrl+B), itálico (Ctrl+I), sublinhado, cor e realce. Para materiais que os alunos leem na tela, prefira fontes sem serifa (Arial, Verdana), tamanho 12 e espaçamento 1,5.

## Parágrafos e estilos
Use "Formatar" > "Estilos de parágrafo" com "Título 1" e "Título 2" em vez de só aumentar a fonte — é o segredo de documentos profissionais e do sumário automático. Controle alinhamento (esquerda, centro, justificado) e espaçamento entre linhas em "Formatar" > "Espaçamento".

Dica: oriente os alunos a usar os estilos de título e o recuo de primeira linha nos trabalhos — textos com respiração visual correta são mais agradáveis de corrigir e ensinam produção profissional.`,
  },
  {
    title: "Imagens, links, tabelas, cabeçalho e sumário",
    body: `O Docs permite inserir imagem, link e tabela em qualquer ponto do documento. Para imagens: "Inserir" > "Imagem" (do computador, Drive, URL ou pesquisa do Google). Para links: selecione o texto, clique na corrente (Ctrl+K) e cole o endereço. Para tabelas: "Inserir" > "Tabela" e escolha o tamanho — um quadro de horários ou comparativo fica claro em tabela.

## Cabeçalho e numeração
Clique duas vezes no topo da página (ou "Inserir" > "Cabeçalhos e números de página") para o nome da escola, disciplina, turma e data — e a numeração de páginas, essencial em provas. Capriche no cabeçalho das avaliações: dá acabamento profissional e evita páginas soltas.

## Estilos de título e sumário
Com os títulos aplicados, "Inserir" > "Sumário" monta a lista de capítulos automaticamente — e ela se atualiza sozinha conforme você edita. Em materiais longos, o sumário com links permite ao aluno pular direto para o capítulo.

Dica: em plano de curso ou apostila, organize Título 1 (unidades), Título 2 (capítulos) e Título 3 (seções) desde o início — o painel "Estrutura do documento" à esquerda funciona como índice lateral sempre visível.`,
  },
  {
    title: "Ditar por voz e usar modelos prontos",
    body: `O Docs tem ditado por voz que transforma sua fala em texto — e é uma ferramenta revolucionária para o professor e para os alunos. Ative em "Ferramentas" > "Digitação por voz" (Ctrl+Shift+S), autorize o microfone e fale pausadamente. Você pode ditar pontuação ("vírgula", "ponto final") e comandos ("nova linha", "novo parágrafo"). Funciona apenas no navegador Chrome.

## Para quem é útil
O ditado acelera relatórios de alunos, feedbacks longos e planos de aula — e é um recurso de acessibilidade fundamental: estudantes com dificuldade de digitação ou dislexia produzem textos completos falando.

## Modelos prontos
No "Novo" > "Google Docs" > "A partir de um modelo", o Google oferece currículo, carta, relatório e boletim. Mas o modelo mais valioso é o seu: a prova com o cabeçalho da escola, o plano de aula com seus campos. Monte uma vez e, para cada uso, "Fazer uma cópia". No Classroom, use "Fazer uma cópia para cada aluno" e cada estudante recebe a própria cópia.

Dica: escolha um ambiente silencioso para o ditado e confira o texto ao final — o reconhecimento é ótimo, mas a revisão continua sendo sua.`,
  },
  {
    title: "Baixar e exportar como PDF ou Word",
    body: `Um documento do Docs às vezes precisa sair do mundo Google: para imprimir, enviar por e-mail ou entregar em formato específico. Use "Arquivo" > "Baixar" e escolha: "Documento PDF (.pdf)" para a versão final e "Documento Word (.docx)" para quem vai editar em outro programa.

## PDF: a versão congelada
O PDF é ideal para materiais prontos — provas, comunicados, apostilas. Ele congela a aparência: qualquer pessoa abre e imprime exatamente como você viu, sem risco de desformatar. Enviar o PDF da prova para a gráfica da escola é garantia de saída igualzinha.

## Word e impressão
O .docx serve quando alguém da equipe ainda trabalha no Word — confira o arquivo convertido antes de enviar. E o Docs também imprime direto pelo navegador (Ctrl+P no navegador), sem precisar baixar nada.

Dica: antes de exportar, ajuste a página em "Arquivo" > "Configuração da página" (margens e orientação) e confira no modo de impressão — um PDF bem acabado comunica organização.`,
  },
  {
    title: "Compartilhar e editar em tempo real",
    video: "https://www.youtube.com/watch?v=1Ntj_F9z2Mo",
    body: `O compartilhamento é o que transforma o Docs de editor comum em ferramenta de equipe. Clique em "Compartilhar" no canto superior direito: digite os e-mails ou gere um link, e defina a permissão — Visualizador (só lê), Comentador (lê e comenta) ou Editor (altera).

## Edição simultânea
Com permissão de editor, várias pessoas abrem o mesmo documento ao mesmo tempo e editam juntas, vendo as mudanças em tempo real. Os avatares no canto superior direito mostram quem está online; cada um trabalhando na sua seção, tudo flui sem atrito.

## Cursores coloridos
Cada editor tem um cursor de cor própria, que corresponde à cor do avatar. Você vê quem está digitando o quê — útil na correção de trabalhos em grupo e para intervir quando alguém para de trabalhar.

Dica: peça aos alunos que coloquem uma foto reconhecível no perfil Google — cursores com foto facilitam identificar quem está editando, e o documento vira um mapa vivo da participação de cada um.`,
  },
  {
    title: "Feedback com comentários e modo sugerir",
    body: `Os comentários são a forma do Docs de anotar sem mexer no texto: selecione o trecho, clique no balão (Ctrl+Alt+M) e escreva. Em vez de "leia de novo" no final, marque o parágrafo exato e escreva "aqui o argumento precisa de um exemplo". Quem recebe responde e marca "Resolvido" — e com "@" + e-mail você aciona pessoas diretamente.

## Modo Sugerir
No menu do canto superior direito, mude de "Editando" para "Sugerindo": tudo o que você digita vira sugestão (texto novo em verde, remoções riscadas em vermelho), e o dono decide o que aceita ou rejeita. Nada muda no texto sem aprovação — a forma mais segura de corrigir trabalhos.

## Aceitar e rejeitar
Clique no check para aceitar, no X para rejeitar. "Aceitar tudo" ou "Rejeitar tudo" resolve revisões grandes, e Ctrl+Z desfaz decisões. Combine sugestões (o quê mudar) com comentários (por quê) — o aluno recebe uma aula particular de escrita a cada correção.

Dica: prefira feedback em forma de pergunta ("você consegue dar um exemplo aqui?") a ordens — convida o aluno a pensar e melhora a qualidade da reescrita.`,
  },
  {
    title: "Histórico de versões e restauração",
    body: `O histórico de versões é a máquina do tempo do Docs: "Arquivo" > "Histórico de versões" > "Ver histórico de versões" (ou Ctrl+Alt+Shift+H). Cada versão guarda data, hora e o nome de quem editou — a mais recente no topo, as anteriores abaixo, com as mudanças destacadas.

## Restaurar
Clique nos três pontinhos da versão desejada e escolha "Restaurar esta versão": o documento volta a ser como era, sem apagar o histórico. Para eventos importantes, crie versões nomeadas ("Antes da revisão da coordenação") — elas ficam fixas e fáceis de achar.

## Quando salva um professor
Um aluno apaga um capítulo por acidente; alguém sobrescreve um plano de aula; uma versão do gabarito foi alterada por engano. Em todos os casos, o histórico resolve em três cliques — e o registro de quem fez o quê também serve como evidência de participação em trabalhos em grupo.

Dica: crie o hábito de nomear versões nos marcos importantes (entrega, revisão, aprovação) — você terá um mapa completo da evolução de qualquer documento ao longo do ano.`,
  },
  {
    title: "Trabalho em grupo e boas práticas de convivência",
    body: `O trabalho em grupo com um único documento é um dos usos mais transformadores do Docs: todos editam o mesmo arquivo como editores, em vez de juntar partes separadas no final. A organização vem do planejamento: o grupo cria o esqueleto (Introdução, Desenvolvimento, Conclusão), cada aluno assume uma seção, e os cursores coloridos mostram quem trabalha onde — em tempo real.

## Não sobrescrever o trabalho alheio
Três práticas evitam os acidentes clássicos: combinado de territórios (cada um na sua seção), conversar antes de mudar o texto do colega (comente em vez de apagar), e usar o modo Sugerir para mudanças grandes. Se algo der errado, Ctrl+Z e o histórico de versões resolvem.

## Regras de convivência digital
Transforme as práticas em regras combinadas com a turma no primeiro trabalho: "cada um na sua seção", "comentário antes de mudar", "sugerir em vez de apagar". O histórico de versões mostra quem contribuiu em cada etapa — a avaliação do trabalho em grupo fica justa e transparente.

Dica: oriente os grupos a usar os comentários para negociação ("posso reescrever essa parte?") — o Docs ensina, na prática, o respeito pelo trabalho do outro.`,
  },
];



// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.3 Google Apresentações (8 aulas)
// ──────────────────────────────────────────

const slidesLessons: LessonData[] = [
  {
    title: "O que é o Google Apresentações e diferenças para o PowerPoint",
    body: `O Google Apresentações é a ferramenta de slides do Google — o equivalente gratuito e online do PowerPoint. A diferença essencial: o PowerPoint é um programa instalado no computador; o Google Apresentações roda no navegador, salva na nuvem automaticamente e abre em qualquer aparelho com login.

## Vantagens na escola
Acabam os problemas clássicos: o arquivo não cabe no pendrive, o computador da sala não tem PowerPoint, as fontes trocam ao abrir em outra máquina. Com o Google Apresentações, a apresentação abre igual em qualquer lugar.

## Colaboração
Vários professores montam a mesma apresentação juntos, e os alunos criam trabalhos em grupo em um único arquivo, vendo as edições em tempo real — sem licença, sem instalação e sem limite de uso.

Dica: adote o Google Apresentações como padrão para as aulas na lousa digital e para os trabalhos dos alunos — a padronização simplifica tudo.`,
  },
  {
    title: "Criar apresentações e personalizar temas",
    video: "https://www.youtube.com/watch?v=WabvpG9OAwY",
    body: `Para criar, no Drive clique em "Novo" > "Google Apresentações" (ou acesse slides.google.com e use o "+"). Nomeie a apresentação na hora ("2026_2B_Ciencias_SistemaSolar"), monte o slide de título e adicione novos slides pelo botão "+" da barra. Antes de começar, faça o roteiro no papel: quantos slides, o que cada um mostra — apresentações nascem melhores com estrutura definida.

## Temas e personalização
Em "Slide" > "Alterar tema", escolha o estilo visual da apresentação inteira (cores e fontes). Para personalizar, "Slide" > "Editar tema" muda fontes, cores de destaque e fundo para tudo de uma vez. "Alterar plano de fundo" ajusta um slide específico, e "Exibir" > "Cores da marca" guarda as cores da escola.

Dica visual: menos é mais — fundo claro com texto escuro (ou o inverso) garante leitura na lousa; evite estampas carregadas, o conteúdo deve ser o protagonista.`,
  },
  {
    title: "Slides, layouts e conteúdo: texto, imagens, vídeos e GIFs",
    body: `A organização dos slides acontece no painel à esquerda: arraste as miniaturas para reordenar, botão direito para duplicar ou excluir, e "Adicionar seção" para agrupar por capítulos (Introdução, Conteúdo, Atividade). Os layouts ("Slide" > "Alterar layout") são estruturas prontas: "Duas colunas" para comparativos, "Título e imagem" para capas.

## Inserir conteúdo
Caixas de texto já vêm nos layouts; adicione outras com "Inserir" > "Caixa de texto". Imagens entram por "Inserir" > "Imagem" (computador, Drive, pesquisa ou URL). O destaque da ferramenta: "Inserir" > "Vídeo" busca um YouTube direto no slide — o vídeo toca no modo apresentação, sem abrir outra aba. GIFs animados dão vida a slides de abertura e atividade.

Dica: use a regra 6x6 — no máximo 6 linhas e 6 palavras por linha. O slide é apoio visual da sua fala, não o roteiro completo; o texto longo vai para as notas do apresentador.`,
  },
  {
    title: "Transições, animações e links de navegação",
    body: `As transições (passagem entre slides) e animações (efeitos nos elementos) ficam em "Inserir" > "Animação". Prefira efeitos discretos — "Esvair" e "Deslizar" — e uniformes em toda a apresentação (selecione tudo com Ctrl+A no painel e aplique de uma vez).

## Animações com função pedagógica
Revele conteúdo progressivamente: cada clique mostra uma dica ou uma resposta, mantendo a atenção da turma no ponto atual. Pergunte à turma e clique para revelar a resposta — o slide vira uma ferramenta interativa.

## Links e botões de navegação
Selecione um elemento, clique na corrente (Ctrl+K) e escolha o destino: site, e-mail ou outro slide da apresentação. Monte um "Menu da aula" com botões para cada seção — ou um quiz de revisão onde cada alternativa leva ao slide "Correto!" ou "Tente de novo!". Jogos inteiros, prontos em minutos, sem ferramenta extra.

Dica: teste as animações e links antes da aula — efeitos travando na lousa são o clássico vexame tecnológico.`,
  },
  {
    title: "Modo apresentador e notas de apoio",
    video: "https://www.youtube.com/watch?v=ZXkve3iOnQo",
    body: `O modo apresentador é o seu "anti-esquecimento": a tela que só o professor vê, com o slide atual, o próximo slide, um cronômetro e as notas de apoio. Ative no menu ao lado do botão "Apresentar" > "Ver modo apresentador".

## Notas de apoio
Em "Ver" > "Mostrar notas do apresentador", escreva o roteiro da fala de cada slide: o que dizer, os exemplos, as perguntas para a turma. Durante a apresentação, as notas aparecem na sua tela — invisíveis para os alunos, que veem apenas o slide.

## Apresentar e controlar
Clique em "Apresentar" (Ctrl+F5) para tela cheia no navegador; setas avançam e voltam, Esc sai. Com o app no celular, o aparelho vira controle remoto (com as notas na telinha) — você circula pela sala dando aula, sem ficar preso ao computador. Em dois monitores, o aluno vê o slide na lousa e você as notas no computador.

Dica: a diferença entre "ler os slides" e "dar uma aula" está nas notas — escreva ali o que você quer dizer, e o slide fica limpo e visual.`,
  },
  {
    title: "Publicar na web e compartilhar",
    body: `Publicar na web transforma a apresentação em uma página com link próprio, acessível sem login: "Arquivo" > "Compartilhar" > "Publicar na web". O link serve para enviar o material da aula aos alunos que faltaram, disponibilizar slides para estudo e montar um acervo da escola.

## Compartilhar com permissões
Para o dia a dia, use o botão "Compartilhar": Visualizador para material de apoio, Comentador para revisão de colegas, Editor para trabalhos em grupo. Lembre: a publicação aberta é para conteúdo público — provas e materiais sensíveis usam o compartilhamento restrito.

## Diferença essencial
"Publicar na web" gera um link aberto, sem controle de quem acessa. O "Compartilhar" normal mantém o controle de permissões. Escolha conforme o destino do material.

Dica: publique a apresentação da semana, cole o link no Classroom e marque a republicação automática — os alunos sempre veem a versão atualizada, pelo celular, sem instalar nada.`,
  },
  {
    title: "Edição colaborativa e comentários",
    body: `A edição colaborativa no Google Apresentações é o superpoder do Docs aplicado a slides: um grupo de cinco alunos divide a apresentação — cada um responsável pelos próprios slides — e todos veem o resultado crescer em tempo real. Os avatares mostram quem está online, e o histórico de versões registra quem criou cada slide e quando.

## Comentários e feedback
Selecione um elemento e clique no balão (Ctrl+Alt+M) para comentar sobre ele: "este slide está muito cheio, divida em dois", "ótimo uso de imagem". Com "@" + e-mail, você chama a pessoa para a conversa. O aluno responde, ajusta e marca "Resolvido" — um registro do diálogo de revisão.

## Revisão por pares
Peça que os grupos troquem apresentações e comentem os slides uns dos outros com um roteiro ("aponte 2 pontos fortes e 1 sugestão em cada seção"). A qualidade média dos trabalhos sobe muito antes de chegar à sua correção — e os alunos praticam análise crítica.

Dica: no primeiro slide, o grupo escreve o mapa de divisão — quem é responsável por quais slides. Vira combinado visível e facilita o acompanhamento do processo.`,
  },
  {
    title: "Trabalhos em grupo e permissões para a turma",
    body: `Apresentações em grupo é uma das atividades mais completas: pesquisa, síntese, organização visual e comunicação. No Google Apresentações, o processo colaborativo é transparente: cada integrante apresenta os próprios slides com o modo apresentador, o professor vê quem domina o conteúdo, e a apresentação compartilhada vira material de revisão para toda a turma.

## Avaliação justa
Use o histórico de versões para avaliar a contribuição individual (quantidade e qualidade das edições) combinada com a apresentação oral — o "um faz tudo, outro não faz nada" fica visível e solucionável.

## Editar vs visualizar para a turma
Visualizador é para o material do professor (slides de aula, apostilas) — o aluno lê, não altera. Editor é para o trabalho dos alunos — e no Classroom, "Fazer uma cópia para cada aluno" garante cópia individual sem ninguém mexer no trabalho do outro. Comentador é a permissão ideal para revisão por pares.

Dica: na dúvida, comece como Visualizador e aumente a permissão se precisar — rebaixar depois que alguém bagunçou é sempre mais trabalhoso do que conceder a permissão certa desde o início.`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.4 Google Forms (7 aulas)
// ──────────────────────────────────────────

const formsLessons: LessonData[] = [
  {
    title: "O que é o Google Forms e seus usos na educação",
    body: `O Google Forms é a ferramenta de formulários do Google: você monta perguntas, envia o link e as respostas chegam organizadas automaticamente. Para o professor, ele substitui com vantagem as listas de papel, os "levantem a mão quem..." e as provas digitadas à mão.

## Usos na educação
Pesquisa de opinião com a turma, quiz de revisão com correção automática, inscrição para apresentações, feedback anônimo dos alunos, formulário de matrícula da secretaria e registro de presença em eventos. As respostas caem em uma planilha com data e hora, com gráficos gerados pelo próprio Forms.

## Por que usar
Economia de tempo e dados reais: o professor passa a ter informações sobre a turma — notas, opiniões, dificuldades — em vez de palpites. E como tudo do Google: gratuito, funciona no navegador e no celular, com respostas anônimas ou identificadas.

Dica: monte o rascunho do formulário no papel antes (perguntas, tipos, opções) — com o roteiro pronto, a montagem no Forms leva minutos.`,
  },
  {
    title: "Criar formulários e escolher os tipos de pergunta",
    body: `Para criar, no Drive clique em "Novo" > "Google Forms" (ou acesse forms.google.com). Dê um título claro ("Quiz - Frações - 6º Ano") e uma descrição com instruções e prazo. O formulário só fica visível quando você clica em "Enviar" — enquanto edita, ninguém vê.

## Tipos de pergunta
Múltipla escolha (uma opção) para quizzes e sondagens; caixas de seleção (várias opções) para "marque todos que se aplicam"; resposta curta e parágrafo para dissertativas; escala linear (1 a 5) para autoavaliação; grade de múltipla escolha para pesquisas estruturadas. O tipo certo garante respostas que você consegue analisar.

## Imagens e vídeos
O ícone de imagem ao lado da pergunta insere imagens (do computador, Drive, URL ou pesquisa) — ótimo para questões de interpretação visual e identificação. "Inserir" > "Vídeo" coloca um YouTube no formulário: o aluno assiste e responde no mesmo lugar — ideal para aula invertida.

Dica: varie os tipos no mesmo questionário — múltipla escolha para o que sabem, escala para como se sentem, parágrafo para o que gostariam de aprender.`,
  },
  {
    title: "Seções e lógica condicional",
    video: "https://www.youtube.com/watch?v=uOLNkwLdClo",
    body: `As seções dividem o formulário em blocos, como capítulos: "Adicionar seção" cria um novo bloco com título e descrição próprios. Um questionário de sondagem pode ter "Sobre você", "Hábitos de estudo" e "Preferências de aula" — e o Forms mostra "Página 2 de 3" no rodapé, orientando quem responde.

## Lógica condicional
Dependendo da resposta, o aluno é enviado para uma seção ou outra. Crie primeiro as seções "destino", depois clique nos três pontinhos da pergunta > "Ir para a seção de acordo com a resposta" e defina o destino de cada alternativa.

## Usos práticos
Inscrição que direciona cada aluno para a seção da modalidade escolhida; autoavaliação que envia para dicas diferentes conforme o desempenho; quiz que encaminha quem erra para uma seção de revisão. Teste sempre o fluxo completo respondendo como um aluno faria.

Dica: se todas as alternativas apontarem para o mesmo lugar, a lógica é desnecessária — ela só faz sentido com destinos diferentes.`,
  },
  {
    title: "Quiz com gabarito e correção automática",
    video: "https://www.youtube.com/watch?v=ZztOfil8uzA",
    body: `Transformar o formulário em quiz libera a correção automática: na engrenagem > aba "Quiz", ative "Transformar em questionário". Cada pergunta ganha os campos "Gabarito" e "Pontos": clique em "Gabarito", marque a alternativa correta e defina os pontos (padrão 1 por questão).

## Correção e notas
O Forms soma tudo e calcula a nota de cada aluno no envio. Nas configurações do quiz, escolha o que liberar ao aluno: respostas corretas, respostas incorretas e pontos — imediatamente ou depois ("Liberar nota posteriormente" controla o momento da divulgação em provas).

## Feedback por questão
No gabarito, "Comentários de feedback" permite escrever explicações para quem acertou e para quem errou. O aluno recebe na hora, ao enviar: "3/4 = 0,75 porque dividimos numerador pelo denominador". Feedback formativo imediato, com custo zero.

Dica: escreva feedback nas questões com mais erros — as pegadinhas conceituais — com linguagem de conversa ("cuidado: aqui a pegadinha é..."). O aluno lê com muito mais atenção do que um texto técnico.`,
  },
  {
    title: "Pontuação, prazo e limites de resposta",
    body: `A pontuação é totalmente sua: cada questão pode valer pontos diferentes (uma discursiva vale 3, uma objetiva vale 1). Na aba "Respostas" das configurações, escolha se a nota sai em pontos ou porcentagem, e use "Liberar nota posteriormente" para controlar quando os alunos veem o resultado.

## Limitar respostas e prazo
Na aba "Apresentação", defina a data e hora de fechamento — depois do prazo, o formulário recusa respostas. Na aba "Respostas", ative "Limitar a 1 resposta" (cada pessoa responde uma única vez, evitando duplicidade em enquetes e quizzes) e "Permitir edição da resposta" (o aluno corrige um erro antes do prazo).

## Identificação
"Coletar endereços de e-mail" registra quem respondeu — essencial em provas e quizzes individuais. Para pesquisas anônimas (feedback do professor), deixe desativado, garantindo respostas sinceras.

Dica: comunique o prazo na descrição do formulário ("Inscrições até 20/05 às 18h") e confira o painel de respostas no dia do fechamento — você pode reabrir o formulário a qualquer momento.`,
  },
  {
    title: "Respostas em tempo real e exportação para planilha",
    body: `O painel de respostas (aba "Respostas" do editor) mostra tudo na hora: total de respostas, média da pontuação em quizzes e gráficos automáticos por pergunta. Durante a atividade em sala, projete o painel na lousa e veja a turma evoluir em tempo real — quantos responderam, onde estão errando mais. O botão "Individual" mostra as respostas aluno por aluno, com data e hora.

## Exportar para planilha
No painel, o ícone verde do Google Planilhas cria a planilha de respostas — cada respondente em uma linha, cada resposta em uma coluna, com a coluna de pontuação dos quizzes já preenchida. A conexão é viva: cada nova resposta entra automaticamente.

## Análise
Com os dados na planilha, você calcula médias, aplica filtros, cria gráficos e compila notas — sem digitar nada na mão. No conselho de classe, projete a planilha com os resultados filtrados por pendência.

Dica: crie a pasta "2026 > Avaliações > Respostas" no Drive com nomes padronizados ("Quiz_2B_Matematica_Bim1") — qualquer resultado é encontrado em segundos, mesmo meses depois.`,
  },
  {
    title: "Compartilhar o formulário e restringir o acesso",
    body: `Clique em "Enviar" para distribuir: por e-mail, por link (para colar no Classroom, WhatsApp ou site) ou por código QR (os alunos escaneiam com a câmera do celular — muito prático em sala). A integração com o Classroom é a mais organizada: crie uma atividade anexando o formulário como "Quiz" — as notas voltam para o Classroom automaticamente.

## Restringir o acesso
Nas configurações > "Apresentação", ative "Limitar a usuários da sua organização": apenas contas da escola respondem — bloqueia respostas de fora em provas e quizzes. Combine com a coleta de e-mail e o limite de 1 resposta para a proteção máxima.

## Testar antes de enviar
Abra o link em uma janela anônima do navegador e responda você mesmo — confirma que imagens carregam, o gabarito corrige e os fluxos condicionais navegam, e ainda ganha um exemplo de resposta para conferir como os dados chegam.

Dica: no teste em sala, o código QR projetado na lousa faz a turma inteira entrar de uma vez — e desative as restrições após o prazo se quiser reutilizar o formulário em outra turma.`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.5 Google Planilhas (8 aulas)
// ──────────────────────────────────────────

const sheetsLessons: LessonData[] = [
  {
    title: "O que é uma planilha e para que serve na educação",
    body: `Uma planilha é uma tabela organizada em linhas e colunas, onde cada célula guarda um dado — um número, um texto, uma data — e onde você calcula, compara e visualiza informações automaticamente. O Google Planilhas é a versão gratuita e online disso, a prima do Excel, que funciona no navegador e salva tudo na nuvem.

## Para que serve na escola
O diário de classe (notas de todas as avaliações), a planilha de frequência, o controle de entregas, o planejamento bimestral e a compilação de resultados. A diferença fundamental para uma tabela comum é a fórmula: a célula calcula sozinha — atualize uma nota e a média, o total e a nota final recalculam na hora.

## Vantagens
Gratuito, colaborativo (vários professores no mesmo diário), acessível de qualquer aparelho e com histórico de versões. A fórmula é o que economiza horas de trabalho manual todo bimestre.

Dica: monte a sua primeira planilha de notas ainda esta semana — ver as médias calcularem sozinhas é o momento em que a planilha deixa de ser "matéria" e vira ferramenta.`,
  },
  {
    title: "Interface, dados e formatação de células",
    body: `Ao abrir o Google Planilhas (no Drive: "Novo" > "Google Planilhas"), você vê a grade de células em linhas (numeradas à esquerda) e colunas (letras A, B, C no topo). Cada célula tem um endereço — a célula da coluna B com a linha 3 é a B3 — a base das fórmulas. A barra de fórmulas, acima da grade, mostra o conteúdo da célula selecionada.

## Inserir dados
Clique na célula e digite; Tab vai para a direita, Enter desce. Na linha 1, escreva o cabeçalho ("Nome do aluno", "Prova 1", "Média") e destaque com negrito e fundo. Formate os números em "Formatar" > "Número": notas com 1 ou 2 casas decimais, porcentagens para frequência, datas para datas.

## Formatação de células
O balde de tinta pinta o fundo, o "A" colorido pinta o texto, o menu de bordas desenha a grade. Formatação comunica: cabeçalho destacado, totais em evidência, recuperação em vermelho. Ajuste o tamanho das colunas arrastando a borda do cabeçalho.

Dica: use uma linguagem visual padrão na escola — verde para aprovado, vermelho para reprovado, amarelo para recuperação. Quando a coordenação vê o mesmo padrão em todas as planilhas, a leitura dos resultados fica instantânea.`,
  },
  {
    title: "Fórmulas básicas: SOMA, MÉDIA, MÁXIMO e MÍNIMO",
    video: "https://www.youtube.com/watch?v=l8J-YyLfAsM",
    body: `As fórmulas são o coração da planilha — e as quatro básicas resolvem a maioria dos problemas escolares. Toda fórmula começa com o sinal de igual (=): =SOMA(B2:B10) soma o intervalo de B2 até B10; =MÉDIA(B2:B10) calcula a média; =MÁXIMO(B2:B10) e =MÍNIMO(B2:B10) retornam o maior e o menor valor.

## Intervalos e atualização
O intervalo B2:B10 quer dizer "da célula B2 até a B10" — você pode digitar ou clicar e arrastar sobre as células enquanto escreve a fórmula. A mágica: corrija uma nota no meio do intervalo e a média, a soma e o máximo recalculam na hora, sem tocar nas fórmulas.

## Detalhes úteis
Os nomes das funções em português (SOMA, MÉDIA) também funcionam em inglês (SUM, AVERAGE) — fórmulas vindas de outra planilha seguem funcionando. Para conferir um cálculo importante, faça a conta de cabeça em uma linha de teste.

Dica: use o símbolo de soma (Σ) na barra de ferramentas como atalho — selecione as células e clique nele para somar automaticamente, sem digitar a fórmula.`,
  },
  {
    title: "Média ponderada e congelar linhas",
    body: `A média ponderada dá pesos diferentes para cada avaliação: a prova bimestral vale 2, o trabalho 1 e o teste 1. A fórmula no Planilhas é =SOMARPRODUTO() — mais simples do que parece: =SOMARPRODUTO(notas; pesos) / SOMA(pesos). Com notas em B2:D2 e pesos em B3:D3: =SOMARPRODUTO(B2:D2; B3:D3) / SOMA(B3:D3).

## O cifrão que trava
Coloque os pesos uma vez (linha 3) e use o cifrão para travar a referência: =SOMARPRODUTO(B5:D5; $B$3:$D$3) / SOMA($B$3:$D$3). Ao arrastar a fórmula para baixo (puxe o quadradinho no canto inferior direito da célula), os pesos ficam fixos e cada aluno recebe o seu cálculo.

## Congelar linhas
"Exibir" > "Congelar" mantém o cabeçalho sempre visível ao rolar. Em uma lista de 35 alunos, congele a primeira linha (cabeçalho) e a primeira coluna (nomes): ao rolar pelas notas e pelos alunos, você sempre sabe qual nota está olhando e de quem.

Dica: o congelamento é uma configuração de visualização — não altera dados, e vale para quem abre a planilha compartilhada com a coordenação, facilitando a leitura de todos.`,
  },
  {
    title: "Filtros e ordenação de dados",
    video: "https://www.youtube.com/watch?v=lZ8P_Isvwy4",
    body: `A ordenação e os filtros são a diferença entre "olhar uma lista" e "analisar uma lista". Para ordenar, use o botão direito na coluna ou "Dados" > "Ordenar intervalo": alunos em ordem alfabética, notas da maior para a menor, datas das mais recentes para as mais antigas.

## Filtros
Com o cabeçalho selecionado, "Dados" > "Criar filtro": cada coluna ganha um funil, e você mostra só o que interessa — alunos da turma B, notas acima de 6, entregas de um bimestre. Os dados não são apagados, apenas escondidos; desative o filtro e tudo volta.

## Uso combinado
Filtre "nota abaixo de 6" e a planilha mostra quem precisa de recuperação; ordene por frequência e veja quem faltou mais. O recurso "Visualizar por" cria versões filtradas prontas ("Alunos em recuperação") sem mexer nos dados originais.

Dica: no conselho de classe, projete o diário na lousa com o filtro de pendências aplicado — a discussão ganha foco imediato, sem ninguém folhear planilhas em busca de nomes.`,
  },
  {
    title: "Formatação condicional e gráficos",
    video: "https://www.youtube.com/watch?v=cMikJ81GJFU",
    body: `A formatação condicional pinta células automaticamente conforme o valor — e transforma a leitura de um diário. Em "Formatar" > "Formatação condicional", escolha o intervalo (as colunas de notas) e a regra: "Menor que" 6 com preenchimento vermelho pinta toda nota baixa na hora; uma segunda regra "Maior ou igual a" 6 com verde mostra aprovados. As regras também funcionam com texto ("contém RECUPERAÇÃO") e com escala de cores (degradê verde a vermelho).

## Gráficos
Selecione os dados ("Bimestre" e "Média da turma") e "Inserir" > "Gráfico". Barras ou colunas comparam categorias (média por disciplina); linhas mostram evolução no tempo; pizza mostra proporções (distribuição de conceitos A, B, C, D). No painel à direita, ajuste o intervalo, os rótulos e os títulos.

Dica: gere gráficos para a reunião de pais — "Média da turma por disciplina" e "Distribuição de conceitos" comunicam em segundos o que uma página de números demoraria, e a conversa ganha foco nos dados.`,
  },
  {
    title: "Frequência, proteção e compartilhamento",
    body: `A planilha de frequência é a versão digital da caderneta de chamada: coluna A com os nomes, uma coluna por dia de aula ("P" para presente, "F" para falta, "FJ" justificada), formatação condicional pintando P de verde e F de vermelho. A porcentagem de presença calcula com =CONT.SE(intervalo; "P") / CONT.VALORES(intervalo) — divida quantos "P" pelo total de dias registrados.

## Proteger células
Selecione as células das fórmulas, botão direito > "Proteger intervalo": só quem você autorizar edita — ninguém digita por cima de uma fórmula e quebra o cálculo. Em diários compartilhados, proteja as abas de bimestres fechados e os intervalos de fórmulas.

## Compartilhar com a coordenação
No botão "Compartilhar": Visualizador para a coordenação (consulta sem risco), Comentador para feedback, Editor para quem trabalha nos dados. Use visualizações protegidas para esconder colunas sensíveis de quem abre pelo link.

Dica: a frequência tem implicação legal — o aluno reprova por faltas abaixo de 75%. Exporte em PDF (Arquivo > Baixar) ao fim do bimestre e arquive com o diário.`,
  },
  {
    title: "Planejamento colaborativo e integração com o Forms",
    body: `A planilha colaborativa de planejamento é onde a equipe constrói junta: o planejamento bimestral, o calendário de avaliações, o mapa de conteúdos. Compartilhe como "Editor" com a equipe, padronize colunas ("Conteúdo", "Habilidade", "Aulas previstas", "Avaliação") e use uma aba por disciplina. Congele o cabeçalho, use cores por professor e a formatação condicional destaca lacunas — células de avaliação vazias em vermelho.

## Proteção por território
Cada professor pode editar apenas as próprias colunas usando a proteção por intervalo — colaborativo sem o risco de apagar o planejamento do colega. Os comentários (Ctrl+Alt+M) com "@" resolvem as conversas dentro da planilha.

## Integração com o Forms
Quando o formulário é conectado à planilha, cada resposta nova entra como linha automaticamente — com a pontuação dos quizzes já preenchida. Monte o fluxo de avaliação completo: quiz corrige sozinho no Forms, notas caem na planilha, fórmulas calculam médias e a formatação pinta os destaques. Correção de 3 horas vira 10 minutos de conferência.

Dica: o mesmo raciocínio serve para frequência, sondagens e planejamento — Forms para coletar, Planilhas para analisar, e o tempo do professor para o que importa: o ensino.`,
  },
];



// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.6 Google Agenda (7 aulas)
// ──────────────────────────────────────────

const calendarLessons: LessonData[] = [
  {
    title: "O que é o Google Agenda e a integração com a conta escolar",
    video: "https://www.youtube.com/watch?v=JArW-bzjDFg",
    body: `O Google Agenda é o calendário digital do Google: um organizador de tempo que funciona no navegador, no celular e em qualquer aparelho com a sua conta — com tudo sincronizado automaticamente. Para o professor, ele substitui as agendas de papel com a vantagem de os eventos aparecerem em qualquer dispositivo, sempre atualizados.

## Integração com a escola
Se a escola usa o Workspace, a agenda institucional vem junto com a conta: a coordenação pode compartilhar calendários (reuniões, feriados, dias de prova) que aparecem direto na sua agenda. No celular, o app Google Agenda recebe as notificações na hora.

## O que cabe na agenda
Horários de aula, reuniões pedagógicas, datas de provas e entregas, prazos administrativos e plantões — tudo com lembretes que avisam com antecedência no computador, no celular ou por e-mail.

Dica de início: abra calendar.google.com com a conta da escola e explore — o botão "Criar" no canto superior esquerdo e a lista de calendários à esquerda são seus pontos de partida.`,
  },
  {
    title: "Criar eventos simples, recorrentes e completos",
    body: `Para criar um evento, clique em "Criar" (ou no dia/horário na grade) e preencha título, data, hora e duração. Para eventos do dia inteiro ("Entrega de notas"), marque "Dia inteiro". Clique em "Não se repete" para eventos recorrentes — a reunião semanal da coordenação, o plantão de toda quinta — e defina "Repete até" o fim do semestre. Ao editar uma ocorrência, escolha com atenção: "Este evento", "Esta e as próximas" ou "Todos os eventos".

## Evento completo
Preencha "Adicionar local" (com sugestões de endereço e link do Maps), a descrição (a pauta da reunião, o que levar) e os anexos (arquivos do Drive). Um evento completo é um ponto central de organização: quem abre encontra tudo em um lugar só.

## Recorrentes na rotina
Coloque na agenda tudo o que é fixo da semana como eventos recorrentes — horários de aula, planejamento, correções. Em uma semana, a agenda vira um mapa do tempo e a semana se planeja sozinha.

Dica: para reuniões com a coordenação, capriche no evento — título claro, pauta na descrição, arquivos anexados. Reunião com evento completo começa no horário.`,
  },
  {
    title: "Múltiplos calendários e visualizações",
    body: `Crie vários calendários na mesma conta: na lista à esquerda, "+" ao lado de "Outros calendários" > "Criar novo calendário" ("1º Ano A", "2º Ano B"). Cada turma tem seus próprios eventos — provas e entregas do 1º Ano A no calendário do 1º Ano A — e você liga e desliga a exibição com um clique na caixinha ao lado do nome.

## Código de cores
Cada calendário tem uma cor própria ("Cor da etiqueta" nos três pontinhos). A semana vira um mosaico colorido: cada cor é uma turma, e você identifica o dia de uma olhada, sem ler cada evento.

## Visualizações
Os modos Dia, Semana, Mês e Agenda (lista) servem a momentos diferentes: Mês para o panorama do bimestre, Semana para a rotina diária, Agenda para conferir "o que vem por aí". O sistema clássico do professor: um calendário "Escola", um por turma e um pessoal.

Dica: crie o hábito da revisão de agenda — segunda-feira abra a semana e confira; no início de cada bimestre, abra o mês e marque os marcos (provas, fechamento de notas) antes de qualquer planejamento de conteúdo.`,
  },
  {
    title: "Lembretes e notificações",
    video: "https://www.youtube.com/watch?v=4UYQ-xf-xrU",
    body: `Os lembretes são o que faz o calendário funcionar: sem aviso, um evento esquecido é inútil. Ao criar um evento, o campo "Notificação" define avisos — 10 minutos antes, 1 hora antes, 1 dia antes — e você pode combinar vários. O aviso chega como pop-up no computador, notificação no celular ou e-mail, conforme sua preferência.

## Lembretes soltos
Crie "Lembretes" sem hora marcada ("Entregar notas na secretaria") — eles aparecem no topo do dia, perfeitos para tarefas administrativas. O padrão das notificações fica em Configurações > Notificações: defina o aviso padrão de todos os eventos e escolha os canais.

## Uso pedagógico
Para prazos de alunos, configure dois lembretes: um com 1 dia de antecedência ("amanhã: prova de matemática") para estudar, e um com 30 minutos para você operacionalizar. Dois avisos, tempos diferentes, mesma paz de espírito.

Dica: configure o padrão uma vez (por exemplo, avisar sempre 30 minutos antes) — você nunca mais precisa lembrar de configurar aviso a cada evento.`,
  },
  {
    title: "Google Meet e Agenda no celular",
    video: "https://www.youtube.com/watch?v=7T7daTlhln0",
    body: `O Google Meet se integra à Agenda automaticamente: ao criar um evento, a opção "Adicionar Google Meet" gera o link da videoconferência — os convidados entram clicando nele, sem instalar nada. Reunião pedagógica, plantão de dúvidas online, reunião de pais virtual, aula de reforço remota: o evento já nasce com o link no lugar certo.

## O link do Meet
O endereço no formato meet.google.com/xxx-xxxx-xxx pode ser copiado e enviado pelo WhatsApp ou Classroom para quem não está no evento. As reuniões podem ser gravadas, com o vídeo salvo no Drive de quem gravou. Nas configurações do evento, controle quem entra: qualquer pessoa com o link ou apenas convidados.

## Agenda no celular
Com o app Google Agenda, tudo sincroniza em segundos entre computador e celular. As notificações no celular são o canal mais eficaz — avisos de 10 minutos antes funcionam melhor no bolso. Crie eventos rapidamente e use o assistente de voz ("ok Google, criar evento: reunião com a coordenação amanhã às 14h"). Configure o widget do calendário na tela inicial: a semana à vista no primeiro toque.

Dica: para reuniões com dados sensíveis, o controle de participantes do Meet é recomendado — e defina duração realista para reuniões começarem e terminarem no horário.`,
  },
  {
    title: "Provas, entregas e convites",
    body: `A agenda é o melhor amigo do planejamento de avaliações: no início do bimestre, marque todas as provas e entregas — cada uma no calendário da sua turma. No modo Mês, você vê na hora se colocou três provas na mesma semana e redistribui enquanto é tempo. As entregas entram como eventos com lembrete de 1 dia antes.

## Convidar colegas
O campo "Adicionar convidados" envia convites com os botões "Sim, talvez, não" — e a Agenda mostra quem confirmou. Os convidados recebem os lembretes e os anexos automaticamente, e as mudanças de pauta chegam a todos na hora. Em eventos recorrentes, os convidados valem para todas as ocorrências.

## Comunicar com clareza
Avise os alunos na sala e no Classroom ("prova de matemática: 15/05") — quando a data está no calendário compartilhado, o aluno não pode dizer "não sabia". Para reuniões, confira a lista de quem confirmou dois dias antes para planejar a sala e a pauta.

Dica: eventos com convidados podem ser marcados como "privados" — os detalhes só aparecem para os convidados, não para quem vê seu calendário.`,
  },
  {
    title: "Compartilhar calendário e o calendário coletivo da turma",
    body: `Compartilhar o calendário inteiro — não um evento, mas o calendário completo — organiza equipes. Nos três pontinhos do calendário > "Configurações e compartilhamento", defina as permissões: ver todos os detalhes, ver apenas livre/ocupado, ou editar. O nível "livre/ocupado" é a solução para a privacidade: os colegas veem quando você está ocupado, sem ver o detalhe dos compromissos.

## Calendário da turma
Crie um calendário com o nome da turma ("1º Ano A - 2026"), adicione todos os eventos de avaliação e compartilhe com os alunos como "ver detalhes de todos os eventos". Cada aluno adiciona à própria agenda — e a pergunta "professor, quando é a prova?" deixa de existir. Mudanças de data chegam na hora, porque o calendário compartilhado atualiza no aparelho de todos.

## Combinação com o Classroom
O Google Classroom cria um calendário próprio por turma, com as atividades com prazo automáticas. Use o calendário do Classroom para as atividades digitais e o seu calendário compartilhado para avaliações presenciais e eventos — ou ensine os alunos a sobrepor os dois.

Dica institucional: proponha à coordenação o calendário único da escola (feriados, reuniões, provas unificadas) compartilhado com todos como "ver detalhes" — uma escola, uma agenda, zero comunicados perdidos.`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.7 Google Classroom (8 aulas)
// ──────────────────────────────────────────

const classroomLessons: LessonData[] = [
  {
    title: "O que é o Google Classroom e a diferença para o WhatsApp",
    video: "https://www.youtube.com/watch?v=8Mp4kQ0Ri8o",
    body: `O Google Classroom (Sala de Aula do Google) é o ambiente virtual de aprendizagem da escola: a turma encontra tudo o que o professor publica — avisos, atividades, materiais, avaliações — organizado por data e por tópico, com registro de quem entregou e quem não entregou.

## Diferença para o WhatsApp
No WhatsApp, tudo se mistura: o aviso da prova se perde entre memes, as entregas são fotos bagunçadas no chat. No Classroom, cada atividade é um item separado, com prazo, status de entrega e nota — o professor acompanha tudo em uma visão clara, e nada se perde.

## O que o Classroom tem de único
Conteúdo organizado por tópicos, painel de avaliação com as notas de todas as atividades de cada aluno, e lembretes automáticos de pendências. O WhatsApp não substitui isso — e o Classroom não substitui o WhatsApp: o WhatsApp fica para o aviso rápido; o Classroom é o registro oficial da aprendizagem.

Dica de mentalidade: use os dois, cada um para o que faz de melhor — e estabeleça com a turma que o canal oficial de atividades e prazos é o Classroom.`,
  },
  {
    title: "Criar a turma e convidar alunos",
    video: "https://www.youtube.com/watch?v=DIVzWLrEjF8",
    body: `Acesse classroom.google.com, clique no "+" e escolha "Criar turma". Preencha nome ("6º Ano A - 2026"), seção ("Matemática") e, se quiser, sala e assunto. Na engrenagem, personalize o tema visual e defina as permissões do mural. A turma tem: Mural (avisos e atividades), Pessoas (professores e alunos), Trabalhos (atividades por tópico), Notas (painel de avaliação) e a Google Agenda da turma.

## Convidar alunos
Pelo código: o código da turma no cabeçalho (formato "abc1234") — os alunos clicam em "+" > "Entrar na turma" e digitam. Por e-mail: "Pessoas" > "Convidar alunos" com os endereços. O código pode ser renovado e desativado nos três pontinhos — quando todos entrarem, desative para evitar intrusos.

## Primeiro dia
Crie a turma antes da primeira aula, personalize o tema e escreva um aviso de boas-vindas com as regras de uso. Projete o código na lousa e dê 5 minutos para todos entrarem — depois confira na aba Pessoas quem ficou de fora.

Dica: oriente os alunos a usar a conta da escola para tudo o que for acadêmico — e, se um aluno precisar, o e-mail pessoal também funciona.`,
  },
  {
    title: "Mural, avisos e organização por tópicos",
    video: "https://www.youtube.com/watch?v=4X-e_f9MLSY",
    body: `O mural é a página inicial da turma: avisos e atividades em ordem cronológica. Para publicar um aviso, "Compartilhe algo com sua turma" — aceita texto, arquivos do Drive, links, vídeos e perguntas. O botão de fixar (📌) mantém avisos no topo, perfeito para comunicados permanentes (datas de provas, regras). O Classroom avisa "ainda não visto por X alunos" e reenvia por e-mail; publicações podem ir para várias turmas de uma vez.

## Tópicos
Na aba Trabalhos, "Criar" > "Tópico" cria as pastas da turma ("Unidade 1 - Frações", "1º Bimestre"). Cada atividade é associada a um tópico na criação, e você reorganiza arrastando. Em vez de uma lista longa, o aluno abre "Unidade 1" e vê tudo o que foi feito — e as atividades com prazo aparecem no calendário da turma automaticamente.

## Estrutura anual
Crie os tópicos do ano inteiro no início do ano letivo, na ordem em que serão usados. A estrutura fixa orienta os alunos durante todo o ano — e evita a bagunça de atividades soltas no fim.

Dica: publique o material antes da aula — os alunos que se antecipam estudam antes, e quem faltou encontra o conteúdo sem precisar pedir.`,
  },
  {
    title: "Atividades com prazo e tipos de atividade",
    video: "https://www.youtube.com/watch?v=ONbClF7k-q0",
    body: `Na aba Trabalhos, "Criar" > "Atividade" abre o formulário: título, instruções (o passo a passo do que fazer), tópico, prazo (data e hora), pontos e tema de avaliação. As instruções claras reduzem em 80% as dúvidas ("é para fazer onde?") — o que fazer, como entregar, o que será avaliado.

## Tipos de atividade
Atividade: tarefa com entrega e nota — o tipo mais comum. Quiz: ligado ao Google Forms, com a nota corrigida voltando automaticamente. Pergunta: resposta rápida em texto curto ou múltipla escolha, para sondagens e verificação de leitura. Material: conteúdo de estudo sem entrega e sem nota (textos, apresentações, links, vídeos).

## Prazos e lembretes
Defina prazos realistas com hora ("15/05 às 23:59"). O Classroom lembra os alunos que não entregaram — você não precisa ser o cobrador.

Dica: monte o fluxo semanal completo — Material (conteúdo), Pergunta (verificação), Atividade (trabalho com nota) e Quiz (avaliação objetiva). Ver, responder, produzir, avaliar: a aprendizagem da semana estruturada e visível para o aluno.`,
  },
  {
    title: "Anexar arquivos do Drive com cópia individual",
    body: `Os arquivos do Drive são a forma principal de distribuir material: ao criar a atividade, clique no ícone do Drive e anexe o enunciado, o modelo ou a apresentação. O anexo aparece como um cartão, e os alunos o abrem com um clique.

## O menu de permissões do anexo
"Os alunos podem ver o arquivo": todos veem o mesmo arquivo, sem cópias — ideal para leitura. "Os alunos podem editar o arquivo": todos editam o mesmo — raro, para construção coletiva. E a mais valiosa: "Fazer uma cópia para cada aluno": cada estudante recebe automaticamente a própria cópia, já nomeada com o nome dele.

## Por que a cópia individual
Elimina os problemas clássicos: ninguém apaga o trabalho do outro (cada um tem a própria cópia), o arquivo original do professor fica intacto, e a entrega acontece no próprio arquivo — o aluno trabalha na cópia e clica em "Entregar" quando termina.

Dica: use "cópia para cada aluno" em atividades práticas (roteiros, listas, apresentações) e "ver" em materiais de estudo. O arquivo precisa estar no seu Drive — o Classroom cuida da permissão automaticamente.`,
  },
  {
    title: "Corrigir entregas, comentar e devolver",
    video: "https://www.youtube.com/watch?v=uknBu1_EbCc",
    body: `O painel da atividade mostra quem entregou e quem está pendente — "Entregues", "Atribuídos", "Devolvidos" e "Sem nota" — substituindo a famosa pergunta "quem ainda não entregou?". Na visão da atividade, cada aluno aparece com o status, e você abre cada entrega com um clique para corrigir.

## Devolver com nota e comentário
Abra a entrega do aluno, escreva o comentário privado, defina a nota e clique em "Devolver" — o aluno recebe a notificação com o trabalho corrigido. A devolução em lote seleciona várias entregas de uma vez, com a mesma nota e o mesmo comentário. Se o aluno reentrega após ajustes, a entrega volta marcada como "entregue novamente".

## Pendências e lembretes
O Classroom tem os botões "Lembrar" (e-mail automático para quem não entregou) e "Marcar como ausente" (registro formal para o conselho). Na aba Notas, a matriz completa: linhas de alunos, colunas de atividades, com status e notas.

Dica: crie o ritual do checkpoint — duas vezes por semana, abra o painel de avaliação, veja pendências, envie lembretes e registre ausências. 10 minutos que impedem o acúmulo até o fim do bimestre.`,
  },
  {
    title: "Integração com Forms e materiais de estudo",
    body: `A integração Classroom + Forms é a dupla mais poderosa para avaliações: o quiz do Forms com correção automática vira uma atividade com a nota voltando sozinha. Em "Criar" > "Quiz", anexe o formulário em modo quiz, defina o prazo e os pontos. O aluno responde no Forms, o sistema corrige, a nota entra no painel do Classroom — sem planilha manual.

## O fluxo completo
Quiz no Forms com gabarito e feedback por questão, anexado como atividade com prazo e pontos. Exporte o painel para o Planilhas para as médias. O ciclo aplicar, corrigir, registrar, calcular — em minutos, com dados para o conselho de classe.

## Materiais de estudo
O tipo "Material" distribui conteúdo sem entrega: apresentações, textos, links, vídeos — organizados por tópico. Diferente das atividades, é para consulta, sem prazo. E o fluxo inverso: os materiais criados no Classroom ficam no seu Drive, numa pasta automática "Classroom".

Dica: publique o material antes da aula e use a descrição para dar contexto ("leia antes da terça — traz dúvidas para discutirmos"). O material no Classroom transforma a aula presencial em ponto de partida, não de chegada.`,
  },
  {
    title: "Permissões, segurança e computadores da escola",
    body: `O controle de permissões começa no anexo da atividade — ver, editar ou cópia individual — e continua nas configurações da turma (engrenagem): quem pode postar no mural, comentar e enviar mensagens privadas. Defina no início do ano (mural de professores, alunos comentam) e explique o porquê: o mural organizado é um espaço de todos.

## Aula no laboratório
Os alunos acessam pelos computadores da escola: logados na conta Google, abrem classroom.google.com, trabalham na cópia e clicam em "Entregar" antes de sair. Um material "Roteiro da aula no laboratório" com o passo a passo reduz o caos do primeiro contato.

## Treinamento no início do ano
Faça uma "aula de treinamento do Classroom" no laboratório: todos entram, abrem uma atividade de teste, entregam e conferem a devolução. Uma aula gasta nesse treinamento economiza dezenas de aulas futuras — o tempo de aula fica para o aprendizado, não para a logística.

Dica: mesmo com a permissão certa, acidentes acontecem — o histórico de versões do Docs resolve os imprevistos sem drama. E, para avaliações, a combinação quiz restrito + coleta de e-mail + 1 resposta é a proteção máxima.`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.8 Uso Pedagógico da Lousa Digital (8 aulas)
// ──────────────────────────────────────────

const lousaLessons: LessonData[] = [
  {
    title: "O que é a lousa digital e seus recursos básicos",
    video: "https://www.youtube.com/watch?v=0-pVU7ffsp8",
    body: `A lousa digital é uma tela sensível ao toque conectada a um computador, que substitui o quadro branco e o giz: você escreve com os dedos ou com uma caneta própria, toca para navegar, abre arquivos, vídeos e sites — e tudo aparece grande e visível para a turma inteira.

## Recursos básicos
Escrita à mão livre (várias cores e borracha), toque para clicar e arrastar (como um mouse gigante), teclado virtual e reconhecimento de escrita (o que você escreve vira texto). Muitas lousas têm atalhos físicos na lateral: ligar/desligar, calibrar e ajustar volume.

## Mais que um quadro com cara de tablet
É uma janela para todo o conteúdo digital: navegar pela internet, exibir vídeos, abrir material do Drive e rodar atividades interativas — sem montar projetor, notebook e caixa de som separadamente.

Dica para o primeiro contato: explore a lousa quando a sala estiver vazia — escreva, apague, abra um site. Dez minutos de exploração solitária valem mais que meia hora de tentativa na frente da turma.`,
  },
  {
    title: "Lousa vs projetor e navegar na internet",
    body: `A diferença essencial para o projetor comum é a interatividade: o projetor exibe o que está no computador; a lousa também exibe, mas você toca nela para interagir. A escrita: na lousa digital, você escreve com a caneta digital em qualquer cor e pode salvar o que escreveu. A navegação: toque para avançar slides, abrir links e arrastar elementos. E a participação: o aluno vai à frente, toca, desenha e arrasta respostas — assistir vira participar.

## Navegar na internet
Abra o navegador e navegue como em um computador gigante: visitar sites de pesquisa ensinando a avaliar fontes, mapas interativos, museus virtuais e tours 360, mostrar o funcionamento real de ferramentas online. A navegação também abre o Classroom, o Forms do quiz ao vivo e o Kahoot.

## Preparar antes
Teste os sites antes da aula — alguns bloqueiam conteúdo ou carregam devagar, e o travamento mata o ritmo. Tenha os endereços prontos (favoritos salvos) e um plano B. Desative a economia de bateria se a lousa travar a navegação.

Dica de transição: se a escola ainda tem projetor, ensaie o fluxo da lousa — planejamento didático é o mesmo; a tecnologia só muda a ferramenta.`,
  },
  {
    title: "Drive e Apresentações como quadro interativo",
    body: `A combinação lousa + Google Drive é o planejamento sem papel: todo o material fica no Drive e abre direto na lousa, sem pendrive e sem "não achei o arquivo". Abra drive.google.com na lousa e apresente a apresentação, o documento ou a planilha da aula — com toque para avançar e a caneta para destacar pontos durante a explicação. Deixe os materiais da semana em uma pasta ("Esta semana - 6º Ano") e ative o acesso offline para os principais.

## Apresentações como quadro interativo
A apresentação vira a estrutura da aula: avance e volte tocando na tela, escreva por cima dos slides com a caneta (circulando e ligando conceitos) e abra links e vídeos dentro dela. O modo apresentador funciona com dois dispositivos: a apresentação na lousa e o computador (ou celular) com as notas.

## O slide em branco
Crie o hábito do "slide em branco" entre os conteúdos: um slide vazio onde você escreve as contribuições da turma — o mapa mental da aula, as respostas da discussão. O conteúdo do professor e o conhecimento dos alunos se encontram na mesma tela.

Dica: prepare os materiais da semana na pasta do Drive com antecedência — a lousa com o Drive preparado transforma o improviso em exceção.`,
  },
  {
    title: "Escrever, desenhar e recursos de foco",
    video: "https://www.youtube.com/watch?v=aGfQ4dEwEIY",
    body: `Escrever na lousa digital é o gesto mais natural da ferramenta: a "tinta" é digital — cores, espessuras, borracha sem resíduo — e o conteúdo pode ser salvo e compartilhado. A maioria tem paleta de canetas, borracha, seletor de objeto e reconhecimento de escrita e formas.

## Uso pedagógico
Explicar problemas de matemática passo a passo, desenhar esquemas e mapas conceituais com a turma, corrigir exercícios mostrando o raciocínio em cores, usar fundos especiais (quadriculado para gráficos, pautado para escrita, mapas em branco).

## Recursos de foco
O zoom amplia qualquer parte da tela para mostrar detalhes. O destaque funciona como marca-texto gigante. O apontador laser virtual substitui o "lápis apontando para a tela" — um ponto de luz que se move sem deixar marcas.

Dica: use os três em sequência — laser para apresentar, zoom para ampliar, destaque para fixar. E escreva em cores com função (título de uma cor, conceito de outra): a cor orienta o olhar dos alunos. Salve a "lousa do dia" ao final — vira material de apoio para quem faltou.`,
  },
  {
    title: "Vídeos do YouTube e quizzes ao vivo",
    video: "https://www.youtube.com/watch?v=9T3vW-gYCX8",
    body: `Os vídeos do YouTube são um dos recursos mais usados na lousa: abra o navegador, toque no vídeo e exiba em tela cheia — pausando, voltando e analisando trecho por trecho com a turma. O fluxo de aula: antes (apresente o que vão assistir e o que observar), durante (pause nos momentos-chave para comentar e escrever por cima do vídeo), depois (discuta e conecte com o conteúdo).

## Quizzes ao vivo
O Kahoot e o Quizizz são a forma mais envolvente de revisar: projete na lousa, os alunos respondem pelos celulares e o placar corre em tempo real. No Kahoot, as perguntas ficam na lousa e as respostas nos celulares (mais lúdico). No Quizizz, cada aluno responde no próprio ritmo (ótimo para tarefas). O PIN do jogo aparece na lousa; os alunos entram pelo celular.

## Uso como diagnóstico
Use o quiz ao vivo como diagnóstico, não como competição excludente: errar faz parte, e a revisão imediata (a resposta correta aparece após cada pergunta) explica o erro na hora, na lousa.

Dica: prepare os vídeos em uma playlist e teste o carregamento antes — e defina a duração realista: um vídeo de 5 minutos com pausas vira 20 minutos de aula planejada.`,
  },
  {
    title: "Classroom, espelhamento e salvar o conteúdo",
    body: `A integração do Classroom com a lousa conecta o digital e o presencial: abra classroom.google.com na lousa, projete o mural — avisos, prazos e pendências da semana — e abra atividades para mostrar anexos, corrigir coletivamente e dar exemplos de feedback. Comece a aula com 2 minutos de mural: alinha a turma no mesmo ponto de partida.

## Espelhar a tela do aluno
Espelhar mostra na lousa o que está no computador (ou celular) de um aluno — o trabalho dele vira objeto de análise da turma inteira. Algumas lousas têm espelhamento integrado; em outras, use o Chrome (transmitir guia) ou o Meet (compartilhar tela). Detalhe técnico: estar na mesma rede da escola.

## Salvar e compartilhar o conteúdo
A maioria das lousas tem o botão de captura — um toque salva a tela com as anotações como imagem ou PDF. Ao final da aula, salve a "lousa do dia", suba para o Drive e publique no Classroom: quem faltou recupera a aula, e a coordenação acompanha o que está sendo trabalhado.

Dica: combine as regras do espelhamento antes — é para apresentações e demonstrações, não para curiosidade. E tenha um plano B: se o Wi-Fi falhar, o aluno apresenta do próprio computador enquanto você abre o arquivo dele no Drive na lousa.`,
  },
  {
    title: "Colaboração em tempo real na lousa",
    body: `A lousa é a vitrine perfeita para as ferramentas colaborativas do Google: a combinação lousa + Docs/Planilhas/Apresentações cria uma sala onde a turma inteira trabalha junto, em tempo real, com tudo visível na tela grande.

## O documento coletivo
Abra um Docs compartilhado com permissão de edição para todos e proponha: "vamos escrever coletivamente a definição de X". Os alunos contribuem dos próprios computadores, e cada texto que aparece na tela grande tem a cor do cursor do aluno — a turma vê a construção coletiva acontecendo ao vivo. O mesmo vale para planilhas (dados coletivos viram gráficos na hora) e apresentações (cada grupo monta os próprios slides).

## Gestão visual
Defina as regras antes: quem edita o quê (cada aluno uma seção), o tempo e o que será avaliado. Enquanto a turma trabalha, os cursores coloridos na lousa mostram quem está produzindo, quem está parado e quem precisa de ajuda — a intervenção acontece na hora certa.

## O ganho pedagógico
O aluno vê o trabalho dele projetado em tempo real e ajusta com base no que vê — feedback imediato que nenhum quadro negro oferece.

Dica: use o feedback imediato da tela grande — quando um grupo erra um conceito, a turma inteira aprende com a correção na hora, em vez de descobrir no fim do prazo.`,
  },
  {
    title: "Gestão de turma, problemas e manutenção",
    body: `A lousa digital muda a dinâmica da sala — e com ela vêm novas regras de gestão. Defina um ritmo claro de aula (abertura, conteúdo, atividade, fechamento) com a lousa como centro visual. Gerencie a participação: rodízio ou sorteio para ir à frente, tempo cronometrado, e o combinado de quem manuseia a caneta. Gerencie a atenção: mostre apenas o que é relevante no momento, feche abas não usadas e use o laser e o zoom para direcionar o olhar.

## Solução de problemas básicos
Travamento: espere alguns segundos, feche programas, reinicie o computador conectado. Toque descalibrado (o cursor "fora do dedo"): use a calibração — o botão na lateral ou no software, tocando nos pontos da tela. Conexão: confira os cabos (HDMI e USB — o cabo de toque é o que faz a lousa "sentir"), confirme o software aberto e troque de porta USB.

## Manutenção e cuidados
Use a caneta própria (canetas de quadro branco danificam a superfície), limpe com pano macio levemente umedecido, desligue ao final do dia e proteja os cabos. Anote os problemas recorrentes e a solução no caderno da sala — e tenha o contato do técnico à mão.

Dica: proponha à coordenação o "cuidado coletivo da lousa" — lista de verificação na sala (lousa desligada, caneta guardada, superfície limpa) e um professor responsável por conferir a cada semana. Lousa é patrimônio coletivo: quando todos cuidam, a ferramenta está sempre pronta.`,
  },
];



// ──────────────────────────────────────────
// Dados do curso
// ──────────────────────────────────────────

const courseData: CourseData = {
  title: "Alfabetização Digital e Gestão da Aula (Básico)",
  description:
    "Domine as ferramentas Google na prática: Drive, Docs, Apresentações, Forms, Planilhas, Agenda, Classroom e Lousa Digital. Curso 100% didático, passo a passo, pensado para professores que querem modernizar a gestão da aula sem complicação — com vídeo explicativo em aulas-chave e subtítulos que organizam o aprendizado.",
  category: "Ferramentas Digitais",
  instructorEmail: "mauricio@lms.com",
  modules: [
    {
      title: "Google Drive",
      description: "Armazenamento em nuvem, organização de arquivos, compartilhamento e boas práticas para a escola.",
      lessons: driveLessons,
    },
    {
      title: "Google Docs",
      description: "Editor de textos online: formatação, colaboração em tempo real, comentários e correção de trabalhos.",
      lessons: docsLessons,
    },
    {
      title: "Google Apresentações",
      description: "Crie e apresente slides colaborativos na lousa digital, com notas, animações e publicação na web.",
      lessons: slidesLessons,
    },
    {
      title: "Google Forms",
      description: "Formulários, quizzes com correção automática, lógica condicional e exportação de respostas.",
      lessons: formsLessons,
    },
    {
      title: "Google Planilhas",
      description: "Planilhas de notas e frequência com fórmulas, formatação condicional, filtros e gráficos.",
      lessons: sheetsLessons,
    },
    {
      title: "Google Agenda",
      description: "Calendários por turma e disciplina, eventos recorrentes, lembretes e calendários compartilhados.",
      lessons: calendarLessons,
    },
    {
      title: "Google Classroom",
      description: "O ambiente virtual da turma: atividades com prazo, entregas, notas e material de apoio.",
      lessons: classroomLessons,
    },
    {
      title: "Uso Pedagógico da Lousa Digital",
      description: "Da navegação à aula interativa: escrita, quizzes ao vivo, espelhamento e gestão de turma na lousa.",
      lessons: lousaLessons,
    },
  ],
};

// ──────────────────────────────────────────
// Execução
// ──────────────────────────────────────────

async function main() {
  console.log("🌱 Seed — Alfabetização Digital e Gestão da Aula");

  // 1. Instrutor Mauricio Kuhn (idempotente)
  const instructorPassword = await bcrypt.hash("instrutor123", 10);
  const instructor = await prisma.user.upsert({
    where: { email: courseData.instructorEmail },
    update: {
      name: "Mauricio Kuhn",
      role: "INSTRUCTOR",
      headline: "Professor de Tecnologia Educacional",
      bio: "Educador especializado em alfabetização digital de professores e uso pedagógico das ferramentas Google em sala de aula.",
    },
    create: {
      name: "Mauricio Kuhn",
      email: courseData.instructorEmail,
      passwordHash: instructorPassword,
      role: "INSTRUCTOR",
      headline: "Professor de Tecnologia Educacional",
      bio: "Educador especializado em alfabetização digital de professores e uso pedagógico das ferramentas Google em sala de aula.",
    },
  });
  console.log(`  ✅ Instrutor: ${instructor.name} (${instructor.email})`);

  // 2. Curso (upsert: atualiza se já existir)
  const existing = await prisma.course.findFirst({
    where: { title: courseData.title, instructorId: instructor.id },
  });

  let course;
  if (existing) {
    course = await prisma.course.update({
      where: { id: existing.id },
      data: {
        description: courseData.description,
        category: courseData.category,
        published: true,
        featured: true,
        approvalStatus: "approved",
      },
    });
    console.log(`  🔄 Curso atualizado: ${course.title}`);
  } else {
    course = await prisma.course.create({
      data: {
        title: courseData.title,
        description: courseData.description,
        category: courseData.category,
        price: 0,
        published: true,
        featured: true,
        approvalStatus: "approved",
        instructorId: instructor.id,
      },
    });
    console.log(`  ✅ Curso criado: ${course.title}`);
  }

  // 3. Módulos + aulas (upsert com limpeza de excedentes)
  for (let mi = 0; mi < courseData.modules.length; mi++) {
    const md = courseData.modules[mi];
    let mod = await prisma.module.findFirst({
      where: { courseId: course.id, orderIndex: mi + 1 },
    });
    if (!mod) {
      mod = await prisma.module.create({
        data: { title: md.title, description: md.description, orderIndex: mi + 1, courseId: course.id },
      });
      console.log(`  ✅ Módulo criado: ${md.title}`);
    } else {
      mod = await prisma.module.update({
        where: { id: mod.id },
        data: { title: md.title, description: md.description },
      });
    }

    // Limpeza: remove aulas excedentes (ordem além da nova estrutura)
    const existingLessons = await prisma.lesson.findMany({
      where: { moduleId: mod.id },
      select: { id: true, orderIndex: true },
    });
    for (const el of existingLessons) {
      if (el.orderIndex > md.lessons.length) {
        await prisma.lesson.delete({ where: { id: el.id } });
        console.log(`  🗑️  Removida aula excedente (ordem ${el.orderIndex})`);
      }
    }

    for (let li = 0; li < md.lessons.length; li++) {
      const ls = md.lessons[li];
      const contentType = ls.video ? LessonContentType.VIDEO : LessonContentType.TEXT;
      const existingLesson = await prisma.lesson.findFirst({
        where: { moduleId: mod.id, orderIndex: li + 1 },
      });
      if (existingLesson) {
        await prisma.lesson.update({
          where: { id: existingLesson.id },
          data: {
            title: ls.title,
            description: ls.body.slice(0, 200),
            contentType,
            contentUrl: ls.video || null,
            contentBody: ls.body,
          },
        });
      } else {
        await prisma.lesson.create({
          data: {
            title: ls.title,
            description: ls.body.slice(0, 200),
            contentType,
            contentUrl: ls.video || null,
            contentBody: ls.body,
            orderIndex: li + 1,
            moduleId: mod.id,
          },
        });
      }
    }
    const videoCount = md.lessons.filter((l) => l.video).length;
    console.log(`  📚 ${md.title}: ${md.lessons.length} aulas (${videoCount} com vídeo)`);
  }

  // 4. Quiz final (idempotente)
  const quizExists = await prisma.quiz.findFirst({
    where: { courseId: course.id, title: { contains: "Alfabetização Digital" } },
  });
  if (!quizExists) {
    const quiz = await prisma.quiz.create({
      data: {
        title: `Avaliação Final - ${courseData.title}`,
        description: "Teste seus conhecimentos sobre as ferramentas Google. Nota mínima para aprovação: 70%.",
        passingScore: 70,
        maxAttempts: 3,
        courseId: course.id,
      },
    });

    const questions = [
      {
        text: "Onde ficam os arquivos excluídos do Google Drive antes de serem apagados definitivamente?",
        opts: ["Na pasta Downloads", "Na Lixeira (por 30 dias)", "No Google Fotos", "Na caixa de entrada do Gmail"],
        corr: 1,
      },
      {
        text: "Qual permissão do Drive permite que a pessoa veja o arquivo mas não altere nada?",
        opts: ["Editor", "Comentador", "Visualizador", "Proprietário"],
        corr: 2,
      },
      {
        text: "No Google Docs, qual recurso permite corrigir o texto do aluno sem apagar o original?",
        opts: ["Ctrl+Z", "Modo Sugerir", "Copiar e colar", "Fazer uma cópia"],
        corr: 1,
      },
      {
        text: "Qual ferramenta do Google corrige provas de múltipla escolha automaticamente?",
        opts: ["Google Agenda", "Google Forms (modo quiz)", "Google Apresentações", "Google Drive"],
        corr: 1,
      },
      {
        text: "Para calcular a média das notas de 10 alunos no Google Planilhas, qual fórmula usar?",
        opts: ["=SOMA(A1:A10)", "=MÉDIA(A1:A10)", "=MAX(A1:A10)", "=CONT.SE(A1:A10)"],
        corr: 1,
      },
      {
        text: "Qual recurso da Google Agenda cria automaticamente um link de vídeo para reuniões?",
        opts: ["Google Forms", "Google Meet integrado ao evento", "Google Drive", "Google Classroom"],
        corr: 1,
      },
      {
        text: "No Google Classroom, qual tipo de atividade cria uma cópia individual do arquivo para cada aluno?",
        opts: ["Material", "Pergunta", "Atividade com 'Fazer uma cópia para cada aluno'", "Aviso no mural"],
        corr: 2,
      },
      {
        text: "Qual recurso da lousa digital permite que um aluno mostre a tela do computador dele para a turma?",
        opts: ["Calibração", "Espelhamento de tela", "Modo apresentador", "Zoom"],
        corr: 1,
      },
    ];

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const question = await prisma.question.create({
        data: { text: q.text, orderIndex: qi + 1, quizId: quiz.id },
      });
      for (let oi = 0; oi < q.opts.length; oi++) {
        await prisma.questionOption.create({
          data: { text: q.opts[oi], isCorrect: oi === q.corr, questionId: question.id },
        });
      }
    }
    console.log("  ✅ Quiz final criado (8 questões, nota mínima 70%)");
  } else {
    console.log("  ⏭️  Quiz final já existe — pulando.");
  }

  const totalLessons = await prisma.lesson.count({ where: { module: { courseId: course.id } } });
  const totalModules = await prisma.module.count({ where: { courseId: course.id } });
  console.log(`\n🎓 Curso pronto: ${courseData.title}`);
  console.log(`   Instrutor: ${instructor.name}`);
  console.log(`   ${totalModules} módulos | ${totalLessons} aulas | publicado ✅`);
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

