/**
 * 🌱 Seed — Curso: Alfabetização Digital e Gestão da Aula (Básico)
 *
 * Cria (idempotente) o instrutor Mauricio Kuhn e o curso completo com
 * 8 módulos e ~130 aulas em conteúdo textual didático (passo a passo).
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

type LessonData = { title: string; body: string };
type ModuleData = { title: string; description: string; lessons: LessonData[] };
type CourseData = {
  title: string;
  description: string;
  category: string;
  instructorEmail: string;
  modules: ModuleData[];
};

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.1 Google Drive
// ──────────────────────────────────────────

const driveLessons: LessonData[] = [
  {
    title: "O que é armazenamento em nuvem e por que usar",
    body: `A nuvem é um espaço de armazenamento na internet: em vez de salvar seus arquivos apenas no computador, você os guarda nos servidores do Google. Isso significa que seus documentos, fotos e planilhas ficam seguros mesmo se o computador quebrar ou for roubado.

Para o professor, a nuvem é uma revolução: você acessa o mesmo arquivo em casa, na escola ou no celular, sem precisar levar pendrive. Seu material de aula nunca mais fica "no outro computador".

Dica: pense na nuvem como um armário gigante onde você guarda cópias dos seus arquivos. Tudo que é colocado lá fica disponível em qualquer lugar com internet.`,
  },
  {
    title: "Criar conta Google e acessar o Drive",
    body: `Para usar o Google Drive, você precisa de uma conta Google (Gmail). Se ainda não tem, acesse accounts.google.com e clique em "Criar conta". Preencha nome, data de nascimento e escolha um e-mail e senha fortes.

Depois de criar a conta, acesse drive.google.com e faça login com seu e-mail e senha. Você verá a tela inicial do Drive com seus arquivos.

Dica importante: se a escola fornece uma conta institucional (algo como professor@escola.edu.br), prefira usar essa conta. Contas da escola costumam ter mais espaço e ferramentas liberadas.`,
  },
  {
    title: "Interface do Drive: navegação e organização",
    body: `Ao abrir o Drive, você vê três áreas principais: a barra de busca no topo, o menu lateral à esquerda (Meu Drive, Computadores, Compartilhados comigo, Recentes e Lixeira) e a área central onde seus arquivos e pastas aparecem.

O botão "Novo" (canto superior esquerdo) permite criar pastas, documentos, planilhas ou enviar arquivos. Use o menu lateral para navegar entre seus arquivos, os que outros compartilharam com você e os mais recentes.

Dica: deixe a visualização em "Lista" (ícone de linhas no canto direito) para ver nome, dono e data de modificação dos arquivos de uma só vez.`,
  },
  {
    title: "Criar, renomear e mover pastas",
    body: `Para criar uma pasta, clique em "Novo" > "Nova pasta", digite o nome e confirme. A pasta aparece no seu Drive.

Para renomear, clique com o botão direito sobre a pasta e escolha "Renomear". Para mover uma pasta para dentro de outra, arraste-a com o mouse sobre a pasta de destino, ou use o botão direito > "Mover para" e escolha o local.

Dica: crie primeiro as pastas grandes (por exemplo "2026"), depois as menores dentro delas ("1º Ano", "Matemática"). Organizar antes de colocar arquivos economiza muito tempo depois.`,
  },
  {
    title: "Fazer upload de arquivos e pastas do computador",
    body: `Upload é o ato de enviar um arquivo do seu computador para o Drive. Clique em "Novo" > "Upload de arquivo" e selecione o arquivo, ou arraste o arquivo direto para a janela do Drive.

Você também pode fazer upload de uma pasta inteira: clique em "Novo" > "Upload de pasta" e escolha a pasta. Todos os arquivos dentro dela serão enviados.

Dica: você pode arrastar vários arquivos de uma vez. Observe a barra de progresso no canto inferior direito — quando sumir, o upload terminou.`,
  },
  {
    title: "Busca de arquivos por nome, tipo e data",
    body: `A barra de busca do Drive fica no topo da tela. Digite o nome do arquivo que procura e pressione Enter. O Google encontra pastas, documentos, planilhas e até o texto dentro de documentos!

Você pode refinar a busca: clique na seta ao lado da barra e filtre por tipo (documento, planilha, PDF), por dono, ou por data de modificação. Por exemplo: "planilha notas antes de 2026-06-01".

Dica: o Drive entende linguagem natural. Tente buscar "prova de matemática 3º bimestre" — ele encontra pelo conteúdo, não só pelo nome.`,
  },
  {
    title: "Lixeira e recuperação de arquivos deletados",
    body: `Quando você exclui um arquivo, ele vai para a Lixeira (menu lateral esquerdo). Ele não é apagado de vez imediatamente — fica lá por 30 dias.

Para recuperar, abra a Lixeira, clique com o botão direito sobre o arquivo e escolha "Restaurar". Ele volta para o mesmo lugar de onde foi excluído.

Atenção: depois de 30 dias na lixeira, o arquivo é apagado definitivamente. Se você quiser liberar espaço antes, pode esvaziar a lixeira manualmente — mas só faça isso se tiver certeza de que não precisa mais do conteúdo.`,
  },
  {
    title: "Espaço de armazenamento: limites e gerenciamento",
    body: `Contas Google gratuitas têm 15 GB de armazenamento compartilhados entre Drive, Gmail e Google Fotos. Contas escolares costumam ter espaço muito maior ou ilimitado.

Para ver quanto você usou, clique na engrenagem (⚙️) no canto superior direito e depois em "Armazenamento". Você verá um gráfico com o que ocupa mais espaço: e-mails grandes, fotos e vídeos costumam ser os vilões.

Dica: vídeos pesados ocupam muito espaço. Prefira hospedar vídeos no YouTube (modo não listado) e guardar só o link no Drive.`,
  },
  {
    title: "Drive pessoal vs Drive compartilhado da escola",
    body: `O "Meu Drive" é o seu espaço pessoal: só você vê os arquivos, a menos que compartilhe. Já o "Drive compartilhado" (ou de equipe) é um espaço da escola, onde todos os professores têm acesso e os arquivos pertencem à instituição, não a uma pessoa.

Quando um professor sai da escola, os arquivos do Drive compartilhado continuam lá. No Drive pessoal, os arquivos vão junto com o dono.

Dica: materiais oficiais da escola (planos de aula, calendários, provas padrão) devem ficar no Drive compartilhado. Arquivos pessoais de rascunho ficam no Meu Drive.`,
  },
  {
    title: "Acesso offline ao Drive",
    body: `Você pode acessar arquivos do Drive sem internet! Primeiro, instale o "Google Drive para desktop" no computador da escola (baixe em google.com/drive/download) ou o app do Drive no celular.

No celular, abra o arquivo e toque no ícone de três pontinhos > "Disponibilizar offline". No computador, com o Drive instalado, marque arquivos ou pastas como "Disponível offline" com o botão direito.

Atenção: só funciona se você abriu o arquivo uma vez com internet. Planeje-se: baixe o material da próxima aula antes, em casa, e ele estará pronto mesmo se a internet da escola cair.`,
  },
  {
    title: "Drive no celular vs computador",
    body: `No computador, o Drive funciona pelo navegador (drive.google.com) ou pelo app "Drive para desktop". No celular, use o app Google Drive, disponível na Play Store e App Store — ele mostra todos os seus arquivos na palma da mão.

Vantagens do celular: tirar foto de um documento e enviar direto para o Drive, acessar materiais na sala de aula sem abrir o notebook e compartilhar links rapidamente com a turma via WhatsApp.

Dica: no app do celular, ative o "backup automático de fotos" se quiser guardar fotos de atividades dos alunos. Mas lembre-se: cada foto conta no seu espaço de armazenamento.`,
  },
  {
    title: "Compartilhar arquivos e pastas: permissões de visualizador, comentador e editor",
    body: `Compartilhar é permitir que outras pessoas vejam ou editem seus arquivos. Clique com o botão direito no arquivo > "Compartilhar" e adicione os e-mails das pessoas.

Existem três níveis de permissão:
• Visualizador: a pessoa só pode ver (bom para enviar material de leitura).
• Comentador: pode ver e fazer comentários, mas não altera o conteúdo (bom para receber feedback).
• Editor: pode editar o arquivo (bom para trabalhos em grupo).

Dica: para provas e gabaritos, use "Visualizador". Para planejamento conjunto com colegas, use "Editor". Sempre pense: essa pessoa precisa apenas ver ou também mudar?`,
  },
  {
    title: "Gerar links de acesso e configurar quem pode abrir",
    body: `Em vez de adicionar e-mails um a um, você pode gerar um link. Clique em "Compartilhar" > "Alterar" (abaixo de 'Pessoas com acesso') e escolha quem pode abrir: "Restrito" (só quem você adicionar), "Qualquer pessoa com o link" ou "Toda a escola" (se tiver conta institucional).

Para os três primeiros, escolha também o papel (visualizador, comentador ou editor). Depois clique em "Copiar link" e envie por WhatsApp, Classroom ou e-mail.

Atenção: "Qualquer pessoa com o link" permite que o link seja reenviado. Para materiais confidenciais (provas), use "Restrito" e adicione apenas os e-mails necessários.`,
  },
  {
    title: "Revogar acesso e transferir propriedade de arquivos",
    body: `Para tirar o acesso de alguém, abra "Compartilhar", encontre a pessoa na lista e clique na seta ao lado do nome > "Remover acesso". A pessoa não conseguirá mais abrir o arquivo.

Para transferir a propriedade (útil quando um professor sai ou quando você cria um documento para a coordenação), clique na seta da pessoa > "Transferir propriedade". A partir daí, o novo dono controla o arquivo.

Dica: antes de transferir, copie o material se quiser manter uma versão sua. Depois da transferência, o controle é do novo dono.`,
  },
  {
    title: "Ver quem acessou e editou um arquivo",
    body: `O Drive registra a atividade dos arquivos. Abra o arquivo e, na barra de ferramentas, clique no ícone de pessoas ou em "Ferramentas" > "Histórico de revisões" (em documentos) para ver quem editou e quando.

No arquivo, o ícone com o rosto das pessoas mostra quem tem acesso. Em documentos e planilhas, clique em "Ver histórico de atividades" (ícone de relógio) para ver quem abriu, editou ou comentou.

Dica: se um trabalho em grupo sumiu, o histórico de revisões é seu melhor amigo — ele mostra quem editou o quê e permite restaurar versões anteriores.`,
  },
  {
    title: "Boas práticas de organização para compartilhamento escolar",
    body: `Uma boa organização no Drive evita o caos de "perdi o arquivo" e "mandei errado". A regra de ouro: cada arquivo tem um lugar certo e um nome claro.

Boas práticas:
• Crie a estrutura de pastas uma única vez (Ano > Turma > Disciplina).
• Sempre salve o arquivo já dentro da pasta correta.
• Compartilhe pastas inteiras, não arquivo por arquivo.
• Peça para os alunos criarem uma pasta do aluno e compartilharem com você.

Dica: combine com a equipe um padrão único. Quando todos usam a mesma estrutura, qualquer professor encontra o que precisa mesmo sem perguntar.`,
  },
  {
    title: "Sistema de pastas por ano, turma e disciplina",
    body: `Monte sua árvore de pastas assim:

Meu Drive
└── 2026
    ├── 1º Ano
    │   ├── Português
    │   ├── Matemática
    │   └── Atividades Extras
    ├── 2º Ano
    │   └── ...
    └── Planejamento
        ├── Reuniões
        └── Formações

Comece criando a pasta do ano, depois as turmas e, dentro de cada turma, as disciplinas. Siga essa mesma ordem sempre que criar algo novo.

Dica: use esta estrutura também para o Drive compartilhado da escola. A consistência entre todos os professores é o que torna a busca rápida.`,
  },
  {
    title: "Padrão de nomenclatura de arquivos",
    body: `Um bom nome de arquivo diz tudo em segundos. Use o padrão: [Ano-Turma] [Disciplina] [Tipo] [Tema] [Data].

Exemplos:
• 1A_Matematica_Prova_Geometria_2026-06-10
• 2B_Portugues_Atividade_Interpretacao_2026-06-12

Evite nomes como "final.docx", "prova definitiva (2) (3) (cópia)". Números no final de cópias geram confusão.

Dica: use letras maiúsculas nos nomes das categorias e hífen entre as informações. A data no formato AAAA-MM-DD faz a listagem ficar em ordem cronológica natural.`,
  },
  {
    title: "Usar cores e ícones em pastas",
    body: `As pastas do Drive podem ser coloridas — e isso é uma ferramenta visual poderosa. Clique com o botão direito na pasta > "Alterar cor" e escolha uma cor.

Crie seu próprio código de cores: vermelho = provas, azul = planejamento, verde = atividades de casa, amarelo = material de apoio. O cérebro processa cores mais rápido que palavras.

Dica: combine cor com o padrão de nomes. Uma pasta vermelha chamada "Provas" que você localiza em 1 segundo vale mais que dez pastas sem cor espalhadas pelo Drive.`,
  },
  {
    title: "Atalhos e arquivos marcados com estrela",
    body: `Dois recursos do Drive economizam cliques:
• Estrela (⭐): marque arquivos importantes clicando na estrela ao lado do nome. Eles aparecem na seção "Com estrela" do menu lateral.
• Atalho: um link para um arquivo que mora em outro lugar. Clique com o botão direito > "Adicionar atalho ao Drive" e escolha a pasta.

Use estrelas para os arquivos que você abre toda semana (chamada, planejamento atual). Use atalhos para ter um mesmo arquivo visível em duas pastas sem duplicá-lo.

Dica: atalhos não duplicam dados — se você editar o original, o atalho mostra a versão atualizada. Perfeito para o calendário escolar compartilhado.`,
  },
  {
    title: "Criar modelos reutilizáveis de documentos",
    body: `Modelos (templates) são arquivos que você copia toda vez que precisa, em vez de começar do zero. Crie um modelo de prova, um de plano de aula e um de comunicado aos pais.

Para usar: abra o arquivo original > "Arquivo" > "Fazer uma cópia" > renomeie e use. Guarde os modelos em uma pasta chamada "Modelos" para não confundi-los com arquivos de uso.

Dica: o Google Docs tem uma galeria oficial de modelos (docs.google.com/templates) com planos de aula prontos. Depois de personalizar um, guarde-o na sua pasta de Modelos.`,
  },
  {
    title: "Limpeza periódica de arquivos desnecessários",
    body: `Reserve 15 minutos por mês para organizar o Drive. Crie o hábito de: excluir versões antigas que foram substituídas, mover para a lixeira arquivos de anos passados que não precisa mais e esvaziar a lixeira quando tiver certeza.

O botão "Sugestões de limpeza" (na página de armazenamento) aponta arquivos grandes e duplicados que você pode apagar.

Dica: antes de limpar, pergunte-se "se eu precisar disso daqui a 1 ano, vou lembrar que existe?". Se a resposta for não, arquive em uma pasta "Arquivo 2025" em vez de excluir — é mais seguro.`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.2 Google Docs
// ──────────────────────────────────────────

const docsLessons: LessonData[] = [
  {
    title: "O que é o Google Docs e vantagens sobre o Word",
    body: `O Google Docs é um editor de textos online e gratuito. A diferença para o Word é que o documento fica na nuvem: você nunca mais precisa salvar, porque tudo é salvo automaticamente a cada segundo.

Vantagens para o professor:
• Acesso de qualquer lugar (escola, casa, celular).
• Vários professores editam o mesmo documento ao mesmo tempo.
• Comentários e sugestões para corrigir trabalhos sem apagar o texto do aluno.
• Histórico de versões para recuperar edições antigas.

Dica: esqueça o hábito de apertar Ctrl+S — no Docs não precisa. Tudo que você digita já está salvo.`,
  },
  {
    title: "Criar, nomear e organizar documentos",
    body: `Para criar um documento, abra o Drive, clique em "Novo" > "Documentos Google". Um documento em branco abre em uma nova aba — e já começa com o nome "Documento sem título".

Clique no título (canto superior esquerdo) para renomear na hora. Use o padrão que aprendemos: Turma_Tipo_Tema_Data. Depois, mova o documento para a pasta certa com o botão "Mover" (📁) ao lado do título.

Dica: dê o nome antes de escrever. Assim, se você abrir vários documentos, sabe qual é qual e não perde nada.`,
  },
  {
    title: "Formatação básica: fonte, tamanho, negrito, itálico",
    body: `A barra de ferramentas do Docs é parecida com a do Word. Selecione o texto e use:
• Fonte e tamanho: caixa com o nome da fonte (ex: Arial) e o número do tamanho.
• Negrito (B), Itálico (I) e Sublinhado (U): deixam o texto destacado.
• Cor do texto: botão com o "A" colorido.

Dica: para provas e materiais impressos, prefira fontes sem serifa (Arial, Calibri) tamanho 12, com título em negrito. Texto fácil de ler é mais fácil de avaliar.`,
  },
  {
    title: "Parágrafos, alinhamento e espaçamento",
    body: `O Docs oferece quatro alinhamentos na barra de ferramentas: à esquerda (padrão), centralizado, à direita e justificado. Para títulos, use centralizado; para textos longos, justificado fica com aparência de livro.

Para espaçamento entre linhas, clique no ícone de linhas com setas (ou "Formato" > "Espaçamento entre linhas") e escolha 1,5 ou 2 — mais confortável de ler e corrigir.

Dica: use Enter apenas para novo parágrafo, não para pular linhas. Ajuste o espaço com as ferramentas certas — o documento fica profissional e não "quebra" na impressão.`,
  },
  {
    title: "Inserir imagens, links e tabelas",
    body: `Para inserir uma imagem: "Inserir" > "Imagem" e escolha a origem (do computador, da web, do Drive). Para um link: selecione o texto, clique no ícone de corrente (🔗) e cole o endereço. Para uma tabela: "Inserir" > "Tabela" e arraste para escolher linhas x colunas.

Tabelas são ótimas para planos de aula, listas de chamada simplificadas e gabaritos. Clique na tabela para adicionar ou remover linhas com o botão direito.

Dica: para colar uma imagem direto, você pode copiar do navegador e colar (Ctrl+V) no documento — sem precisar salvar no computador antes.`,
  },
  {
    title: "Cabeçalho, rodapé e numeração de páginas",
    body: `Clique duas vezes no topo da primeira página para abrir o cabeçalho — ali você escreve o nome da escola, disciplina e professor, que se repete em todas as páginas. Clique duas vezes no rodapé para colocar a numeração.

Para números de página automáticos: com o cursor no rodapé, "Inserir" > "Número de página" e escolha o formato.

Dica: use o cabeçalho para identificar provas: "Escola Municipal X — 1º Ano A — Matemática — 3º Bimestre". Assim, páginas soltas na impressão nunca perdem a identificação.`,
  },
  {
    title: "Estilos de título e sumário automático",
    body: `Os estilos de título são o recurso mais subestimado do Docs. Em vez de só aumentar a fonte, selecione o texto e escolha "Título 1", "Título 2" ou "Título 3" no menu suspenso da barra (padrão "Texto normal").

Com títulos aplicados, você cria um sumário automático: "Inserir" > "Sumário" e escolha o estilo com links. O sumário atualiza sozinho e permite clicar para pular direto para a seção.

Dica: use Título 1 para capítulos e Título 2 para seções. Além do sumário, esses títulos ajudam o Docs a navegar pelo documento pelo painel de "Marcadores" (ícone de listra à esquerda).`,
  },
  {
    title: "Ditar texto por voz",
    body: `Cansou de digitar? O Docs escreve por você. Vá em "Ferramentas" > "Digitação por voz" (ou atalho Ctrl+Shift+S no navegador) e clique no microfone que aparece. Fale — e o texto é digitado em tempo real.

Funciona bem para rascunhar: você fala o texto, e depois só ajusta a formatação e a pontuação. Fale pausadamente e diga a pontuação quando precisar ("ponto", "vírgula", "nova linha").

Dica: a digitação por voz respeita o idioma configurado no Docs. Verifique se está em "Português (Brasil)" no menu do microfone para acentuação correta.`,
  },
  {
    title: "Baixar como PDF ou Word",
    body: `Para entregar o material pronto em outro formato: "Arquivo" > "Baixar" > "Documento PDF (.pdf)" ou "Word (.docx)". O PDF é o formato mais seguro para enviar aos pais e imprimir — nada se desconfigura.

Use o Word (.docx) quando precisar que outra pessoa edite com o Word tradicional. Lembre-se: depois de baixar, as edições são feitas no arquivo local, não no Docs.

Dica: para enviar um material sem dar chance de edição, baixe em PDF. Para colaborar, compartilhe o link do Docs — muito melhor que ficar enviando arquivos por e-mail.`,
  },
  {
    title: "Usar modelos prontos (templates)",
    body: `O Google oferece modelos prontos para economizar tempo. Em docs.google.com, clique em "Galeria de modelos" (no topo) e explore: currículos, cartas, relatórios, planos de aula e muito mais.

Para usar, basta clicar em um modelo — ele abre como um documento seu, pronto para personalizar. Também é possível criar seus próprios modelos: monte o arquivo e guarde em uma pasta "Modelos"; quando precisar, use "Arquivo" > "Fazer uma cópia".

Dica: crie modelos de plano de aula, roteiro de reunião e comunicado aos pais. Cada cópia nova é feita em segundos, e todos os modelos mantêm o mesmo padrão visual.`,
  },
  {
    title: "Compartilhar documento com alunos e colegas",
    body: `Para compartilhar: clique no botão azul "Compartilhar" (canto superior direito), adicione os e-mails ou gere um link. Escolha a permissão: visualizador (só leitura), comentador (dá feedback) ou editor (pode mudar).

Para a turma inteira, o melhor caminho é gerar o link com "Qualquer pessoa com o link" e enviar no Classroom ou WhatsApp. Para correção individual, adicione o e-mail de cada aluno como "Comentador".

Dica: compartilhe com permissão de comentar para atividades de redação — o aluno escreve, você comenta ao lado, e ninguém apaga o trabalho do outro.`,
  },
  {
    title: "Editar o mesmo documento com colegas simultaneamente",
    body: `Vários professores podem editar o mesmo documento ao mesmo tempo — é como um trabalho em equipe em tempo real. Cada pessoa vê as edições das outras quase instantaneamente.

O contador de pessoas (ícones de rosto no topo direito) mostra quem está online. Para ver o cursor de um colega, clique no rosto dele — o Docs pula para onde ele está editando.

Dica: quando planejar uma reunião pedagógica colaborativa, compartilhe o documento como "Editor" com antecedência e combinem de preencher cada um uma seção. A ata da reunião nasce pronta!`,
  },
  {
    title: "Identificar quem está editando pelo cursor colorido",
    body: `Cada pessoa que edita o documento ganha um cursor com uma cor única e o nome dela. Assim, você vê em tempo real quem está digitando o quê.

Para saber quem tem qual cor, clique no ícone dos rostos no topo da tela. O Docs mostra a lista de pessoas online com a cor do cursor de cada uma.

Dica: em trabalhos colaborativos, combine com o grupo: "cada um edita uma parte". As cores dos cursores ajudam você a perceber quando alguém mexeu na sua parte — e a conversar pelo chat (ícone de balão) sem sair do documento.`,
  },
  {
    title: "Usar comentários para dar e receber feedback",
    body: `Comentários são anotações que não alteram o texto. Selecione o trecho do aluno, clique no ícone de balão de comentário (💬) na barra lateral ou use o atalho Ctrl+Alt+M, escreva e clique em "Comentar".

O aluno vê o trecho destacado com seu comentário ao lado e pode responder — criando uma conversa dentro do documento. É a forma mais educativa de corrigir redações, porque o aluno aprende onde está o problema.

Dica: em vez de reescrever a frase do aluno, comente com uma pergunta: "Releia este parágrafo: a ideia está clara?". O aluno reflete e corrige sozinho — aprende muito mais.`,
  },
  {
    title: "Sugerir alterações sem editar diretamente",
    body: `O modo "Sugerir" é o modo de correção respeitosa: em vez de apagar o texto do aluno, suas alterações aparecem como sugestões coloridas. Ative em "Modo de edição" (canto superior direito) > "Sugerir".

Cada sugestão aparece como texto riscado (o que sairia) com texto verde (o que entraria). O aluno decide se aceita ou rejeita cada uma.

Dica: use "Sugerir" em vez de "Editar" quando for corrigir o trabalho do aluno. Ele vê exatamente o que você mudaria e por quê — e participa da decisão.`,
  },
  {
    title: "Aceitar ou rejeitar sugestões",
    body: `Quando um documento tem sugestões, você decide o destino de cada uma. Clique no balão de comentário da sugestão e use o ícone de visto (✓ aceitar) ou de X (✕ rejeitar).

Para aceitar todas de uma vez: menu de sugestões (ícone de caneta com marca de visto no topo) > "Aceitar todas". Para rejeitar todas: "Rejeitar todas".

Dica: antes de "Aceitar todas", revise cada sugestão — o professor pode ter proposto algo que não combina com sua intenção. Em trabalhos de alunos, o aceitar/rejeitar é uma ótima conversa pedagógica.`,
  },
  {
    title: "Histórico de versões e como restaurar versões anteriores",
    body: `O Docs guarda todo o histórico do documento. Clique em "Arquivo" > "Histórico de versões" > "Ver histórico de versões". No painel direito, você vê todas as edições com data, hora e autor.

Para voltar a uma versão antiga, clique nela e depois em "Restaurar esta versão". O documento volta exatamente ao estado daquele momento. O histórico não desaparece: as versões mais novas continuam registradas.

Dica: use o histórico quando um trabalho em grupo "sumir" com partes importantes, ou quando você quiser mostrar ao aluno a evolução da escrita dele ao longo do bimestre.`,
  },
  {
    title: "Trabalho em grupo de alunos com um único documento",
    body: `Um único documento compartilhado pode ser o espaço de trabalho de um grupo inteiro. Cada aluno adiciona sua parte, com sua cor de cursor, e tudo fica salvo automaticamente.

Organize assim: crie o documento, divida o conteúdo em seções com títulos, e dê a cada aluno sua seção ("João escreve a Introdução, Maria o Desenvolvimento, Pedro a Conclusão").

Dica: crie o documento com o nome dos integrantes no título ("Trabalho_Geometria_Grupo3"). Cada aluno usa sua própria conta Google — assim o histórico mostra quem fez o quê, e a avaliação do trabalho em grupo fica mais justa.`,
  },
  {
    title: "Boas práticas para não sobrescrever o trabalho de outros",
    body: `Trabalho colaborativo exige cuidado para ninguém perder o que já foi feito:
• Cada um edita a sua seção (combinem antes quem fica com o quê).
• Use "Sugerir" quando mexer na parte de outra pessoa.
• Evite copiar e colar blocos inteiros de texto por cima do que já existe.
• Comente antes de grandes mudanças: "vou reorganizar o 2º parágrafo".

Se algo der errado, não entre em pânico: o histórico de versões recupera qualquer edição perdida.

Dica: combinem um "editor final" — a pessoa que dá o veredito final sobre o texto pronto antes da entrega. Evita o famoso "todo mundo editou ao mesmo tempo e virou uma bagunça".`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.3 Google Apresentações
// ──────────────────────────────────────────

const slidesLessons: LessonData[] = [
  {
    title: "Diferença entre Google Apresentações e PowerPoint",
    body: `O Google Apresentações (Google Slides) é o irmão online do PowerPoint. As diferenças principais: tudo salvo na nuvem automaticamente, acesso de qualquer dispositivo, colaboração em tempo real e uso gratuito.

Para o professor, o diferencial é prático: o slide que você preparou em casa está pronto na lousa digital da escola, e o colega pode ajudar a revisar sem receber arquivo por e-mail.

Dica: você pode abrir um arquivo .pptx existente no Google Apresentações — "Arquivo" > "Abrir" > "Upload" — e continuar editando normalmente, sem precisar converter.`,
  },
  {
    title: "Criar uma apresentação do zero",
    body: `No Drive, clique em "Novo" > "Apresentações Google". Abre uma apresentação em branco com o primeiro slide.

Dê um nome ao arquivo clicando no título no topo. Para adicionar slides, use o botão "+" na barra superior ou o menu "Slide" > "Novo slide".

Dica: comece sempre pelo esqueleto: slide 1 = título da aula, slide 2 = objetivos, slides seguintes = conteúdo, último = atividades/para casa. Esse roteiro de aula já nasce organizado.`,
  },
  {
    title: "Escolher e personalizar temas visuais",
    body: `Temas dão cara nova à apresentação com um clique. No painel lateral direito, clique em "Tema" e escolha um dos disponíveis — cada um tem cores e fontes próprias.

Para personalizar: "Slide" > "Editar tema" permite mudar as cores de fundo, fontes e o design dos títulos de todos os slides de uma vez.

Dica: escolha um tema com fundo claro e texto escuro — é o que tem melhor contraste na lousa digital, mesmo no fim da tarde com cortinas abertas.`,
  },
  {
    title: "Adicionar e organizar slides",
    body: `Para adicionar: botão "+" na barra ou menu "Slide" > "Novo slide". Para reorganizar, arraste as miniaturas dos slides no painel esquerdo para a posição desejada.

Para excluir um slide: clique com o botão direito na miniatura > "Excluir". Para duplicar (útil quando os slides têm o mesmo layout): botão direito > "Duplicar slide".

Dica: use o painel esquerdo como seu roteiro. Ao arrastar os slides, você reorganiza a sequência da aula em segundos, sem recriar nada.`,
  },
  {
    title: "Inserir texto, imagens, vídeos e GIFs",
    body: `Cada slide tem caixas de texto prontas — clique duas vezes e digite. Para mais conteúdo: "Inserir" > "Caixa de texto", desenhe a caixa e escreva.

Imagens: "Inserir" > "Imagem" > "Pesquisar na web" (busca direto sem sair do slide) ou "Fazer upload". Vídeos: "Inserir" > "Vídeo" e cole o link do YouTube — ele toca dentro do próprio slide. GIFs animados também funcionam como imagens.

Dica: regra do slide: poucas palavras, ideia central. Slides servem de apoio visual — quem fala é você. Textos longos no slide fazem a turma ler em vez de ouvir.`,
  },
  {
    title: "Trabalhar com layouts de slide",
    body: `Layouts são moldes prontos de organização do conteúdo. No menu "Slide" > "Aplicar layout", escolha entre: título + texto, título + duas colunas, título + imagem, só título, etc.

O layout certo economiza trabalho de arrastar caixas. Por exemplo, o layout "Título e duas colunas" é perfeito para comparar (antes/depois, vantagens/desvantagens).

Dica: ao criar um slide novo, escolha o layout logo em seguida. É muito mais rápido que montar a estrutura na mão em todo slide.`,
  },
  {
    title: "Transições e animações básicas",
    body: `Transições são os efeitos ao trocar de slide; animações são os efeitos dentro de um mesmo slide (um texto que aparece após o outro).

Transição: selecione o slide > "Inserir" > "Transição" (ou o painel direito) e escolha o efeito. Animação: selecione o elemento (texto ou imagem) > "Inserir" > "Animação" e defina como aparece.

Dica: use transições discretas ("Aparecer" ou "Desvanecer") — efeitos chamativos distraem a turma do conteúdo. E use animações de "clique" para revelar respostas uma a uma em perguntas orais.`,
  },
  {
    title: "Inserir links e botões de navegação",
    body: `Você pode transformar qualquer elemento do slide em um link. Selecione o texto ou imagem > botão de corrente (🔗) > cole o endereço de uma página, de outro slide da apresentação ou até de um arquivo do Drive.

Links úteis: para a aula, um slide "Menu" com links para cada seção vira um índice clicável — a turma escolhe a ordem. Botões para o próximo slide ou voltar ao início ajudam em jogos de revisão.

Dica: crie um "slide-quiz" com links: pergunta de um lado, e respostas em slides separados ("Resposta certa ✅" / "Tente de novo ❌"). Vira um jogo interativo na lousa sem instalar nada.`,
  },
  {
    title: "Modo apresentador com notas de apoio",
    body: `As notas do apresentador são o seu texto de apoio invisível. Em cada slide, clique em "Clique para adicionar notas" (embaixo do slide) e escreva o que você quer falar, dados, lembretes.

Na hora de apresentar, clique em "Apresentar" e depois no ícone de engrenagem > "Modo de apresentador". Você vê as notas, o próximo slide e um cronômetro — mas a turma só vê o slide.

Dica: o modo apresentador no computador conectado à lousa funciona com o "Apresentar" normal; se tiver um segundo monitor ou um celular, use a versão "Apresentador" para ver as notas sem a turma perceber.`,
  },
  {
    title: "Apresentar diretamente pelo navegador",
    body: `Não precisa de programa instalado: clique no botão "Apresentar" (canto superior direito) e a apresentação abre em tela cheia no navegador.

Use as setas do teclado para navegar, a tecla "F" para tela cheia, e "?" para ver todos os atalhos. Para sair, pressione Esc.

Dica: teste sempre a apresentação no computador da sala ANTES da aula. Abra o navegador, entre no Drive e deixe o slide pronto — evita a espera constrangedora de 5 minutos na frente da turma.`,
  },
  {
    title: "Publicar apresentação na web",
    body: `"Arquivo" > "Compartilhar" > "Publicar na web" gera um link público para sua apresentação. Quem abrir o link vê os slides em tela cheia, sem precisar de conta Google.

Isso é útil para: enviar a aula para alunos que faltaram, divulgar material de estudo em sites da escola, ou incorporar a apresentação em uma página.

Dica: ao publicar, use "Iniciar automaticamente a apresentação" se quiser que abra já em modo apresentação. Cuidado: o link público mostra tudo — revise antes se há conteúdo que não deve ser público.`,
  },
  {
    title: "Compartilhar apresentação com alunos e colegas",
    body: `Para compartilhar: botão "Compartilhar" (azul, no topo direito) > adicionar e-mails ou copiar link. Como sempre, escolha: Visualizador (só ver), Comentador (comentar) ou Editor (editar).

Para a turma: link com "Qualquer pessoa com o link" na permissão Visualizador — os alunos assistem em casa sem conseguir mexer no material. Para um colega que vai apresentar sua aula: permissão de Editor.

Dica: envie o link da apresentação no Classroom após a aula. O aluno que faltou acompanha o conteúdo e você não precisa refazer a aula particular.`,
  },
  {
    title: "Edição colaborativa de apresentações em equipe",
    body: `Vários professores podem montar a mesma apresentação ao mesmo tempo, como nos documentos. Cada um edita seus slides, com cursores coloridos identificando quem é quem.

Na prática: na preparação da semana pedagógica, cada professor cria os slides da sua parte dentro da mesma apresentação, e o resultado final já nasce pronto e unificado.

Dica: crie a apresentação compartilhada com antecedência e combine os "donos" de cada seção de slides. Na reunião, é só apresentar — tudo já está montado e revisado.`,
  },
  {
    title: "Comentários e feedback em slides",
    body: `Os comentários funcionam igual ao Docs: selecione um elemento do slide, clique no balão de comentário (💬) e escreva. O colega responde dentro da própria apresentação.

Use comentários para: pedir revisão de um slide ("fica melhor com mais exemplo?"), responder sugestões da coordenação, ou dar feedback para alunos que montam apresentações em grupo.

Dica: em trabalhos de alunos, crie a apresentação do grupo como "Editor" para todos e peça que cada um comente o slide do outro antes de apresentar. O feedback entre pares melhora muito o resultado final.`,
  },
  {
    title: "Trabalho em grupo: alunos criando apresentações juntos",
    body: `Os alunos podem montar apresentações em grupo usando um único arquivo compartilhado. Cada aluno acessa com sua conta, adiciona seus slides e vê o trabalho dos colegas em tempo real.

Organize: defina o tema, divida em subtemas (um por aluno), e peça para cada um criar seus slides com nome visível no rodapé. O histórico de versões mostra quem fez o quê.

Dica: peça um slide final com "Referências" para cada grupo. Isso ensina autoria e facilita sua avaliação da pesquisa de cada um.`,
  },
  {
    title: "Permissões de edição vs visualização para a turma",
    body: `Ao compartilhar com a turma, a permissão muda tudo:
• Visualizador: aluno só assiste — ideal para conteúdo da aula.
• Comentador: aluno comenta — bom para atividades de opinião.
• Editor: aluno edita — usado só para trabalhos em grupo.

Regra prática: material de aula = visualizador. Atividade individual = comentador. Trabalho em grupo = editor (e apenas para os integrantes).

Dica: se um trabalho em grupo deve ser avaliado com "quem fez o quê", compartilhe como Editor mas peça que cada aluno assine seus slides com o nome — e verifique o histórico de versões no final.`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.4 Google Forms
// ──────────────────────────────────────────

const formsLessons: LessonData[] = [
  {
    title: "O que é o Google Forms e usos na educação",
    body: `O Google Forms cria formulários, pesquisas e provas online. O professor monta as perguntas, envia o link para os alunos, e as respostas chegam automaticamente organizadas em uma planilha.

Usos na educação: provas online com correção automática, questionários de fixação, pesquisa de opinião da turma, inscrições para eventos, avaliação da própria aula (feedback).

Dica: o Forms é o "termômetro" da sala. Uma pesquisa de 3 perguntas no fim da aula ("o que ficou difícil?") muda completamente seu planejamento da semana seguinte.`,
  },
  {
    title: "Criar um formulário do zero",
    body: `No Drive, clique em "Novo" > "Formulários Google". Abre um formulário sem título com a primeira pergunta.

Dê um título e uma descrição (ex: "Quiz de História — 7º Ano — Capítulo 3"). Cada pergunta é adicionada pelo botão "+" do menu lateral direito.

Dica: comece com uma pergunta de identificação ("Nome completo") para saber de quem é cada resposta — em provas online, é essencial.`,
  },
  {
    title: "Tipos de pergunta: múltipla escolha, dissertativa, escala, grade",
    body: `Cada pergunta tem um tipo, escolhido no menu ao lado dela:
• Múltipla escolha: o aluno escolhe uma opção — ideal para provas.
• Caixas de seleção: pode marcar várias — bom para "quais temas você domina?".
• Resposta curta / Parágrafo: texto livre — para dissertativas.
• Escala linear: de 1 a 5 — para avaliações (ex: "como você avalia a aula?").
• Grade de múltipla escolha: tabela de várias linhas com as mesmas opções — perfeita para gabaritos de questões.

Dica: misture os tipos. Prova com múltipla escolha + uma parágrafo dá agilidade na correção e profundidade na avaliação.`,
  },
  {
    title: "Inserir imagens e vídeos nas perguntas",
    body: `O Forms permite enriquecer perguntas com mídia. No menu lateral direito de cada pergunta, há o ícone de imagem 🖼️ e de vídeo ▶️.

Use imagens para: questões de interpretação (mostre o texto/foto e pergunte), mapas para localizar, gráficos para analisar. Vídeos do YouTube podem ser anexados para questões sobre o conteúdo assistido.

Dica: em provas com figuras, o Forms organiza tudo: a imagem fica junto da pergunta, sem impressão colorida cara. E cada aluno pode ampliar a imagem no próprio dispositivo.`,
  },
  {
    title: "Organizar perguntas por seções",
    body: `Seções dividem o formulário em blocos com títulos próprios — como capítulos de um livro. Use o menu lateral direito > ícone de duas faixas "Adicionar seção".

Na prova, use seções: "Identificação", "Parte A — Múltipla Escolha", "Parte B — Dissertativa". O aluno vê um bloco por vez, com barra de progresso.

Dica: use uma seção por assunto (ex: "Capítulo 1", "Capítulo 2"). Além de organizar, você consegue ver no resultado o desempenho por seção — e identificar exatamente onde a turma tem mais dificuldade.`,
  },
  {
    title: "Lógica condicional: mostrar perguntas por resposta",
    body: `A lógica condicional (ou ramificação) mostra perguntas diferentes dependendo da resposta anterior — o formulário "se adapta" ao aluno.

Ative em: "Configurações" (engrenagem) > "Apresentação" > "Ir para a seção com base na resposta". Depois, em cada opção da pergunta, escolha para qual seção ir.

Exemplo: "Você assistiu ao vídeo?" — "Sim" → vai para as perguntas do vídeo; "Não" → vai para "assista primeiro e volte". 

Dica: a ramificação evita perguntas irrelevantes e deixa o formulário curto e inteligente. Comece simples: uma pergunta de "sim/não" que leva a caminhos diferentes.`,
  },
  {
    title: "Configurar formulário como quiz com gabarito",
    body: `Para transformar o formulário em prova com nota: "Configurações" (engrenagem) > aba "Quiz" > ative "Fazer deste um questionário".

Agora cada pergunta de múltipla escolha ganha a opção "Gabarito". Clique em "Gabarito" na pergunta, marque a resposta correta e defina quantos pontos ela vale.

Dica: defina os pontos de forma que a soma feche um valor redondo (ex: 10 questões de 1 ponto = 10). E ative "Publicar a nota após a classificação manual" se quiser revisar antes de divulgar.`,
  },
  {
    title: "Feedback automático por questão",
    body: `Com o quiz ativado, você pode escrever um feedback que o aluno vê logo após responder: em "Gabarito" na pergunta, use os campos "Feedback para resposta correta" e "Feedback para resposta incorreta".

Exemplo: pergunta errada → "Quase! Releia o texto sobre os rios, seção 2." O aluno aprende no momento do erro, sem esperar a correção.

Dica: em vez de só dizer "errado", dê uma dica curta no feedback incorreto. Transforma o quiz em uma ferramenta de estudo, não só de avaliação.`,
  },
  {
    title: "Definir pontuação e nota automática",
    body: `No quiz, cada pergunta vale os pontos que você definir. A nota final é calculada automaticamente e enviada ao aluno (se ativado) quando ele envia as respostas.

Em "Configurações" > "Quiz": ative "Publicar a nota" e escolha quando: "imediatamente após o envio" ou "mais tarde, após a revisão manual". Você também pode permitir que o aluno veja quais questões errou.

Dica: para prova valendo nota, use "após a revisão manual" e confira as dissertativas antes de liberar a nota. Para treino/quiz de estudo, libere "imediatamente" — o feedback instantâneo é o grande ganho.`,
  },
  {
    title: "Limitar respostas e definir prazo",
    body: `Você controla quem responde e quando: "Configurações" > "Respostas" > ative "Limitar a 1 resposta" (cada pessoa responde uma única vez) e "Coletar endereços de e-mail" para saber quem respondeu.

Para prazo: ative "Aceitar respostas" e defina a data de encerramento — depois dela, ninguém mais responde. Útil para provas com data fixa.

Dica: combinado: "Limitar a 1 resposta" + "Coletar e-mail" = prova identificada e sem duplicidade. Em provas, considere também o ícone de cadeado (🔒) em "Configurações" para exigir login com a conta da escola.`,
  },
  {
    title: "Ver respostas em tempo real",
    body: `Enquanto os alunos respondem, você acompanha ao vivo. Na aba "Respostas" do formulário, há um resumo com gráficos de cada pergunta, atualizado em tempo real.

Você vê: quantos já responderam, a distribuição das respostas em gráficos de pizza/barra, e a lista individual na aba "Individual".

Dica: projete a aba "Respostas" na lousa durante um quiz ao vivo — a turma vê o placar das respostas surgir na hora. Vira um jogo coletivo e você identifica na hora qual questão gerou dúvida.`,
  },
  {
    title: "Exportar respostas para planilha",
    body: `Cada resposta pode ir automaticamente para uma planilha do Google. Na aba "Respostas", clique no ícone de planilha (📊) — o Forms cria um "Google Sheets" com todos os dados, organizados em colunas.

A partir daí, use o Planilhas para: calcular médias com fórmulas, fazer gráficos, filtrar por turma, ou simplesmente arquivar as respostas de todas as provas.

Dica: deixe o Forms criar a planilha automaticamente desde o início (ícone de planilha > "Criar planilha"). Assim, todo quiz que você fizer já nasce com seu banco de respostas pronto para análise.`,
  },
  {
    title: "Compartilhar formulário com alunos via link ou Classroom",
    body: `Para enviar: clique em "Enviar" (topo direito). Você pode copiar o link, enviar por e-mail, gerar um QR Code (os alunos escaneiam com o celular!) ou compartilhar direto no Classroom.

No Classroom: crie uma atividade do tipo "Pergunta" ou cole o link na tarefa — os alunos abrem, respondem e a entrega fica registrada.

Dica: o QR Code é mágico para a sala de aula: projete na lousa e os alunos escaneiam com o celular, sem digitar endereço. Encontre a opção em "Enviar" > ícone de QR.`,
  },
  {
    title: "Restringir acesso a usuários específicos",
    body: `Para garantir que só sua turma responda: "Configurações" (engrenagem) > "Coleta de e-mail" > ative "Restrito a usuários de ORGANIZACAO.edu.br" (funciona com contas da escola) ou "Restrito a usuários da escola".

Com o restrito ativado, o aluno precisa estar logado na conta da escola para responder — quem não for da escola não consegue nem abrir.

Dica: em provas, ative a restrição + limite de 1 resposta + coleta de e-mail. É o tripé de segurança: só a turma entra, cada aluno responde uma vez, e você sabe quem respondeu.`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.5 Google Planilhas
// ──────────────────────────────────────────

const sheetsLessons: LessonData[] = [
  {
    title: "O que é uma planilha e para que serve na educação",
    body: `Uma planilha é uma tabela gigante de linhas e colunas que organiza dados e faz cálculos automaticamente. Cada célula (cruzamento de linha com coluna) guarda um número ou texto.

Na educação, a planilha é o melhor amigo do professor: notas, frequência, médias, contagem de entregas, calendário de conteúdos. Tudo que você controla com papel e calculadora pode viver em uma planilha.

Dica: comece pensando "o que eu anoto hoje em papel?" — lista de notas, chamada, entregas. Cada uma dessas listas pode virar uma aba da sua planilha mestre.`,
  },
  {
    title: "Interface do Google Planilhas",
    body: `No Drive, "Novo" > "Planilhas Google" abre a planilha. Você vê: barra de ferramentas no topo, a "barra de fórmulas" (fx) logo abaixo, e a grade de células (colunas A, B, C... linhas 1, 2, 3...).

As abas ficam embaixo: a primeira se chama "Planilha1". Clique com o botão direito na aba para renomear, duplicar ou mudar a cor.

Dica: renomeie a primeira aba para algo útil ("Notas 1º Bim") e crie novas abas para cada assunto. Uma planilha com abas organizadas é um sistema completo de controle.`,
  },
  {
    title: "Inserir e formatar dados básicos",
    body: `Clique em uma célula e digite — o conteúdo aparece. Pressione Enter para descer, Tab para ir para a direita. Para copiar, use Ctrl+C / Ctrl+V como sempre.

Numéricos: digite "7,5" e a célula guarda o número 7,5. Texto: escreva normalmente. Datas: digite 10/06/2026.

Dica: use a primeira linha para títulos de coluna (Nome, Prova 1, Prova 2, Média) e deixe a primeira coluna para os nomes dos alunos. Essa estrutura simples já é uma planilha de notas funcional.`,
  },
  {
    title: "Formatação de células: cor, borda, tamanho",
    body: `Selecione as células e use a barra de ferramentas: cor de preenchimento (balde de tinta 🪣), cor do texto (A colorido), bordas (ícone de quadrado com linhas) e fonte/tamanho.

Formatação prática: título em negrito com fundo colorido, células de nota com borda, média destacada em cor diferente.

Dica: colorir o cabeçalho e as colunas de nota não é enfeite — é organização visual. Você localiza a informação com um olhar, mesmo com 40 alunos na lista.`,
  },
  {
    title: "Fórmulas básicas: SOMA, MÉDIA, MÁXIMO, MÍNIMO",
    body: `As fórmulas são a mágica da planilha. Sempre começam com "=". Exemplos:
• =SOMA(A1:A10) — soma os números das células A1 até A10.
• =MÉDIA(A1:A10) — calcula a média.
• =MÁXIMO(A1:A10) — maior valor.
• =MÍNIMO(A1:A10) — menor valor.

Digite a fórmula na célula e pressione Enter — o resultado aparece na hora. Para aplicar a mesma fórmula na linha de baixo, arraste a alça azul no canto da célula.

Dica: na sua planilha de notas, a última coluna pode ser =MÉDIA(D2:F2) para cada aluno. Arraste para baixo e todas as médias saem de uma vez.`,
  },
  {
    title: "Fórmula de média ponderada para notas",
    body: `Nem toda média é simples — com pesos, usamos a fórmula:
=SOMA(SOMARPRODUTO(D2:F2; {1; 2; 3}))/SOMA(1;2;3)

Ou, de forma mais simples com "SOMARPRODUTO": multiplique cada nota pelo peso, some tudo e divida pela soma dos pesos. Exemplo para pesos 1, 2 e 3:
=SOMARPRODUTO(D2:F2; {1; 2; 3})/6

Dica: o separador de argumentos pode ser vírgula ou ponto e vírgula, dependendo do idioma da planilha. Teste digitando =SOMA(2;2) — se der erro, troque a vírgula por ponto e vírgula (ou vice-versa).`,
  },
  {
    title: "Congelar linhas e colunas",
    body: `Congelar (fixar) mantém linhas ou colunas sempre visíveis ao rolar. É essencial quando a lista de alunos passa de 20: sem congelar, o cabeçalho "desaparece" ao rolar para baixo.

Como fazer: "Exibir" > "Fixar" > "1 linha" (ou 2 linhas / até a coluna A). A linha de títulos fica parada, e você rola as notas tranquilamente.

Dica: fixe sempre a linha do cabeçalho e a coluna dos nomes. Assim, qualquer linha que você olhar mostra de quem é a nota — sem errar a coluna na hora de lançar.`,
  },
  {
    title: "Filtros e ordenação de dados",
    body: `O filtro permite "esconder" o que você não quer ver: selecione os dados > ícone de funil (ou "Dados" > "Criar filtro"). Aparecem setinhas no cabeçalho de cada coluna — clique para filtrar ou ordenar.

Exemplos: ordenar por nome (A-Z), filtrar só quem tirou nota abaixo de 6, ordenar a chamada por número. A ordenação também está no clique direito: "Classificar a planilha por coluna A (A a Z)".

Dica: para ver "quem está abaixo da média", filtre a coluna Média com "Menor que" 6. Em segundos, a planilha mostra exatamente quais alunos precisam de atenção.`,
  },
  {
    title: "Formatação condicional: destacar notas abaixo da média",
    body: `A formatação condicional muda a cor da célula automaticamente conforme o valor. "Formato" > "Formatação condicional" > escolha a faixa de células e a regra.

Exemplo: "Menor que 6" → fundo vermelho; "Entre 6 e 8" → amarelo; "Maior ou igual a 8" → verde. A planilha pinta sozinha conforme você lança as notas.

Dica: com a formatação condicional, a planilha vira um painel visual: vermelho = recuperação, verde = ótimo. Uma olhada rápida e você já sabe quem procurar antes da reunião de conselho.`,
  },
  {
    title: "Criar gráficos simples a partir de dados",
    body: `Gráficos transformam números em imagem. Selecione os dados (ex: coluna de nomes + coluna de médias) > "Inserir" > "Gráfico". O Planilhas sugere o melhor tipo automaticamente.

Tipos úteis: barras (comparar turmas), pizza (distribuição), linha (evolução ao longo do tempo). Edite pelo painel lateral: título, cores, tipo.

Dica: um gráfico de barras com a média de cada turma vale mais que 10 relatórios escritos na reunião pedagógica. E no Planilhas, o gráfico se atualiza sozinho quando você muda os dados.`,
  },
  {
    title: "Planilha de frequência e chamada",
    body: `Monte sua chamada digital: coluna A = nomes, e uma coluna para cada dia de aula. Marque presença com "P", falta com "F", atraso com "A".

No final, use =CONT.SE(intervalo;"P") para contar presenças, =CONT.SE(intervalo;"F") para faltas. O percentual de frequência = total de presenças / total de aulas.

Dica: com a chamada no Planilhas, você calcula a frequência de cada aluno e da turma em segundos, e pode até imprimir a lista final do bimestre. Nunca mais some faltas na mão.`,
  },
  {
    title: "Proteger células para não editar acidentalmente",
    body: `Você pode travar células para ninguém (nem você) alterar por acidente: selecione as células > clique direito > "Proteger células" > defina quem pode editar.

Útil para: fórmulas de média (evita que um lançamento errado apague a fórmula), notas já lançadas, ou a coluna do cálculo final.

Dica: proteja as colunas de fórmula e deixe abertas só as colunas de lançamento. Se um colega mexer na sua planilha, ele pode lançar notas mas não quebrar as fórmulas.`,
  },
  {
    title: "Compartilhar planilha com coordenação e equipe pedagógica",
    body: `Compartilhe como qualquer arquivo do Drive: botão "Compartilhar" > adicione os e-mails da coordenação. A coordenação acompanha as notas em tempo real, sem você precisar enviar nada.

Lembre-se das permissões: Visualizador para a coordenação só acompanhar, Comentador para dar retorno, Editor para quem lança junto com você.

Dica: compartilhe a planilha de notas como Visualizador com a coordenação — elas acompanham o progresso da turma ao longo do bimestre, e a conversa na reunião de conselho já chega com os dados na mão.`,
  },
  {
    title: "Definir quem pode editar e quem só pode visualizar",
    body: `No botão "Compartilhar", cada pessoa recebe um papel: Visualizador (vê tudo, não mexe), Comentador (vê e comenta), Editor (muda tudo). Você troca o papel de qualquer pessoa na lista a qualquer momento.

Regra para planilhas: dados são frágeis — uma fórmula apagada por engano derruba o cálculo da turma inteira. Por isso, prefira dar Visualizador ou Comentador e manter só o essencial como Editor.

Dica: para um colega que vai lançar as notas da sua semana de ausência, dê Editor só na planilha e mude de volta quando voltar. Controle total, zero risco.`,
  },
  {
    title: "Planilha colaborativa de planejamento com outros professores",
    body: `O planejamento em equipe vira um documento vivo no Planilhas: uma aba por professor ou por disciplina, todos editando juntos.

Exemplo: aba "Cronograma" (datas), aba "Conteúdos por Disciplina" (cada professor preenche a sua), aba "Metas da Escola". Tudo centralizado e atualizado em tempo real.

Dica: crie a planilha do planejamento com um professor "dono" e compartilhe como Editor com o restante. No fim do semestre, vocês têm o histórico completo do que foi planejado — sem papel perdido.`,
  },
  {
    title: "Exportar e importar dados do Google Forms para a planilha",
    body: `O casamento Forms + Planilhas é automático: quando você cria um quiz no Forms, a aba "Respostas" tem um ícone de planilha que gera um Google Sheets com todas as respostas organizadas por coluna.

Cada linha = um aluno; cada coluna = uma pergunta (incluindo nome e nota do quiz). Para exportar: "Arquivo" > "Baixar" > "Microsoft Excel (.xlsx)" ou "CSV" para usar em outro programa.

Dica: monte uma planilha mestre de notas do bimestre e importe as notas dos quizzes de lá: cada quiz vira uma coluna, e a média geral se calcula sozinha. O boletim nasce sem digitar nota nenhuma à mão.`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.6 Google Agenda
// ──────────────────────────────────────────

const calendarLessons: LessonData[] = [
  {
    title: "O que é o Google Agenda e integração com conta escolar",
    body: `O Google Agenda é o calendário online que organiza eventos, aulas, provas e reuniões. Ele vem integrado à sua conta Google — se você usa o Gmail ou o Drive, a Agenda já está lá (calendar.google.com).

Vantagens: lembra de tudo automaticamente (no computador e no celular), permite compartilhar calendários, e se conecta com Google Meet para reuniões.

Dica: a Agenda é o "cérebro" da sua rotina. Um professor que usa a Agenda sabe, em qualquer dia, onde deve estar e o que precisa entregar — sem depender da memória ou de bilhetes no bolso.`,
  },
  {
    title: "Criar eventos simples e recorrentes",
    body: `Para criar um evento: clique no dia no calendário (ou no botão "Criar"), dê um título (ex: "Reunião de Pais — 7º A"), defina data e horário, e salve.

Evento recorrente é o que se repete: "Aula de Matemática" toda terça e quinta. Ao criar, ative "Não se repete" e escolha a frequência (semanal, mensal) e até quando vale.

Dica: registre na Agenda toda a grade de aulas do ano — uma vez. Depois, é só criar exceções (feriados, trocas). O calendário do professor fica completo para o ano inteiro em uma hora de trabalho.`,
  },
  {
    title: "Adicionar local, descrição e anexos ao evento",
    body: `Ao criar um evento, os campos "Adicionar local" (ex: "Sala 12" ou "Laboratório de Informática") e "Adicionar descrição ou anexos" deixam o evento completo: você pode anexar o plano de aula, o PDF da prova ou o link do material.

Use a descrição para colocar o roteiro da aula ou a pauta da reunião. Anexe arquivos do Drive para ter tudo no lugar certo na hora do evento.

Dica: na reunião de planejamento, anexe a planilha de notas e a pauta ao evento da reunião. Na hora da reunião, abra o evento e tudo que você precisa está ali, em um clique.`,
  },
  {
    title: "Criar múltiplos calendários por turma ou disciplina",
    body: `Você não precisa misturar tudo em um calendário só. No menu lateral esquerdo, clique em "+" ao lado de "Outros calendários" > "Criar novo calendário" — crie um por turma ou disciplina ("7º A", "Matemática", "Reuniões").

Cada evento vai para o calendário certo, e cada calendário tem sua própria cor. Você liga/desliga a visualização de cada um com um clique.

Dica: crie 4 calendários: "Aulas" (grade fixa), "Provas" (datas de avaliação), "Reuniões" e "Pessoal". No dia, ligue só o que importa — a tela fica limpa e o foco fica no que você precisa ver.`,
  },
  {
    title: "Visualização por dia, semana e mês",
    body: `A Agenda tem três modos principais de visualização, no canto superior direito: Dia, Semana e Mês. A vista "Semana" é a favorita dos professores — mostra a grade de aulas completa de uma vez.

Use também "Agenda" (lista) para ver os próximos compromissos em formato de lista. A visualização atual fica salva para a próxima vez que você abrir.

Dica: comece o dia abrindo a Agenda na vista "Dia" — você vê exatamente a sequência de aulas e reuniões do dia, sem ruído visual de outros compromissos.`,
  },
  {
    title: "Configurar lembretes e notificações",
    body: `A Agenda avisa antes de cada evento. Na criação do evento, clique em "Adicionar notificação" e escolha: por pop-up no navegador, por e-mail, ou (no celular com o app) por notificação do sistema.

Sugestão: configure "10 minutos antes" para aulas e "1 dia antes" para provas e reuniões importantes. Eventos diferentes merecem lembretes diferentes.

Dica: para provas, configure dois lembretes: "1 dia antes" (para preparar o material) e "15 minutos antes" (hora de ir para a sala). A Agenda não deixa você esquecer nada.`,
  },
  {
    title: "Integração com Google Meet para reuniões",
    body: `A Agenda conversa com o Google Meet: ao criar um evento, clique em "Adicionar conferência do Google Meet" — um link de vídeo é criado automaticamente e entra no convite.

Os participantes recebem o link no evento e entram na reunião com um clique. Reuniões de coordenação e formações podem acontecer remotamente sem instalar nada além do navegador.

Dica: use "Adicionar conferência do Google Meet" em toda reunião de coordenação, mesmo presencial — se alguém estiver em casa (ou a escola fechar), a reunião continua pelo link.`,
  },
  {
    title: "Agenda no celular: sincronização automática",
    body: `Instale o app "Google Agenda" (Play Store / App Store) e faça login com a mesma conta da escola. Tudo que você cria no computador aparece no celular na hora, e vice-versa.

No celular, você recebe as notificações dos eventos mesmo sem abrir o app, e pode criar eventos rapidamente (útil quando a coordenação anuncia uma reunião no corredor).

Dica: com a Agenda no celular, o professor vive com o calendário no bolso. Configure o som das notificações e deixe o celular por perto em dias cheios de reunião.`,
  },
  {
    title: "Usar a agenda para organizar datas de provas e entregas",
    body: `A Agenda é o lugar ideal para o cronograma de avaliações. Crie eventos para cada prova com local, anexo (a prova em PDF) e lembrete. Depois, você nunca mais pergunta "quando era a prova mesmo?".

Monte o calendário do bimestre de uma vez: marque as semanas de provas, as datas de entrega de trabalhos e os feriados. O semestre inteiro fica visível de relance.

Dica: crie o evento da prova com o anexo da prova pronta. No dia, abra o evento, baixe o arquivo e projete na lousa. Menos um pendrive para perder.`,
  },
  {
    title: "Convidar colegas e criar eventos compartilhados",
    body: `Ao criar um evento, adicione convidados no campo "Adicionar convidados" (e-mails dos colegas ou da coordenação). Eles recebem o convite por e-mail e podem confirmar presença com "Sim, talvez, Não".

Eventos compartilhados são a base de reuniões e formações: todo mundo tem o mesmo compromisso na própria agenda, com confirmação registrada.

Dica: em eventos da escola, adicione o e-mail da coordenação como convidado — a reunião entra na agenda dela automaticamente, e você vê quem confirmou. Zero "esqueci da reunião".`,
  },
  {
    title: "Compartilhar calendário com equipe pedagógica",
    body: `Você pode compartilhar um calendário inteiro: no menu lateral, passe o mouse sobre o calendário > os três pontinhos > "Configurações e compartilhamento" > "Compartilhar com pessoas" > adicione os e-mails da equipe.

Cada pessoa vê os eventos do calendário na própria Agenda (com a cor do calendário original). Escolha a permissão: "Ver apenas se livre/ocupado" ou "Ver todos os detalhes dos eventos".

Dica: compartilhe o calendário "Provas" com a coordenação — elas acompanham o cronograma de avaliações de todas as turmas sem receber um e-mail sequer.`,
  },
  {
    title: "Calendário coletivo de turma visível para alunos",
    body: `Crie um calendário público da turma: "Configurações e compartilhamento" > "Obter link de compartilhamento" > "Qualquer pessoa com o link pode VER todos os detalhes". Copie o link e envie no Classroom ou WhatsApp.

Nele, coloque: datas de provas, entregas de trabalho, feriados, passeios. Os alunos (e os pais) consultam o calendário e se organizam.

Dica: mantenha o calendário da turma sempre atualizado. Quando um aluno perguntar "que dia é a prova?", a resposta é "está no calendário da turma" — e eles aprendem a se organizar sozinhos.`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.7 Google Classroom
// ──────────────────────────────────────────

const classroomLessons: LessonData[] = [
  {
    title: "O que é o Google Classroom e como se diferencia de grupos de WhatsApp",
    body: `O Google Classroom é o ambiente virtual da turma: um espaço organizado onde você publica avisos, entrega atividades, recebe trabalhos e dá notas — tudo em um só lugar (classroom.google.com).

A diferença do WhatsApp: no Classroom, cada atividade tem prazo, entrega e nota registradas; no WhatsApp, os trabalhos se perdem em milhares de mensagens. O Classroom organiza; o WhatsApp bagunça.

Dica: use o WhatsApp para o "recado rápido" e o Classroom para o "trabalho escolar". O professor ganha organização e os alunos ganham clareza do que precisa ser entregue.`,
  },
  {
    title: "Criar uma turma e configurar informações básicas",
    body: `Em classroom.google.com, clique no "+" (canto superior direito) > "Criar turma". Dê nome (ex: "7º Ano A — Matemática"), seção e sala (opcional) e crie.

A turma criada tem: um mural (onde aparecem os avisos), uma aba "Atividades" (as tarefas) e a lista de alunos. Você pode personalizar o tema visual e o emoji da turma.

Dica: use nomes padronizados ("7A-Matemática-2026") para achar suas turmas facilmente, principalmente se você dá aula para várias turmas e disciplinas.`,
  },
  {
    title: "Convidar alunos por código ou e-mail",
    body: `Na página da turma, a aba "Pessoas" mostra o "Código da turma" (6 caracteres). Envie esse código para os alunos — eles entram com "Entrar na turma" e digitam o código.

Alternativa: na aba "Pessoas", clique em "Convidar" e adicione os e-mails dos alunos individualmente. Você também pode copiar o link de convite e enviar no WhatsApp.

Dica: projete o código da turma na lousa no primeiro dia e peça para todos entrarem na hora. Quem entra pelo código já está na sua lista, sem você digitar e-mail nenhum.`,
  },
  {
    title: "Organizar a turma por tópicos e disciplinas",
    body: `Tópicos são "capas" que organizam as atividades no mural. No lado esquerdo da aba Atividades, clique em "Criar" > "Tópico" e crie os temas ("Capítulo 1", "Atividades de Casa", "Provas").

Depois, cada atividade publicada pode ser enviada para um tópico — o mural fica limpo e o aluno encontra tudo pelo assunto.

Dica: crie tópicos fixos no início do ano: "Conteúdo", "Atividades", "Provas e Avaliações", "Material de Apoio". Toda atividade publicada vai para um desses — nunca para o "limbo" do mural solto.`,
  },
  {
    title: "Publicar avisos e comunicados para a turma",
    body: `No mural da turma, a caixa "Compartilhe algo com sua turma" publica avisos. Escreva o recado, anexe links ou arquivos se quiser, e clique em "Publicar".

Os avisos aparecem no mural em ordem cronológica. Você pode comentar em avisos e até fixar o aviso importante no topo (clicando nos três pontinhos > "Fixar").

Dica: padronize seus avisos: "📢 Aviso: amanhã não haverá aula — formação de professores". Avisos claros com emoji de identificação reduzem em 90% as perguntas repetidas no grupo.`,
  },
  {
    title: "Criar e atribuir atividades com prazo",
    body: `Na aba "Atividades", clique em "Criar" > "Atividade". Dê título, instruções, anexe arquivos e defina o prazo ("Data de entrega" com data e hora). Escolha o tópico e clique em "Atribuir".

A atividade aparece no mural com o prazo marcado, e os alunos a veem em "Trabalhos de casa" na própria tela inicial. Atividades com prazo ficam visíveis no calendário da turma automaticamente.

Dica: defina sempre prazo com hora (ex: 23:59) — evita a discussão "professora, eu entreguei ontem à noite". O horário de entrega fica registrado no sistema.`,
  },
  {
    title: "Tipos de atividade: tarefa, quiz, pergunta, material",
    body: `O menu "Criar" da aba Atividades oferece vários tipos:
• Atividade: tarefa com entrega de arquivo.
• Atividade com teste do Google Forms: prova/quiz com correção automática.
• Pergunta: os alunos respondem no próprio Classroom (ótimo para discussão).
• Material: apenas conteúdo para leitura/estudo — sem entrega.
• Reutilizar atividade: copie de outra turma.

Dica: use "Pergunta" para uma pergunta-discussão rápida (os alunos respondem e veem as respostas dos colegas), "Material" para conteúdo de estudo, e "Atividade" para entregas com nota.`,
  },
  {
    title: "Anexar arquivos do Drive nas atividades",
    body: `Ao criar uma atividade, clique no ícone do Google Drive (📁) para anexar arquivos. Escolha o arquivo no seu Drive — a cópia de cada aluno é criada automaticamente.

Opções de cópia (configuráveis no arquivo anexado): "Os alunos podem ver o arquivo" (leitura), "Os alunos podem editar o arquivo" (todos editam o mesmo) ou "Fazer uma cópia para cada aluno" (cada um recebe a própria versão — perfeito para provas e atividades individuais).

Dica: para atividades individuais, escolha "Fazer uma cópia para cada aluno". Cada um entrega a própria versão, sem ninguém apagar o trabalho do colega.`,
  },
  {
    title: "Visualizar entregas dos alunos",
    body: `Na atividade publicada, clique nela e depois em "Ver tarefa" para abrir o painel de entregas. Você vê: quem entregou (em ordem de data), quem ainda não, e quantos pontos valem.

Clique no nome do aluno para abrir o trabalho dele e corrigir com comentários, nota e devolução.

Dica: o Classroom marca a entrega automaticamente com data e hora. No final do prazo, a lista "Não entregou" está pronta — nenhum aluno "sumiu" com o trabalho sem registro.`,
  },
  {
    title: "Devolver atividade com comentário e nota",
    body: `Ao corrigir o trabalho do aluno, você pode: deixar comentários privados (o aluno vê só ele), adicionar comentários no documento (no modo correção), e dar uma nota (número ou emoji).

Depois de corrigir, clique em "Devolver" — o aluno recebe a notificação com a nota e seus comentários. Você pode devolver para todos de uma vez ou aluno a aluno.

Dica: deixe um comentário pessoal em cada devolução ("Ótima introdução! Releia o 3º parágrafo"). O feedback individual é o que mais ensina — e o Classroom entrega isso sem papel.`,
  },
  {
    title: "Acompanhar quem entregou e quem está pendente",
    body: `O painel "Ver tarefa" mostra a lista completa: quem entregou, a data da entrega e quem está pendente. Use o filtro do painel para ver "Entregues" e "Não entregues".

Para avisar os atrasados: com a lista de não entregues aberta, você pode enviar um e-mail para todos de uma vez (ícone de sobrescrito).

Dica: combine com a turma: "no dia seguinte ao prazo, eu aviso quem não entregou". O acompanhamento automático do Classroom faz o papel de lembrete — sem você precisar cobrar um a um.`,
  },
  {
    title: "Integração com Google Forms para avaliações",
    body: `Crie a prova no Google Forms e atribua no Classroom como "Atividade com teste": na aba Atividades > "Criar" > "Atividade com teste do Google Forms" > escolha o formulário.

As notas dos quizzes aparecem direto no painel do Classroom, com a correção automática do Forms. O aluno entrega a prova sem sair do ambiente da turma.

Dica: com a atividade-teste, o "Gabarito" definido no Forms corrige sozinho e o Classroom registra a nota. Você só abre o painel para revisar as dissertativas — economia enorme de tempo em turmas grandes.`,
  },
  {
    title: "Compartilhar materiais do Drive diretamente na turma",
    body: `Para enviar material de estudo, use "Criar" > "Material". Dê um título (ex: "📚 Apostila — Capítulo 2"), anexe os arquivos do Drive e clique em "Publicar".

Os alunos acessam o material no mural sem baixar nada — abrem direto no Drive. Você também pode adicionar links de sites e vídeos do YouTube como material.

Dica: o tópico "Material de Apoio" guarda toda a apostila digital do ano. No final do bimestre, os alunos têm a coletânea completa das suas aulas organizada por assunto.`,
  },
  {
    title: "Controle de permissões de edição nas atividades dos alunos",
    body: `Ao anexar um arquivo em uma atividade, você controla o que os alunos podem fazer com ele (clique no anexo > escolha): "Os alunos podem ver" (só leitura), "Os alunos podem editar" (todos mexem no mesmo arquivo) ou "Fazer uma cópia para cada aluno".

Use: "Ver" para materiais de leitura; "Editar" para trabalhos colaborativos da turma; "Cópia para cada aluno" para provas e atividades individuais.

Dica: a permissão errada causa confusão — se todos "editam" o mesmo arquivo, um aluno pode apagar o texto do outro. Para individual, SEMPRE "Fazer uma cópia para cada aluno".`,
  },
  {
    title: "Alunos acessando e entregando atividades pelos computadores da escola",
    body: `Os alunos usam o Classroom pelos computadores da escola com suas contas Google (ou com a conta da turma, se a escola definir). Basta abrir o navegador, entrar em classroom.google.com e fazer login.

Eles veem a lista de tarefas pendentes ("Trabalhos de casa"), abrem a atividade, fazem a entrega anexando o arquivo e clicam em "Entregar". A entrega fica registrada na hora.

Dica: reserve os primeiros 10 minutos do ano para ensinar o caminho: "entrar no navegador → classroom.google.com → login → abrir a atividade → Entregar". Depois do primeiro mês, seus alunos entregam tudo sem ajuda — e sem papel.`,
  },
];

// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.8 Uso Pedagógico da Lousa Digital
// ──────────────────────────────────────────

const lousaLessons: LessonData[] = [
  {
    title: "O que é a lousa digital e seus recursos básicos",
    body: `A lousa digital é uma tela interativa (geralmente 65 a 86 polegadas) conectada a um computador. Você toca nela como se fosse um tablet gigante: abre programas, navega na internet, escreve e arrasta com o dedo ou com uma caneta.

Recursos básicos universais: toque para clicar, arrastar para mover, caneta para escrever, e o teclado virtual quando precisa digitar.

Dica: na primeira semana, abra a lousa todo dia e explore um recurso novo por vez. Em um mês você domina: toque, escrita, zoom e navegação — o suficiente para 90% das aulas.`,
  },
  {
    title: "Diferença entre lousa digital e projetor comum",
    body: `No projetor comum, o computador projeta a imagem na parede/tela — mas ninguém interage: tudo acontece no computador do professor. A lousa digital é interativa: o professor e os alunos tocam, escrevem e manipulam o conteúdo direto na tela.

Na lousa, o aluno pode ir até a frente e arrastar um item, responder a uma pergunta escrevendo, ou circular uma resposta. A aula vira participativa, não só expositiva.

Dica: o salto pedagógico da lousa é a participação. Planeje 1 ou 2 momentos da aula em que os alunos vão à frente manipular o conteúdo — não use a lousa apenas como "projetor caro".`,
  },
  {
    title: "Navegar na internet diretamente pela lousa",
    body: `Abra o navegador (Chrome) na lousa e toque na barra de endereço para digitar (o teclado virtual aparece na tela). Você navega em qualquer site tocando nos links — como um tablet gigante.

Para ampliar páginas pequenas, use o zoom com dois dedos (pinça) ou as teclas Ctrl + e Ctrl - no teclado conectado.

Dica: deixe os sites da aula abertos em abas antes do início. Na hora, é só alternar entre as abas tocando no topo do navegador — transição limpa e sem digitação na frente da turma.`,
  },
  {
    title: "Abrir e apresentar arquivos do Google Drive na lousa",
    body: `Sua aula inteira pode sair do Drive: abra o navegador, entre no drive.google.com e abra o arquivo do dia — apresentação, documento ou planilha — em tela cheia.

Com o navegador na lousa, você alterna entre arquivos do Drive e sites sem sair do lugar. Deixe o material do dia em uma pasta "Aula de Hoje" para acesso em dois toques.

Dica: abra o arquivo ANTES da aula e deixe em tela cheia. Quando os alunos chegarem, o conteúdo já está pronto na lousa — a aula começa no sinal, sem espera técnica.`,
  },
  {
    title: "Usar o Google Apresentações como quadro interativo",
    body: `O Google Apresentações na lousa funciona como um quadro vivo: você apresenta os slides e, na hora, pode abrir o "modo edição" e escrever em cima dos slides com a caneta.

Use uma apresentação com atividades: um slide com um problema matemático vazio para os alunos resolverem escrevendo na lousa, um texto com lacunas para completar, um mapa para marcar.

Dica: crie slides "espaço de trabalho" com fundo liso (ou grade de caderno) e deixe os alunos escreverem com a caneta. O mesmo slide serve para a turma inteira — um de cada vez — e você apaga e repete.`,
  },
  {
    title: "Escrever e desenhar diretamente na lousa",
    body: `Toda lousa digital tem um aplicativo de "anotações" ou uma caneta com tinta. Toque no botão da caneta (na barra lateral ou no controle) e escreva com o dedo ou a caneta sobre qualquer tela — inclusive sobre o slide ou a página que está aberta.

Você pode: circular partes de um texto, sublinhar, escrever explicações ao lado, desenhar gráficos e esquemas. Depois, salve ou apague a tinta.

Dica: a "tinta digital" é seu giz infinito. Escreva sobre imagens e mapas para explicar, e salve a tela com anotações para compartilhar com quem faltou.`,
  },
  {
    title: "Recursos de zoom, destaque e apontador laser virtual",
    body: `Recursos de apresentação que valem ouro na aula:
• Zoom: amplie uma parte da tela para a turma enxergar do fundo da sala (pinça ou ferramenta de ampliação).
• Destaque: uma régua/lente que ilumina a área que você quer mostrar.
• Apontador laser virtual: um laser na tela que funciona como o ponteiro físico.

Dica: a turma no fundo da sala agradece o zoom. Amplie textos, imagens e gráficos antes de explicar — e use o destaque para conduzir o olhar da turma exatamente para onde você quer.`,
  },
  {
    title: "Exibir vídeos do YouTube integrados à aula",
    body: `Para exibir vídeo na lousa: abra o YouTube no navegador e toque no vídeo. Para reprodução em tela cheia, toque no ícone de tela cheia — ou, se estiver dentro do Google Apresentações, "Inserir" > "Vídeo" e o vídeo toca dentro do slide.

Use a velocidade de reprodução (engrenagem do YouTube) para ajustar: 0,75x para conteúdos rápidos. Pause e comente nos momentos-chave.

Dica: baixe ou deixe o vídeo abrindo ANTES da aula (a internet da escola pode ser lenta). Se o vídeo for essencial, tenha um plano B: baixe no computador como backup.`,
  },
  {
    title: "Usar a lousa para aplicar quizzes em tempo real com Kahoot e Quizizz",
    body: `Kahoot e Quizizz transformam a aula em um jogo de perguntas: projete as perguntas na lousa e os alunos respondem do celular (em kahoot.it ou quizizz.com/join), digitando o código do jogo que aparece na tela.

O professor abre o site na lousa, cria ou escolhe um quiz pronto, e a turma joga em tempo real: a lousa mostra a pergunta e o placar, e os celulares são os controles.

Dica: o Kahoot é perfeito para revisão antes da prova. Um quiz de 10 perguntas na sexta-feira valendo pontos de participação engaja a turma e mostra, em tempo real, o que ainda precisa ser revisado.`,
  },
  {
    title: "Integrar o Google Classroom com a lousa digital",
    body: `A dupla lousa + Classroom é poderosa: na lousa, abra o classroom.google.com e a turma aparece na tela. Projete as atividades, o mural e as entregas para a turma inteira ver.

Você pode: mostrar o prazo das atividades no mural, abrir um trabalho de aluno para corrigir em conjunto (projeção), e exibir o calendário de provas da turma.

Dica: projete o Classroom no início da aula nos dias de atividade: "vejam o que tem para hoje e os prazos da semana". Os alunos visualizam as responsabilidades — e as perguntas de "que dia entrega?" despencam.`,
  },
  {
    title: "Espelhar a tela do computador do aluno na lousa",
    body: `Espelhar (compartilhar a tela) mostra a tela do computador do aluno na lousa para todos verem. Dependendo do modelo da lousa, isso é feito por cabo (HDMI), rede Wi-Fi, ou aplicativos como o "Mirroring" embutido.

Com o aluno com a tela projetada, ele apresenta o trabalho dele para a turma: mostra o documento, o slide ou a planilha que produziu.

Dica: o espelhamento é a vitrine do protagonismo do aluno. Nas apresentações de trabalho, combine antes: "João apresenta hoje — vamos ver a tela dele na lousa". O resto da turma acompanha e aprende com o colega.`,
  },
  {
    title: "Salvar e compartilhar o conteúdo trabalhado na lousa",
    body: `Tudo que você escreve ou anota na lousa pode ser salvo: os aplicativos de lousa têm o botão "Salvar" ou "Capturar tela". O arquivo (imagem ou PDF) vai para o computador — e você pode enviá-lo para o Drive.

No Drive, o conteúdo vira material de apoio: compartilhe o PDF com a turma no Classroom ou envie o link no grupo. Quem faltou acompanha a aula.

Dica: crie a pasta "Lousa" no Drive e salve a captura da aula do dia com o nome padrão (data + turma). No fim do ano, você tem o "caderno digital" de todas as aulas.`,
  },
  {
    title: "Ferramentas de colaboração em tempo real exibidas na lousa",
    body: `A lousa + ferramentas colaborativas = aula participativa. Exemplos: um documento do Google Docs aberto na lousa onde os alunos escrevem do celular ao mesmo tempo (os cursores coloridos aparecem na tela), ou uma planilha que a turma preenche junto.

Na prática: abra um Jamboard (ou documento) com uma pergunta, e cada aluno responde do próprio aparelho — as respostas aparecem na lousa em tempo real, e a turma discute.

Dica: o "muro de respostas" em tempo real é mágico para aquecer a aula: pergunte "o que vocês sabem sobre X?" e deixe as respostas pipocarem na lousa. A turma se vê participando.`,
  },
  {
    title: "Boas práticas de gestão de turma com a lousa digital",
    body: `A lousa é uma aliada da gestão de sala: • Estabeleça a regra de "um aluno por vez" na lousa (crie a fila de participação). • Use o timer/relógio da lousa para atividades com tempo marcado. • Planeje momentos alternados: exposição na lousa, atividade no caderno, e voltar para a lousa.

Evite: a aula inteira na lousa (a turma vira plateia) e a fila de 30 alunos querendo tocar ao mesmo tempo.

Dica: tenha um "combinado da lousa" escrito no primeiro dia: tocar com cuidado, não apagar o trabalho do colega, e levantar a mão para ir até a frente. Disciplina preventiva poupa retrabalho.`,
  },
  {
    title: "Solução de problemas básicos na lousa: travamento, conexão, calibração",
    body: `Problemas comuns e soluções rápidas:
• Tela travada: desligue e ligue a lousa (botão de energia) e aguarde 1 minuto.
• Toque não responde no lugar certo (cursor torto): isso é calibração — use o utilitário de calibração do software da lousa e toque nos pontos marcados.
• Sem imagem: confira o cabo HDMI/conexão do computador e a fonte de entrada (HDMI 1, HDMI 2...).
• Sem som: verifique o volume da lousa E do computador.

Dica: tenha o número/suporte da escola salvo. Mas 80% dos problemas resolvem com "desliga e liga" + "confere o cabo" — teste isso antes de chamar ajuda.`,
  },
  {
    title: "Manutenção e cuidados com a lousa digital",
    body: `Para a lousa durar anos, cuide dela como de um equipamento valioso:
• Limpe com pano macio e seco (nunca produtos químicos ou panos molhados).
• Não use objetos pontiagudos para tocar — só dedos ou a caneta própria.
• Não pendure nada na lousa nem bata na tela.
• Desligue a lousa ao final do dia (economiza energia e prolonga a vida útil).
• Avise a coordenação sobre qualquer problema logo que notar.

Dica: combine com a turma o "combinado da lousa": só o professor ou o aluno autorizado toca. Uma lousa bem cuidada acompanha a escola por muitos anos.`,
  },
];

// ──────────────────────────────────────────
// Montagem do curso
// ──────────────────────────────────────────

const courseData: CourseData = {
  title: "Alfabetização Digital e Gestão da Aula (Básico)",
  description:
    "Domine as ferramentas Google na prática: Drive, Docs, Apresentações, Forms, Planilhas, Agenda, Classroom e Lousa Digital. Curso 100% didático, passo a passo, pensado para professores que querem modernizar a gestão da aula sem complicação.",
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

  // 2. Curso (idempotente)
  const existing = await prisma.course.findFirst({
    where: { title: courseData.title, instructorId: instructor.id },
  });

  let course;
  if (existing) {
    console.log(`  ⏭️  Curso já existe (${existing.id}) — pulando criação.`);
    course = existing;
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

  // 3. Módulos + aulas (idempotente: só cria se o módulo não existir)
  for (let mi = 0; mi < courseData.modules.length; mi++) {
    const md = courseData.modules[mi];
    let mod = await prisma.module.findFirst({
      where: { courseId: course.id, orderIndex: mi + 1 },
    });
    if (!mod) {
      mod = await prisma.module.create({
        data: { title: md.title, description: md.description, orderIndex: mi + 1, courseId: course.id },
      });
      console.log(`  ✅ Módulo: ${md.title}`);
    }

    for (let li = 0; li < md.lessons.length; li++) {
      const ls = md.lessons[li];
      const lessonExists = await prisma.lesson.findFirst({
        where: { moduleId: mod.id, orderIndex: li + 1 },
      });
      if (!lessonExists) {
        await prisma.lesson.create({
          data: {
            title: ls.title,
            description: ls.body.slice(0, 200),
            contentType: LessonContentType.TEXT,
            contentBody: ls.body,
            orderIndex: li + 1,
            moduleId: mod.id,
          },
        });
      }
    }
    console.log(`  📚 ${md.title}: ${md.lessons.length} aulas garantidas`);
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
