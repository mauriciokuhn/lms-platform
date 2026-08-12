/**
 * 🌱 Seed — Curso: Alfabetização Digital e Gestão da Aula (Básico)
 *
 * Cria (idempotente, com atualização) o instrutor Mauricio Kuhn e o curso
 * completo com 8 módulos e 130 aulas didáticas. Cada aula traz:
 *   • explicação conceitual acessível (linguagem de professor para professor)
 *   • passo a passo prático de como fazer
 *   • atividade ou dica para aplicar imediatamente na sala de aula
 * Aulas-chave incluem vídeo didático do YouTube (contentType VIDEO), com o
 * texto de apoio logo abaixo do player.
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
// Conteúdo didático — Módulo 1.1 Google Drive
// ──────────────────────────────────────────

const driveLessons: LessonData[] = [
  {
    title: "O que é armazenamento em nuvem e por que usar",
    video: "https://www.youtube.com/watch?v=8mIJiIDBKoo",
    body: `A nuvem é um espaço de armazenamento na internet. Em vez de salvar seus arquivos apenas no computador, você os guarda nos servidores do Google — e pode acessá-los de qualquer aparelho, em qualquer lugar, com apenas um login.

Para o professor, isso muda tudo: o plano de aula elaborado em casa está disponível na escola, o material da reunião pedagógica está no celular, e a prova de recuperação não precisa mais ser levada em um pendrive que pode estragar, perder ou ficar para trás. Se o computador quebrar ou for roubado, seus arquivos continuam seguros na nuvem, esperando por você.

Outra grande vantagem é a tranquilidade de nunca mais ouvir a frase "deixei o arquivo no outro computador". Tudo o que você salva na nuvem fica sincronizado: a versão mais atualizada do documento é sempre a que você vê, independentemente do aparelho que estiver usando naquele momento.

Dica de ouro: comece guardando na nuvem apenas o essencial — seus planos de aula, o caderno de notas e as provas. Em pouco tempo, guardar tudo na nuvem vira um hábito natural.`,
  },
  {
    title: "Criar conta Google e acessar o Drive",
    body: `Para usar o Google Drive você precisa de uma conta Google — a mesma do Gmail. Se ainda não tem, acesse accounts.google.com, clique em "Criar conta", preencha seu nome, escolha um e-mail disponível e crie uma senha forte (com letras, números e um símbolo). Você também pode usar o seu e-mail atual para criar uma conta Google sem precisar trocar de endereço.

Depois de criar ou entrar na sua conta, acesse drive.google.com. É só digitar esse endereço no navegador, informar e-mail e senha, e você cai direto na tela inicial do Drive, onde seus arquivos ficam organizados.

Uma observação importante: se a escola oferece uma conta institucional (algo como professor@suaescola.edu.br), prefira usá-la para o trabalho. Contas de escolas costumam ter espaço de armazenamento muito maior e ferramentas administrativas que ajudam a coordenação a organizar tudo.

Dica prática: ative a verificação em duas etapas na sua conta Google (em myaccount.google.com > Segurança). São poucos minutos de configuração e um enorme ganho de proteção para o material da sua escola.`,
  },
  {
    title: "Interface do Drive: navegação e organização",
    body: `Ao abrir o Drive pela primeira vez, você encontra três regiões principais. No topo fica a barra de busca, que encontra qualquer arquivo pelo nome ou até pelo conteúdo. À esquerda, o menu lateral com as divisões "Meu Drive", "Computadores", "Compartilhados comigo", "Recentes" e "Lixeira". No centro, a grande área onde seus arquivos e pastas aparecem, com botões de visualização no canto direito.

O botão "Novo" (canto superior esquerdo, em azul) é o ponto de partida de quase tudo: criar pastas, documentos, planilhas, apresentações ou enviar arquivos do computador. O menu lateral serve para navegar: "Meu Drive" mostra seus arquivos, "Compartilhados comigo" mostra o que outros colegas lhe enviaram, "Recentes" mostra o que você abriu por último e "Lixeira" guarda o que foi excluído.

Uma dica que economiza muito tempo: deixe a visualização em "Lista" (o ícone de linhas horizontais no canto superior direito). Assim você enxerga de uma só vez o nome de cada arquivo, quem é o dono, quando foi modificado e o tamanho — informações preciosas para se localizar em um Drive cheio de materiais.

Exercício rápido: abra seu Drive e identifique as três regiões. Depois, clique em cada item do menu lateral apenas para conhecer o que aparece. Em cinco minutos você já domina a navegação.`,
  },
  {
    title: "Criar, renomear e mover pastas",
    body: `Pastas são a forma mais simples e poderosa de organizar o seu Drive. Para criar uma, clique em "Novo" > "Nova pasta", digite o nome e confirme com Enter. A pasta aparece imediatamente no seu Meu Drive.

Para renomear, clique com o botão direito sobre a pasta e escolha "Renomear", ou pressione a tecla F2. Para mover uma pasta para dentro de outra, você tem duas opções: arrastar a pasta com o mouse até o local de destino, ou usar o botão direito > "Mover para" e escolher a pasta de destino em uma janela.

A regra de ouro da organização é pensar de cima para baixo: comece criando as pastas grandes (por exemplo, "2026"), depois as intermediárias dentro delas ("1º Ano", "2º Ano") e, por fim, as específicas ("Matemática", "Ciências"). Organizar a estrutura antes de colocar os arquivos evita o caos de dezenas de pastas soltas espalhadas pelo Drive.

Atenção: ao mover uma pasta, todos os arquivos que estão dentro dela se movem junto. Use isso a seu favor para reorganizar grandes quantidades de material em poucos cliques.`,
  },
  {
    title: "Fazer upload de arquivos e pastas do computador",
    body: `Upload é o nome técnico para enviar um arquivo do seu computador para a nuvem. No Drive, há três jeitos fáceis: clicar em "Novo" > "Upload de arquivo" e selecionar o que deseja enviar; arrastar o arquivo direto da janela do seu computador para a janela do navegador; ou clicar em "Novo" > "Upload de pasta" para enviar uma pasta inteira, com tudo o que está dentro dela.

Você pode selecionar vários arquivos de uma vez — segure a tecla Ctrl enquanto clica em cada um, ou use Ctrl+A para selecionar todos. No canto inferior direito da tela aparece uma pequena barra de progresso; quando ela sumir, o envio terminou e os arquivos já estão na nuvem.

Dica valiosa para a escola: quando for enviar uma pasta com fotos de um evento ou trabalhos escaneados de uma turma inteira, o envio em lote (pasta inteira ou vários arquivos juntos) é muito mais rápido e organizado do que enviar um por um.

Depois do upload, vale a pena conferir: abra a pasta e veja se a contagem de arquivos bate com o que você tinha no computador. Se algo ficou de fora, o próprio Drive mostra uma mensagem de erro na barra de progresso.`,
  },
  {
    title: "Busca de arquivos por nome, tipo e data",
    body: `A barra de busca do Drive fica no topo da tela e é muito mais esperta do que parece. Digite o nome do arquivo e pressione Enter: o Google encontra pastas, documentos, planilhas e até o texto dentro de documentos. Sim, você leu certo — se um documento menciona "plano de aula de ciências", uma busca por "plano de aula" o encontra mesmo sem você lembrar o nome do arquivo.

Para buscas mais refinadas, clique na seta ao lado da barra e use os filtros: tipo (documento, planilha, PDF, imagem), dono (quem criou ou compartilhou), data de modificação, e até palavras exatas. Exemplos que funcionam muito bem na prática: "prova 3º bimestre type:pdf" ou "notas type:spreadsheet before:2026-06-01".

O Drive também entende linguagem natural. Você pode digitar "fotos da formatura" ou "planilha de frequência" e ele interpreta o que você procura, em vez de exigir o nome exato do arquivo.

Dica de produtividade: crie o hábito de usar a busca em vez de navegar por pastas quando estiver com pressa. Para a maioria dos arquivos, a busca é mais rápida do que abrir pasta por pasta.`,
  },
  {
    title: "Lixeira e recuperação de arquivos deletados",
    body: `Quando você exclui um arquivo no Drive, ele não desaparece na hora. Ele vai para a Lixeira — o item no menu lateral esquerdo — e fica lá por 30 dias, como uma segunda chance para arrependimentos.

Para recuperar um arquivo, abra a Lixeira, clique com o botão direito sobre o arquivo e escolha "Restaurar". Ele volta para a pasta de onde foi excluído, exatamente como estava. Você pode restaurar vários arquivos de uma vez selecionando todos e usando o botão "Restaurar" no topo.

Atenção aos detalhes que evitam sustos: depois de 30 dias na Lixeira, o arquivo é apagado definitivamente e não há como recuperá-lo. Se a sua conta estiver cheia, você pode esvaziar a Lixeira manualmente — mas só faça isso quando tiver certeza absoluta de que nenhum arquivo ali é importante.

Dica de segurança escolar: antes de deletar arquivos de turmas antigas, faça um backup em um pendrive ou em um Drive compartilhado da escola. Provas e documentos oficiais devem ser guardados por mais tempo do que os 30 dias da Lixeira.`,
  },
  {
    title: "Espaço de armazenamento: limites e gerenciamento",
    body: `Contas Google gratuitas oferecem 15 GB de armazenamento compartilhados entre Drive, Gmail e Google Fotos. Isso significa que e-mails com anexos grandes e fotos enviadas para o Google Fotos também usam o mesmo espaço. Contas escolares, em geral, têm espaço muito maior ou até ilimitado — por isso o conselho de usar a conta da escola para o trabalho.

Para conferir quanto espaço você já usou, clique na engrenagem (configurações) no canto superior direito do Drive e escolha "Armazenamento". Você verá um gráfico mostrando o que está ocupando mais espaço — normalmente, vídeos e e-mails com anexos grandes são os maiores vilões.

Se o espaço estiver acabando, as soluções práticas são: esvaziar a Lixeira e a pasta de Spam do Gmail, excluir fotos e vídeos antigos do Google Fotos que não têm mais uso pedagógico, e — a mais eficiente — não guardar vídeos pesados no Drive.

Dica de ouro: hospede vídeos de aula no YouTube em modo "não listado" (só quem tem o link acessa) e guarde apenas o link no Drive. Um vídeo de 500 MB vira um link de poucos bytes, e o seu espaço fica livre para documentos e materiais de verdade.`,
  },
  {
    title: "Drive pessoal vs Drive compartilhado da escola",
    video: "https://www.youtube.com/watch?v=85CBSi7maC4",
    body: `O "Meu Drive" é o seu espaço pessoal: só você vê os arquivos, a menos que decida compartilhá-los. Já o "Drive compartilhado" (também chamado de Drive de equipe) é o espaço da escola: todos os professores autorizados têm acesso, e os arquivos pertencem à instituição, não a uma pessoa.

A diferença mais importante aparece quando alguém sai da escola. No Drive pessoal, os arquivos vão embora junto com o dono da conta. No Drive compartilhado, tudo continua lá — porque os documentos pertencem à escola, e não ao professor que os criou. Isso é essencial para a memória institucional: o plano de aula de um colega que saiu continua disponível para quem chegar.

Como regra prática: materiais oficiais da escola (planos de aula aprovados, calendário pedagógico, provas padrão, formulários de matrícula) ficam no Drive compartilhado. Rascunhos, arquivos pessoais e materiais em construção ficam no Meu Drive, até estarem prontos para serem movidos.

Dica: crie o Drive compartilhado com a coordenação e combine uma estrutura padrão (por exemplo, "2026 > Planos de aula > 1º Ano"). Quando todos seguem o mesmo padrão, encontrar qualquer material da escola leva segundos.`,
  },
  {
    title: "Acesso offline ao Drive",
    body: `Você pode trabalhar no Drive mesmo sem internet — muito útil em escolas com conexão instável ou durante viagens. O segredo é preparar os arquivos com antecedência, enquanto ainda há conexão.

No computador, a forma mais completa é instalar o aplicativo "Google Drive para desktop" (disponível em google.com/drive/download). Ele cria uma pasta no seu computador que se sincroniza com a nuvem: o que você salva nela fica disponível offline e é enviado ao Drive quando a internet voltar. Você também pode clicar com o botão direito em arquivos ou pastas e marcar "Disponível offline".

No celular, abra o aplicativo do Drive, toque nos três pontinhos ao lado do arquivo e escolha "Disponibilizar offline". Uma pequena marca de check verde indica que o arquivo pode ser aberto sem conexão.

Importante: o acesso offline funciona para visualizar e editar arquivos do Google (Documentos, Planilhas, Apresentações), mas não para arquivos que exigem download completo, como vídeos muito grandes. Planeje quais materiais da semana precisarão estar disponíveis e marque-os no começo da semana, quando a internet da escola costuma estar mais estável.`,
  },
  {
    title: "Drive no celular vs computador",
    body: `O Drive funciona bem nos dois mundos, mas cada um tem seu papel. No computador, você tem a tela grande, o arrastar-e-soltar de arquivos e a facilidade de organizar pastas — é o ambiente ideal para montar a estrutura e fazer upload de materiais grandes, como vídeos e pastas inteiras.

No celular, o Drive brilha na agilidade: você fotografa um trabalho do aluno e o arquivo vai direto para a pasta certa, responde comentários de colegas, confere materiais na sala de aula e compartilha links por WhatsApp em segundos. Com o app instalado, é possível até escanear documentos (o botão de câmera dentro do app transforma a foto em PDF automaticamente).

Para tirar o máximo dos dois: use o celular para capturar e consultar, e o computador para organizar e editar em profundidade. Ative o upload automático de fotos do app (nas configurações do Drive) para que nenhuma foto de aula se perca na memória do aparelho.

Dica de organização: no celular, você pode adicionar atalhos das suas pastas mais usadas à tela inicial. Assim, a pasta "2º Ano - Matemática" fica a um toque de distância, sem precisar navegar pelo app.`,
  },
  {
    title: "Compartilhar arquivos e pastas: permissões de visualizador, comentador e editor",
    video: "https://www.youtube.com/watch?v=CePaIDzQ19s",
    body: `Compartilhar é o coração do trabalho colaborativo com o Drive. Para compartilhar um arquivo ou pasta, clique com o botão direito e escolha "Compartilhar". Na janela que abre, digite o e-mail da pessoa ou cole o link, e defina o nível de permissão.

Existem três níveis, e entender cada um evita muitos problemas: o Visualizador só pode abrir e ver o conteúdo, sem alterar nada — ideal para enviar material de apoio aos alunos. O Comentador pode ver e escrever comentários, mas não edita o conteúdo — perfeito para colegas que vão dar feedback sobre um plano de aula. O Editor pode alterar tudo — reservado para quem vai trabalhar no mesmo documento com você.

Uma regra de segurança importante: compartilhe com pessoas específicas sempre que possível, em vez de deixar o arquivo "qualquer pessoa com o link". Com e-mails específicos, você sabe exatamente quem tem acesso e pode remover alguém com um clique quando necessário.

Dica pedagógica: para trabalhos em grupo dos alunos, crie uma pasta por grupo com permissão de editor apenas para os integrantes daquele grupo, e para você, o professor. Os alunos editam entre si, e você acompanha tudo de fora, sem risco de um grupo apagar o trabalho do outro.`,
  },
  {
    title: "Gerar links de acesso e configurar quem pode abrir",
    body: `Nem sempre você quer compartilhar por e-mail — às vezes precisa apenas de um link para enviar no WhatsApp ou postar no Classroom. Para isso, clique em "Compartilhar" e, na janela que abrir, em "Alterar" ao lado de "Restrito". Você escolherá quem pode acessar pelo link.

As opções são: "Restrito" (só pessoas adicionadas por você), "Qualquer pessoa com o link" (acesso aberto, sem login), e opções intermediárias como "Qualquer pessoa com o link da sua escola" — esta última é excelente para uso institucional, pois só professores e alunos com a conta da escola conseguem abrir.

Para cada opção você também define o nível de permissão do link: visualizador, comentador ou editor. O padrão recomendado para envio de material é "visualizador": o aluno abre e vê, mas não consegue alterar.

Dica de segurança: ao compartilhar um link com "qualquer pessoa", evite níveis de edição. Uma prova enviada com permissão de edição e link aberto pode ser alterada por qualquer pessoa que receba o link. Use sempre "visualizador" para conteúdo finalizado. E lembre-se: você pode desativar o link a qualquer momento, voltando a opção para "Restrito" — os acessos anteriores são cortados na hora.`,
  },
  {
    title: "Revogar acesso e transferir propriedade de arquivos",
    body: `Uma das grandes vantagens do Drive é o controle total do acesso — inclusive o poder de tirar o acesso de alguém. Para revogar, abra o arquivo ou pasta, clique em "Compartilhar" e, na lista de pessoas, clique no menu ao lado do nome e escolha "Remover acesso". A pessoa perde o acesso imediatamente; se estiver com o arquivo aberto, verá a mensagem de que o acesso foi removido.

Há também a opção "Transferir propriedade". Quando você transfere a propriedade, a outra pessoa passa a ser a dona do arquivo: pode renomeá-lo, movê-lo, excluí-lo e gerenciar os acessos. Use isso quando um colega assume sua turma, quando você passa um material oficial para a coordenação ou quando encerra o uso de uma pasta compartilhada.

Na prática escolar, duas situações comuns: um professor sai e precisa passar os arquivos das turmas para quem assume (transferir propriedade mantém tudo organizado); ou um material foi criado por engano no Drive pessoal e precisa ir para o Drive compartilhado da escola (mova o arquivo ou transfira a propriedade para a conta de gestão).

Dica: antes de revogar acesso a alguém importante, confira se essa pessoa não é a única com uma cópia de um arquivo essencial. Em dúvida, primeiro transfira a propriedade, depois organize os acessos.`,
  },
  {
    title: "Ver quem acessou e editou um arquivo",
    body: `O Drive registra a atividade dos arquivos, e você pode consultar esse histórico quando precisar. Dentro de um arquivo do Google (Documentos, Planilhas ou Apresentações), clique em "Ferramentas" > "Histórico de atividades" (ou use o atalho Ctrl+Shift+H). Você verá uma lista com quem editou o quê e quando — essencial para saber se um aluno realmente trabalhou no documento em grupo, por exemplo.

No próprio Drive (fora do arquivo), você também tem pistas: ao clicar com o botão direito em um arquivo e escolher "Ver detalhes", a aba "Atividade" mostra quem abriu, comentou ou editou recentemente. Essa visão é útil para confirmar se um colega recebeu e acessou o material que você compartilhou.

Para arquivos compartilhados, há um detalhe adicional: na janela "Compartilhar", ao lado do nome de cada pessoa, aparece o status "Aberto" com a data do último acesso — uma forma rápida de saber quem de fato visualizou o conteúdo.

Dica pedagógica: use o histórico de atividades para orientar trabalhos em grupo. Se dois alunos fizeram tudo e o terceiro nunca abriu o documento, essa informação — apresentada de forma construtiva — vira um ótimo ponto de conversa sobre divisão de tarefas e responsabilidade.`,
  },
  {
    title: "Boas práticas de organização para compartilhamento escolar",
    video: "https://www.youtube.com/watch?v=5AzJwS14gXU",
    body: `Organização no Drive não é estética — é economia de tempo e menos estresse. Quando tudo tem lugar certo, você encontra qualquer material em segundos, e os colegas sabem exatamente onde procurar o que precisam.

A primeira prática é definir uma estrutura clara e segui-la religiosamente: ano > turma > disciplina. A segunda é combinar padrões de nomenclatura para que qualquer arquivo seja identificável pelo nome (exemplo: "2026_1A_Matematica_Prova_Bim1"). A terceira é usar as ferramentas que o Drive oferece — cores de pasta, estrelas, pastas compartilhadas — para que a informação visual ajude a navegação.

Outra boa prática é combinar quem tem acesso a quê: a coordenação vê tudo, cada professor vê a pasta da própria turma e os materiais institucionais ficam no Drive compartilhado da escola. Permissões definidas uma vez evitam retrabalho constante.

Por fim, crie o hábito da revisão periódica: uma vez por bimestre, reserve 15 minutos para mover arquivos soltos para seus lugares, excluir versões antigas e limpar a Lixeira. Esse pequeno ritual mantém o Drive da escola utilizável por anos — e serve de exemplo para os alunos aprenderem a organizar os próprios arquivos.`,
  },
  {
    title: "Sistema de pastas por ano, turma e disciplina",
    video: "https://www.youtube.com/watch?v=4LRMNWyMBBA",
    body: `O sistema de pastas em três níveis — ano, turma e disciplina — é o padrão mais eficiente que existe para o Drive de uma escola. Ele funciona como uma árvore: no topo, uma pasta para o ano letivo ("2026"); dentro dela, uma pasta para cada turma ("1º Ano A", "1º Ano B"); e dentro de cada turma, uma pasta por disciplina ("Matemática", "Português", "Ciências").

Para montar, comece pela raiz: crie a pasta "2026" no seu Meu Drive (ou no Drive compartilhado da escola, se o padrão for institucional). Dentro dela, crie as turmas. Dentro de cada turma, as disciplinas. Esse investimento de 10 minutos no começo do ano evita meses de arquivos soltos e pastas bagunçadas.

A grande vantagem desse sistema é a previsibilidade: qualquer arquivo novo já nasce com um lugar definido — a prova de matemática da 1ª turma vai, sem pensar, em "2026 > 1º Ano A > Matemática". E quando um colega pergunta "cadê a prova do ano passado?", você responde em segundos, porque o padrão não mudou.

Dica de transição: ao final de cada ano, renomeie a pasta do ano anterior para "2025 - Arquivado" em vez de apagar. O histórico fica preservado, o Drive atual fica limpo, e a escola mantém sua memória organizada.`,
  },
  {
    title: "Padrão de nomenclatura de arquivos",
    body: `Um bom nome de arquivo diz tudo sem precisar abrir o arquivo. O padrão mais eficiente para a escola combina: ano, turma, disciplina, tipo de material e data. Um exemplo prático: "2026_1A_Matematica_Prova_Bim1" ou "2026_2B_Ciencias_PlanoAula_Semana3".

Por que isso importa tanto? Porque a busca do Drive funciona melhor com nomes descritivos, porque a lista de arquivos fica automaticamente ordenada de forma lógica quando o ano vem primeiro, e porque qualquer pessoa — inclusive quem assume a turma no meio do ano — entende o conteúdo sem perguntar.

Evite nomes como "final.docx", "novo (2).docx" ou "sem título". Eles não dizem nada e geram infinitas versões confusas. Se um arquivo tem várias versões, use um sufixo claro: "Prova_Bim1_FINAL" ou "Prova_Bim1_v2" — e apague as versões antigas quando a definitiva for criada.

Dica para combinar com a equipe: leve o padrão de nomenclatura para a reunião pedagógica e definam juntos. Quando toda a escola usa o mesmo formato, a busca por qualquer material vira um processo padronizado e rápido — e os alunos aprendem o hábito copiando o exemplo dos professores.`,
  },
  {
    title: "Usar cores e ícones em pastas",
    body: `O Drive permite colorir as pastas para facilitar a identificação visual. Clique com o botão direito sobre uma pasta, escolha "Alterar cor" e selecione a cor desejada. É simples, mas muda completamente a navegação: com cores definidas, seu cérebro encontra a pasta certa sem nem ler o nome.

Um sistema de cores que funciona bem na escola: uma cor por disciplina (verde para Ciências, azul para Matemática, vermelho para Português), ou uma cor por tipo de material (amarelo para planejamento, roxo para avaliações, azul para materiais de apoio). O importante é definir um padrão e seguir.

Há também os ícones por tipo de arquivo: o Drive mostra automaticamente o ícone de cada formato (documento, planilha, apresentação, PDF), o que já ajuda a diferenciar o conteúdo de uma olhada. Para pastas, você pode combinar cor e emoji no nome — por exemplo, "📝 Planos de aula" — usando o emoji direto no nome da pasta.

Cuidado com um detalhe: cores ajudam quem conhece o padrão, mas atrapalham quem não sabe o que cada cor significa. Combine o sistema de cores com nomes claros, e explique o padrão para a equipe na reunião de início de ano.`,
  },
  {
    title: "Atalhos e arquivos marcados com estrela",
    body: `Os atalhos e as estrelas são as duas ferramentas do Drive para quem quer acesso rápido aos materiais mais usados. A estrela funciona como um favorito: clique com o botão direito em um arquivo ou pasta e escolha "Adicionar à estrela" — ou clique na estrela vazia ao lado do nome na visualização em lista. Depois, basta abrir o item "Com estrela" no menu lateral para ver tudo que você marcou.

O atalho é diferente: ele é um ponteiro para um arquivo que está em outro lugar. Por exemplo, se o material oficial está no Drive compartilhado da escola, você pode criar um atalho dele no seu Meu Drive — o arquivo original continua no lugar, e você tem um acesso rápido sem duplicar nada. Para criar, use o botão direito > "Adicionar atalho ao Drive".

O uso combinado na rotina do professor: marque com estrela os arquivos que você abre toda semana (a planilha de notas, o plano de aula da semana, a lista de chamada) e use atalhos para materiais institucionais que moram em outros lugares.

Dica: organize por estrela também as pastas mais usadas, não só arquivos. Uma pasta com estrela de "2026 > 2º Ano B > Português" reduz o caminho até seus materiais do dia a dia a um único clique.`,
  },
  {
    title: "Criar modelos reutilizáveis de documentos",
    body: `Um modelo (template) é um documento pronto para ser copiado e usado repetidas vezes, sem precisar montar do zero. Para o professor, é um dos maiores ganhos de produtividade do Drive: a prova, o plano de aula, o bilhete aos pais e a lista de presença podem ser modelos que você apenas copia e preenche.

Na prática, funciona assim: monte o documento modelo com o formato perfeito — cabeçalho com o nome da escola, campos para preencher, espaços para nome do aluno e data. Depois, para cada uso, clique com o botão direito no arquivo e escolha "Fazer uma cópia". A cópia vem com tudo, e você só preenche o conteúdo novo.

O Drive ainda facilita isso com o botão "Novo" > "Google Docs" > "A partir de um modelo": a galeria oficial do Google oferece modelos de currículo, carta e relatório. Mas o seu modelo personalizado — com a identidade da sua escola — será sempre o mais útil.

Dica de organização: crie uma pasta "Modelos" dentro do seu Drive e mantenha ali as versões atualizadas. Para trabalhos dos alunos, considere criar o modelo como "atividade do Classroom" com cópia individual para cada aluno — aí cada estudante recebe automaticamente a própria cópia, sem bagunça.`,
  },
  {
    title: "Limpeza periódica de arquivos desnecessários",
    body: `Um Drive sem manutenção vira um depósito: versões antigas de provas, fotos repetidas, rascunhos abandonados, arquivos "final final (2)". A limpeza periódica não é luxo — é o que mantém o Drive rápido de usar e fácil de navegar.

Reserve um momento a cada fim de bimestre (15 minutos bastam) para uma varredura: abra "Recentes" e "Meu Drive", identifique versões antigas de documentos que já têm versão final, mova para a Lixeira os arquivos sem uso e esvazie a Lixeira ao final. Use a busca com filtros de data para encontrar materiais antigos: "before:2025-12-31" mostra tudo o que não é tocado há muito tempo.

Antes de excluir, siga a regra dos três passos: 1) confira se o arquivo não é a única cópia de algo importante; 2) verifique se não é um material oficial que deveria estar no Drive compartilhado; 3) em caso de dúvida, arquive (mova para uma pasta "Arquivado - 2025") em vez de excluir.

Dica institucional: combine com a coordenação um calendário de limpeza — por exemplo, primeira semana de cada mês. Um Drive escolar limpo e organizado é mais do que estética: é o que permite que o conhecimento da escola seja encontrado por todos, sempre que precisarem.`,
  },
];


// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.2 Google Docs
// ──────────────────────────────────────────

const docsLessons: LessonData[] = [
  {
    title: "O que é o Google Docs e vantagens sobre o Word",
    video: "https://www.youtube.com/watch?v=Vy0EuXk7bW0",
    body: `O Google Docs é o editor de textos do Google, e ele funciona direto no navegador — sem precisar instalar nada, sem pagar licença e sem depender de um computador específico. Para entender a diferença para o Word: o Word é um programa instalado na sua máquina; o Docs é um serviço na nuvem, que você abre pelo navegador e que salva tudo automaticamente enquanto você digita.

A maior vantagem para o professor é o salvamento automático e o acesso de qualquer lugar. Esqueceu de salvar? Não existe isso no Docs — cada tecla digitada já é salva na hora. E como o arquivo fica no Drive, você abre o mesmo documento em casa, na escola ou no celular, sempre na versão mais atual.

A segunda grande vantagem é a colaboração: várias pessoas podem editar o mesmo documento ao mesmo tempo, de computadores diferentes, vendo as mudanças em tempo real. Isso transforma o trabalho em grupo — dos professores e dos alunos — em algo muito mais simples.

Por fim, o Docs é gratuito e funciona em qualquer navegador moderno, inclusive em computadores antigos da escola que não suportariam o Word. É a ferramenta ideal para padronizar o trabalho de toda a equipe pedagógica.`,
  },
  {
    title: "Criar, nomear e organizar documentos",
    body: `Para criar um documento no Docs, abra o Drive e clique em "Novo" > "Google Docs" > "Documento em branco". O documento abre numa nova aba, pronto para uso. Outra forma: acesse docs.google.com e clique no botão "+" ou no modelo em branco.

O primeiro hábito a criar é nomear o documento imediatamente. O nome padrão é "Documento sem título" — clique nele, no topo da página, e digite o nome seguindo o padrão combinado na escola, por exemplo "2026_1A_Portugues_PlanoDeAula_Semana5". Um bom nome é o que permite encontrar o arquivo pela busca meses depois.

Todos os documentos criados no Docs aparecem automaticamente no seu Drive, na pasta "Meu Drive", e podem ser movidos para pastas específicas sem problema: clique no título do documento e depois em "Mover", ou arraste o arquivo na janela do Drive.

Dica de rotina: crie uma pasta "2026" com as subpastas das turmas e disciplinas e guarde cada documento no seu lugar desde o primeiro dia. Organizar na criação é dez vezes mais rápido do que organizar depois, quando a lista de documentos já está grande.`,
  },
  {
    title: "Formatação básica: fonte, tamanho, negrito, itálico",
    body: `A barra de ferramentas do Docs fica no topo do documento e concentra as formatações que você usa o tempo todo. Para formatar um trecho, primeiro selecione o texto com o mouse (ou Ctrl+A para selecionar tudo) e depois aplique a formatação — assim ela vale apenas para o trecho escolhido.

A fonte padrão é a Arial 11, mas você pode trocar no menu de fontes (por exemplo, para a Arial 12, mais confortável para alunos), ajustar o tamanho, e aplicar negrito (Ctrl+B), itálico (Ctrl+I) e sublinhado (Ctrl+U) com os botões ou atalhos. Existe também a cor do texto e o realce (marcador), ótimos para destacar trechos importantes de um plano de aula.

Além das formatações de letra, o Docs tem estilos de parágrafo no menu "Formatar" > "Estilos de parágrafo": "Título 1", "Título 2" e "Texto normal". Usar os estilos em vez de apenas aumentar a fonte é o segredo para montar documentos com aparência profissional e com sumário automático — assunto das próximas aulas.

Dica de acessibilidade: para materiais que os alunos vão ler na tela, prefira fontes sem serifa (Arial, Verdana) e tamanho 12, com espaçamento entre linhas 1,5. Textos mais legíveis são textos que os alunos realmente leem.`,
  },
  {
    title: "Parágrafos, alinhamento e espaçamento",
    body: `Um documento bem formatado começa pelos parágrafos. No Docs, você controla o alinhamento do texto pela barra de ferramentas: alinhar à esquerda (padrão, mais indicado para textos longos), centralizar (para títulos e capas), à direita (para datas e assinaturas) e justificar (texto alinhado nas duas margens, comum em documentos formais).

O espaçamento entre linhas faz uma diferença enorme na leitura. Com o texto selecionado, clique em "Formatar" > "Espaçamento entre linhas e parágrafos" e escolha 1,5 ou 2,0 — o espaçamento duplo é o padrão em trabalhos acadêmicos e em textos que serão corrigidos com anotações. Você também pode adicionar espaço antes ou depois de cada parágrafo para separar blocos de texto.

Para criar um parágrafo novo, basta apertar Enter. Para recuo (parágrafo iniciando mais à direita, como em citações), use a tecla Tab ou o menu "Formatar" > "Alinhar e recuar" > "Recuar".

Dica pedagógica: quando os alunos digitarem trabalhos no Docs, oriente-os a usar o recuo de primeira linha e o espaçamento 1,5. Um texto com respiração visual correta é muito mais agradável de corrigir — e ensina os alunos a produzir documentos profissionais desde cedo.`,
  },
  {
    title: "Inserir imagens, links e tabelas",
    body: `Para deixar seus materiais ricos e visuais, o Docs permite inserir imagens, links e tabelas em qualquer ponto do documento. Para uma imagem, posicione o cursor onde ela deve entrar, clique em "Inserir" > "Imagem" e escolha de onde trazê-la: do computador, do Drive, por URL ou até por pesquisa direta no Google dentro do próprio Docs.

Os links funcionam assim: selecione o texto que será o link, clique no ícone de corrente (ou Ctrl+K) e cole o endereço. O texto vira um link clicável — ideal para referenciar vídeos, sites e materiais sem precisar colar URLs gigantes no meio do texto.

As tabelas organizam informações em grade: "Inserir" > "Tabela" e escolha o tamanho (por exemplo, 4 colunas e 6 linhas para um quadro de horários). Depois de criada, você clica nas células e preenche; os menus da tabela permitem adicionar ou remover linhas e colunas.

Dica prática: para material didático, uma tabela bem montada vale mais que uma página de texto. O quadro de rotina semanal, o comparativo de períodos históricos e a lista de conteúdos do bimestre ficam claros em tabela — e os alunos assimilam a informação visualmente.`,
  },
  {
    title: "Cabeçalho, rodapé e numeração de páginas",
    body: `O cabeçalho e o rodapé são as áreas que se repetem em todas as páginas do documento — perfeitos para o nome da escola, o nome do professor e o nome da disciplina. Para ativá-los, clique duas vezes na área branca acima do texto (cabeçalho) ou abaixo (rodapé), ou use "Inserir" > "Cabeçalhos e números de página".

A numeração de páginas fica no mesmo menu: "Inserir" > "Cabeçalhos e números de página" > "Número de página". Você escolhe a posição (topo ou rodapé) e se a primeira página (capa) deve ser contada. Para provas e avaliações, a numeração é praticamente obrigatória — facilita a conferência das páginas entregues.

Dica importante para provas: inclua no cabeçalho o nome da escola, a disciplina, a turma, a data e "PROVA BIMESTRAL 1". E defina a numeração começando depois da capa, se houver. Esse padrão dá um acabamento profissional e evita confusões com páginas soltas.

Uma observação útil: o cabeçalho e o rodapé ficam iguais em todo o documento, mas você pode ter seções diferentes (por exemplo, capa sem cabeçalho e conteúdo com cabeçalho) usando "Inserir" > "Quebra" > "Quebra de seção". É um recurso avançado, mas muda a vida de quem produz avaliações profissionais.`,
  },
  {
    title: "Estilos de título e sumário automático",
    body: `Os estilos de título são a ferramenta mais subestimada do Docs — e a que mais profissionaliza um documento. Em vez de aumentar a fonte manualmente, use "Título 1" para os capítulos e "Título 2" para as subdivisões, pelo menu de estilos na barra de ferramentas (ou "Formatar" > "Estilos de parágrafo").

A mágica acontece quando você insere o sumário: posicione o cursor no começo do documento, clique em "Inserir" > "Sumário" e escolha um estilo. O Docs monta automaticamente a lista de capítulos com as páginas — e ela se atualiza sozinha conforme você edita o documento. No sumário com links, qualquer pessoa (inclusive o aluno) clica no capítulo e pula direto para ele.

Para um plano de curso ou um material didático longo, essa é a diferença entre um documento que as pessoas leem e um que elas abandonam no meio. O sumário mostra a estrutura do conteúdo de uma olhada e permite navegar rapidamente.

Dica: para montar um material didático profissional, organize o conteúdo em Título 1 (unidades), Título 2 (capítulos) e Título 3 (seções) desde o início. Você verá o painel "Estrutura do documento" à esquerda (ícone de lista), que funciona como um índice lateral sempre visível — e ótimo para o aluno se situar no material.`,
  },
  {
    title: "Ditar texto por voz",
    body: `O Docs tem um ditado por voz que transforma o que você fala em texto — e é uma ferramenta revolucionária tanto para você quanto para os alunos. Para ativar, abra o menu "Ferramentas" > "Digitação por voz" (ou o atalho Ctrl+Shift+S no Windows). Um microfone aparece na tela; clique nele, autorize o uso do microfone quando o navegador pedir e comece a falar.

O reconhecimento funciona muito bem em português: fale pausadamente e o texto aparece na hora, no ponto onde o cursor está. Você pode ditar pontuação falando "vírgula", "ponto final", "ponto de interrogação", e comandos como "nova linha" e "novo parágrafo". Para um exemplo: "O plano de aula de hoje vírgula ponto final" produz "O plano de aula de hoje,".

Para o professor, o ditado é perfeito para escrever relatórios de alunos, feedbacks longos e planos de aula enquanto pensa em voz alta. Para os alunos, é um recurso de acessibilidade fundamental: estudantes com dificuldade de digitação ou dislexia conseguem produzir textos completos falando.

Dica de uso: escolha um ambiente silencioso, fale de forma clara e confira o texto ao final. E atenção a um detalhe: o ditado funciona apenas no navegador Google Chrome. Em outros navegadores, o recurso pode não aparecer no menu.`,
  },
  {
    title: "Baixar como PDF ou Word",
    body: `Um documento do Docs precisa, às vezes, sair do mundo Google — para ser impresso, enviado por e-mail ou entregue em formato específico. Para isso, use o menu "Arquivo" > "Baixar" e escolha o formato: "Documento PDF (.pdf)" para a versão final e "Documento Word (.docx)" para quem vai editar em outro programa.

O PDF é o formato ideal para materiais prontos: provas, comunicados e apostilas. Ele congela a aparência — qualquer pessoa abre e imprime exatamente como você viu, em qualquer computador, sem risco de o texto "desformatar". Enviar um PDF da prova para a gráfica da escola é garantia de que vai sair igualzinho.

O Word (.docx) é útil quando alguém da equipe ainda trabalha no Word e precisa receber o arquivo editável. O Docs converte tudo (texto, imagens, tabelas), e pode haver pequenas diferenças de formatação — vale conferir o arquivo convertido antes de enviar.

Dica profissional: para transformar em PDF com uma aparência impecável, configure antes a página em "Arquivo" > "Configuração da página" (margens e orientação), confira o documento no modo de impressão (Ctrl+Shift+P no navegador) e só então exporte. Lembre também que o próprio Docs imprime direto pelo navegador — sem precisar baixar nada — usando Ctrl+P e escolhendo a impressora da escola.`,
  },
  {
    title: "Usar modelos prontos (templates)",
    body: `Um modelo pronto (template) é um documento com o formato já definido, pronto para ser preenchido. O Google Docs oferece uma galeria inteira de modelos gratuitos: quando você clica em "Novo" > "Google Docs", o Docs mostra opções como currículo, carta, relatório e boletim informativo — cada um com design profissional já montado.

Para o professor, os modelos oficiais são um bom ponto de partida, mas o modelo mais valioso é o seu: a prova com o cabeçalho da escola, o plano de aula com os campos que você usa, o bilhete aos pais. Monte uma vez, e toda semana é só copiar e preencher.

A melhor forma de usar modelos no dia a dia é criá-los como cópia: para cada uso, clique com o botão direito no arquivo modelo (dentro do Drive) e escolha "Fazer uma cópia". Assim o modelo original fica intacto e cada novo documento nasce com o formato perfeito.

Dica do Classroom: quando for passar um modelo de atividade para a turma, use o Google Classroom com a opção "Fazer uma cópia para cada aluno". Cada estudante recebe a própria cópia individual — o que elimina a confusão clássica de "todo mundo editando o mesmo arquivo".`,
  },
  {
    title: "Compartilhar documento com alunos e colegas",
    body: `O compartilhamento é o recurso que transforma o Docs de um editor de textos comum em uma ferramenta de trabalho em equipe. Para compartilhar, clique no botão azul "Compartilhar" no canto superior direito e digite o e-mail das pessoas — ou gere um link para colar no Classroom, no e-mail ou no WhatsApp.

Ao compartilhar, você define a permissão de cada pessoa: "Visualizador" (só lê), "Comentador" (lê e comenta, sem editar) e "Editor" (pode alterar). Para material de apoio enviado aos alunos, use "Visualizador"; para receber feedback de um colega, "Comentador"; para trabalho conjunto, "Editor".

Dois detalhes fazem toda a diferença na prática: 1) compartilhar com e-mails específicos dá controle total — você vê quem tem acesso e pode remover alguém a qualquer momento; 2) para turmas grandes, o link com permissão de "visualizador" é mais prático do que adicionar 30 e-mails um por um.

Dica de segurança: antes de enviar uma prova ou gabarito, confira a permissão do link. O padrão seguro é "Restrito" ou "Qualquer pessoa com o link - visualizador". Uma prova com permissão de edição em um link compartilhado pode ser alterada por quem não deveria — proteção a mais nunca é demais.`,
  },
  {
    title: "Editar o mesmo documento com colegas simultaneamente",
    video: "https://www.youtube.com/watch?v=1Ntj_F9z2Mo",
    body: `A edição simultânea é o superpoder do Google Docs: duas, cinco ou trinta pessoas podem abrir o mesmo documento ao mesmo tempo e editar em conjunto, vendo as alterações acontecerem em tempo real, como um quadro compartilhado.

Na prática, funciona assim: você compartilha o documento com permissão de "Editor". Quando alguém abre, o Docs mostra no topo o aviso "Vários editores estão visualizando este documento" — e no canto superior direito aparecem os avatares (fotos ou iniciais) de quem está editando junto com você.

Cada pessoa digita no seu próprio ritmo, no trecho que escolheu, e o texto aparece para todos na hora. Se dois editores mudarem o mesmo trecho ao mesmo tempo, o Docs exibe um aviso para evitar conflito — mas, na prática, cada um trabalhando em uma seção diferente, tudo flui sem atrito.

Dica de organização para a equipe: em um plano de aula colaborativo, combine antes quem escreve cada seção (um a introdução, outro as atividades, outro a avaliação). E veja o documento em tempo real na tela da lousa digital para o planejamento coletivo: cada colega vê o próprio texto aparecendo, e a reunião pedagógica vira uma construção em grupo.`,
  },
  {
    title: "Identificar quem está editando pelo cursor colorido",
    body: `Quando várias pessoas editam o mesmo documento, o Docs atribui a cada uma um cursor de cor própria. Se você vê um cursor colorido se movendo pelo texto, é um colega digitando ao vivo — e a cor do cursor corresponde à cor do avatar no canto superior direito.

Esse recurso é mais útil do que parece. Na correção de trabalhos em grupo, você consegue ver quem está escrevendo o quê, em tempo real, sem precisar perguntar. Se o cursor de um aluno está parado há muito tempo, é sinal de que ele parou de trabalhar — e você pode intervir na hora, com um comentário amigável.

Para identificar cada pessoa de forma confiável, o Docs usa a foto do perfil Google. Se a foto for padrão (o bonequinho cinza), ficam todos iguais; por isso, vale pedir aos alunos que coloquem uma foto reconhecível no perfil — além de deixar a turma mais pessoal.

Dica pedagógica: use os cursores coloridos como ferramenta de gestão em trabalhos em grupo. Projete o documento na lousa e peça que cada grupo abra a própria cópia: você acompanha em tempo real quem está ativo, quem precisa de ajuda e quem ainda nem começou — sem circular pela sala ou esperar o prazo para descobrir.`,
  },
  {
    title: "Usar comentários para dar e receber feedback",
    body: `Os comentários são a forma do Docs de fazer anotações sem mexer no texto. Para comentar, selecione o trecho, clique no ícone de balão de comentário (ou use o atalho Ctrl+Alt+M) e escreva. O trecho fica destacado com uma marca colorida, e o comentário fica na margem direita.

Os comentários são a ferramenta ideal para corrigir trabalhos: em vez de escrever "leia de novo" no final do texto, você marca o parágrafo exato e escreve "aqui o argumento precisa de um exemplo" — o aluno entende exatamente o que ajustar. Quem recebe pode responder ao comentário, criando uma conversa sobre o trecho, e marcar como "Resolvido" quando a correção for feita.

Para envolver alguém na conversa, digite "@" e o e-mail da pessoa dentro do comentário: ela recebe uma notificação por e-mail. Isso é ótimo para acionar colegas na revisão de um documento: "@professora_maria, você pode revisar a seção de avaliação?"

Dica de avaliação formativa: nos comentários, prefira perguntas a ordens — "Você consegue dar um exemplo aqui?" em vez de "Falta exemplo". Feedback em forma de pergunta convida o aluno a pensar e melhora muito a qualidade da reescrita. E registre no comentário a data, para você mesmo acompanhar a evolução de cada versão.`,
  },
  {
    title: "Sugerir alterações sem editar diretamente",
    body: `O modo "Sugerir" é a versão do Docs para quem quer propor mudanças sem alterar o texto original — a forma mais segura de corrigir o trabalho de alguém. Para ativar, clique no menu de modo no canto superior direito (hoje marcado como "Editando") e mude para "Sugerindo".

No modo Sugerir, tudo o que você digita aparece como sugestão: o texto novo fica verde e sublinhado, o texto removido fica riscado em vermelho, e cada mudança é registrada como uma proposta à margem. O dono do documento vê todas as sugestões e decide, uma a uma, se aceita ou rejeita — nada muda no texto sem a aprovação dele.

Esse recurso é ouro para a correção de redações e trabalhos: você corrige como faria com caneta vermelha, mas o aluno vê exatamente o que foi proposto e por quê, e pode aceitar as sugestões que fizerem sentido. Também é ideal para revisão entre colegas — o plano de aula do colega volta com sugestões construtivas, sem quebrar o trabalho original.

Dica: combine o modo Sugerir com os comentários. Use as sugestões para corrigir o texto e os comentários para explicar o porquê. O aluno recebe uma aula particular de escrita a cada trabalho corrigido — e a reescrita se torna um diálogo, não uma imposição.`,
  },
  {
    title: "Aceitar ou rejeitar sugestões",
    body: `Quando alguém edita seu documento no modo Sugerir, todas as propostas aparecem como alterações pendentes: texto novo em verde, remoções riscadas em vermelho. Cabe a você, como dono do documento, decidir o destino de cada uma — essa é a beleza do sistema: ninguém altera seu texto sem sua aprovação.

Para aceitar, clique no ícone de check (marca de aceitar) que aparece ao lado da sugestão — o texto novo entra de vez e o risco vermelho some. Para rejeitar, clique no ícone de X: a sugestão é descartada e o texto volta a ser como era. No canto superior direito, os botões com setas permitem navegar entre as sugestões em ordem, e o menu "Aceitar tudo" ou "Rejeitar tudo" resolve de uma vez quando a revisão é grande.

Uma dica importante: mesmo depois de aceitar ou rejeitar, você pode desfazer usando Ctrl+Z imediatamente. E se quiser ver o histórico completo do que foi sugerido e decidido, o "Histórico de versões" guarda tudo — assunto da próxima aula.

Dica pedagógica: quando o aluno devolver o trabalho corrigido, peça que ele aceite as sugestões com as quais concorda e rejeite as que não entendeu — e que explique o porquê nos comentários. Esse exercício transforma a correção em aprendizado ativo: o aluno não só recebe o feedback, como interage com ele.`,
  },
  {
    title: "Histórico de versões e como restaurar versões anteriores",
    body: `O histórico de versões é a máquina do tempo do Docs: ele guarda um registro de todas as versões do documento, com data, hora e o nome de quem estava editando. Para acessar, clique em "Arquivo" > "Histórico de versões" > "Ver histórico de versões" (ou Ctrl+Alt+Shift+H).

Na tela do histórico, a versão mais recente fica no topo e as anteriores abaixo, cada uma com data e hora. Clique em qualquer versão para ver o documento como estava naquele momento — as alterações em relação à versão atual aparecem destacadas, e à direita você vê quem fez o quê.

O mais poderoso: você pode restaurar qualquer versão anterior. No topo da tela do histórico, clique nos três pontinhos da versão desejada e escolha "Restaurar esta versão". O documento volta a ser como era naquele momento — mas sem apagar o histórico, que continua guardado.

Quando isso salva um professor: um aluno apaga um capítulo inteiro por acidente; alguém sobrescreve um plano de aula; uma versão do gabarito foi alterada por engano. Em todos os casos, o histórico resolve em três cliques. Para eventos importantes, você pode até criar uma "versão nomeada" (por exemplo, "Antes da revisão da coordenação") — clique nos três pontinhos da versão e escolha "Nomear esta versão".`,
  },
  {
    title: "Trabalho em grupo de alunos com um único documento",
    body: `O trabalho em grupo com um único documento é um dos usos mais transformadores do Docs na escola — e também um dos que mais exigem organização. A ideia: o grupo inteiro trabalha em um só documento compartilhado, com todos como editores, em vez de cada um fazer uma parte separada e juntar no final (com a clássica bagunça de formatos e versões).

A organização vem do planejamento antes da escrita. No início do trabalho, peça que o grupo crie o esqueleto: títulos das seções (Introdução, Desenvolvimento, Conclusão) já no lugar certo. Depois, cada aluno assume uma seção — com os cursores coloridos, você vê quem está trabalhando em qual parte em tempo real.

O grande aprendizado pedagógico desse formato é a negociação: como todos veem o texto uns dos outros, os conflitos de conteúdo aparecem na hora e precisam ser resolvidos conversando — usando os comentários do próprio documento. O professor acompanha o processo, não só o resultado final, e pode orientar nos momentos de impasse.

Dica para evitar os problemas clássicos: combine antes quem edita o quê (para não haver dois alunos mudando o mesmo parágrafo), peça que conversem pelos comentários em vez de apagar o texto um do outro, e use o histórico de versões como registro do processo — ele mostra quem realmente contribuiu em cada etapa, o que torna a avaliação do trabalho em grupo muito mais justa.`,
  },
  {
    title: "Boas práticas para não sobrescrever o trabalho de outros",
    body: `Sobrescrever o trabalho de outra pessoa é o acidente mais comum (e mais frustrante) em documentos compartilhados. A boa notícia: quase todos os acidentes podem ser evitados com três práticas simples — e o Docs ainda tem proteção automática para os casos difíceis.

A primeira prática é o combinado de territórios: cada pessoa edita a sua seção, claramente marcada pelos títulos do documento. Se todos respeitam o território combinado, os cursores coloridos nunca invadem o trabalho do colega. A segunda é conversar antes de mudar o texto alheio: em vez de apagar o parágrafo do colega, comente "posso reescrever essa parte?" — e espere a resposta.

A terceira é saber usar o modo Sugerir quando a mudança é grande: sugerir em vez de editar dá ao dono do texto o controle de aceitar ou rejeitar. E, mesmo assim, se algo der errado, o Docs tem duas redes de proteção: o "Ctrl+Z" imediato (desfaz a última ação) e o histórico de versões, que restaura qualquer versão anterior do documento — inclusive a que existia antes do acidente.

Dica para a sala de aula: transforme essas práticas em regras combinadas com os alunos no primeiro trabalho em grupo — "cada um na sua seção", "comentário antes de mudar", "sugerir em vez de apagar". Com regras claras desde o início, o trabalho colaborativo ensina o que há de melhor em convivência digital: respeito pelo trabalho do outro.`,
  },
];



// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.3 Google Apresentações
// ──────────────────────────────────────────

const slidesLessons: LessonData[] = [
  {
    title: "Diferença entre Google Apresentações e PowerPoint",
    body: `O Google Apresentações é a ferramenta de slides do Google — o equivalente gratuito e online do PowerPoint. A diferença essencial: o PowerPoint é um programa instalado no computador, enquanto o Google Apresentações roda direto no navegador, salva tudo na nuvem automaticamente e pode ser aberto em qualquer aparelho com internet.

Para o professor, isso resolve os problemas mais comuns das apresentações: o arquivo não cabe no pen drive, o computador da sala não tem o PowerPoint instalado, o aluno abriu e as fontes estavam trocadas. Com o Google Apresentações, a apresentação abre igual em qualquer lugar — basta fazer login na conta Google.

A colaboração também é um diferencial enorme: vários professores podem montar a mesma apresentação juntos, e os alunos podem criar trabalhos em grupo em um único arquivo, vendo as edições em tempo real. O PowerPoint tradicional não tem nada parecido sem configuração complicada.

E, como tudo do Google, o recurso é gratuito: sem licença, sem instalação e sem limite de uso para a escola. Por isso, é a ferramenta padrão para as aulas na lousa digital e para os trabalhos dos alunos.`,
  },
  {
    title: "Criar uma apresentação do zero",
    body: `Para criar uma apresentação, abra o Drive e clique em "Novo" > "Google Apresentações" > "Apresentação em branco". Ela abre em uma nova aba com o primeiro slide já criado — o slide de título. Outra forma: acesse slides.google.com e clique no sinal de "+" ou no modelo em branco.

O primeiro passo, como em tudo no Google, é nomear a apresentação: clique em "Apresentação sem título" no topo e dê um nome claro, por exemplo "2026_2B_Ciencias_SistemaSolar". Depois, monte o slide de título: o título da aula e o subtítulo com seu nome, disciplina e turma.

A estrutura da apresentação cresce pelos slides: para adicionar um novo, use o botão "+" na barra de ferramentas (ou o menu "Inserir" > "Novo slide"). Cada slide novo nasce com um layout padrão com título e área de conteúdo — você pode mudar o layout a qualquer momento pelo menu "Slide" > "Alterar layout".

Dica de planejamento: antes de abrir o Google Apresentações, faça o roteiro no papel (ou na sua cabeça): quantos slides, o que cada um vai mostrar. Apresentações nascem melhores quando a estrutura vem antes do design — e você evita a armadilha de 40 slides com texto corrido que ninguém consegue ler.`,
  },
  {
    title: "Escolher e personalizar temas visuais",
    video: "https://www.youtube.com/watch?v=WabvpG9OAwY",
    body: `Os temas são os estilos visuais prontos da apresentação — a paleta de cores, as fontes e o fundo que se aplicam a todos os slides de uma vez. Para escolher um, abra o menu "Slide" > "Alterar tema" (ou use a barra de ferramentas) e navegue pela galeria: cada tema tem uma combinação de cores e fontes diferente.

Depois de escolher o tema, você pode personalizá-lo. O caminho é o menu "Slide" > "Editar tema": ali você troca a fonte, as cores de destaque e o plano de fundo — e a mudança vale para a apresentação inteira, garantindo consistência visual sem trabalho repetido.

Uma forma de personalização rápida: mudar o fundo de um slide específico com "Slide" > "Alterar plano de fundo" (uma cor sólida ou uma imagem, como o brasão da escola na capa). E a ferramenta "Exibir" > "Cores da marca" permite salvar as cores da escola para usar em qualquer apresentação.

Dica visual: menos é mais. Escolha um tema com fundo claro e texto escuro (ou o inverso) — o contraste é o que garante a leitura na lousa digital. Evite temas com estampas carregadas; o conteúdo do slide deve ser o protagonista, não o fundo.`,
  },
  {
    title: "Adicionar e organizar slides",
    body: `A organização dos slides acontece no painel à esquerda da tela, onde eles aparecem em miniatura, em ordem. Para adicionar um slide novo, clique no "+" da barra de ferramentas — o novo slide entra após o slide selecionado, pronto para receber conteúdo.

Para reorganizar, arraste a miniatura do slide para cima ou para baixo até a posição desejada — a ordem da apresentação segue exatamente a ordem das miniaturas. Você também pode clicar com o botão direito na miniatura para opções como "Duplicar slide" (útil para manter o mesmo layout com conteúdo novo) e "Excluir".

As seções ajudam em apresentações grandes: clique com o botão direito no painel e escolha "Adicionar seção" — você cria divisões com nome (como "Introdução", "Conteúdo", "Atividade"), que funcionam como capítulos na estrutura, fáceis de mover e reorganizar em bloco.

Dica de didática: a estrutura clássica de uma aula na lousa é: 1) slide de abertura com o objetivo; 2) slides de conteúdo, um tópico por slide; 3) slide de atividade prática; 4) slide de fechamento com recado e tarefa. Essa arquitetura mantém a aula com começo, meio e fim — e os alunos sabem sempre onde estão na apresentação.`,
  },
  {
    title: "Inserir texto, imagens, vídeos e GIFs",
    body: `O conteúdo de cada slide é construído com caixas de texto, imagens, vídeos e GIFs. Para o texto, use as caixas que já vêm no layout: clique dentro da caixa e digite. Para adicionar uma nova caixa de texto, "Inserir" > "Caixa de texto" e clique onde ela deve entrar. Para imagens, "Inserir" > "Imagem" e escolha a origem: computador, Drive, pesquisa do Google ou URL.

O recurso que mais encanta alunos: vídeos direto no slide. Em "Inserir" > "Vídeo", você busca um vídeo do YouTube sem sair da apresentação — ele entra como um player dentro do slide, e você pode ajustar o tamanho e definir em qual segundo começar a tocar. O vídeo toca no modo apresentação, sem precisar abrir o YouTube em outra aba.

Os GIFs animados dão vida a slides de introdução e de atividade: baixe um GIF e insira como imagem, ou use "Inserir" > "Imagem" > "Pesquisar na web" e filtre por "GIF". Use com moderação — um GIF pontual para prender a atenção vale mais do que dez GIFs poluindo o conteúdo.

Dica de equilíbrio: a regra dos 6x6 ajuda a manter slides legíveis — no máximo 6 linhas de texto por slide e 6 palavras por linha. O slide é um apoio visual para a sua fala, não o roteiro completo da aula. O texto longo vai nas notas do apresentador (veremos na aula sobre modo apresentador).`,
  },
  {
    title: "Trabalhar com layouts de slide",
    body: `Os layouts são as estruturas prontas de cada slide — a combinação de títulos e áreas de conteúdo que o Google oferece. Ao criar um slide novo, você pode escolher o layout pelo menu "Slide" > "Alterar layout": "Título", "Título e conteúdo", "Duas colunas", "Citação", "Título e imagem" e outros.

Cada layout é uma receita visual pronta: no layout "Duas colunas", por exemplo, você tem duas áreas de conteúdo lado a lado — perfeito para comparar (vantagens x desvantagens, antes x depois). No layout "Título e imagem", a imagem entra grande e centralizada, ideal para capas e fotos de abertura.

Mudar o layout de um slide existente não apaga o conteúdo — o texto e as imagens são reaproveitados no novo arranjo, e você ajusta o que sobrou. Isso permite experimentar estruturas diferentes sem perder o trabalho já feito.

Dica de eficiência: em vez de ajustar cada slide manualmente, monte um "slide modelo" com o layout que você usa sempre (por exemplo, "Título e conteúdo" com a marca da escola) e use "Slide" > "Duplicar slide" como base para os novos. Assim, toda a apresentação nasce com o mesmo padrão visual — e sua aula parece montada por um designer, não por um professor com pressa.`,
  },
  {
    title: "Transições e animações básicas",
    body: `As transições são os efeitos de passagem entre um slide e outro; as animações são os efeitos dentro do próprio slide, sobre elementos individuais (um texto, uma imagem, uma caixa). Para aplicar, selecione o slide ou o elemento, clique em "Inserir" > "Animação" (ou o botão na barra) e escolha o efeito no painel que abre à direita.

As transições mais úteis em aula são as discretas: "Esvair" (fade) e "Deslizar". A regra de ouro é a sobriedade: transições chamativas distraem o conteúdo. Uma transição uniforme em toda a apresentação dá um acabamento profissional — para isso, selecione todas as miniaturas (Ctrl+A no painel) e aplique a transição de uma vez.

As animações têm uma função pedagógica importante: revelar conteúdo progressivamente. Em vez de mostrar as 5 dicas de uma vez, anime-as para aparecerem uma a uma — cada clique revela uma dica, e você mantém a atenção da turma no ponto atual da explicação.

Dica prática: use "Animar" > "Aparecer" (fade) para revelar respostas de perguntas que você faz à turma: clique, espera a resposta dos alunos, clique de novo e revela. É uma técnica simples que transforma o slide em uma ferramenta interativa. Lembre de testar a apresentação antes da aula — efeitos travando na lousa são o clássico vexame tecnológico.`,
  },
  {
    title: "Inserir links e botões de navegação",
    body: `O Google Apresentações permite transformar qualquer elemento — texto, imagem, forma — em um link clicável. Selecione o elemento, clique no ícone de corrente na barra (ou Ctrl+K) e escolha o destino: um endereço da web, um e-mail ou outro slide da própria apresentação.

O recurso mais poderoso para a aula é o link para outro slide: ele cria uma navegação não linear. Por exemplo, um slide "Menu da aula" com botões "Conteúdo", "Atividade" e "Quiz" — cada clique pula para a seção correspondente, e um botão "Voltar ao menu" retorna. É a base de aulas interativas, gincanas e jogos de revisão montados só com apresentações.

Para criar um botão visual, use "Inserir" > "Forma" > "Formas" e escolha um retângulo arredondado; digite o texto do botão, selecione a forma e adicione o link. Você também pode usar as setas de navegação que o Google oferece em "Inserir" > "Forma" > "Setas".

Dica de atividade: monte um "Quiz de revisão" com um slide por pergunta e links de resposta — cada alternativa é um botão que leva ao slide "Correto!" ou "Tente de novo!". Os alunos clicam no botão, veem o resultado e voltam ao quiz. É um jogo completo, pronto em minutos, sem nenhuma ferramenta extra.`,
  },
  {
    title: "Modo apresentador com notas de apoio",
    video: "https://www.youtube.com/watch?v=ZXkve3iOnQo",
    body: `O modo apresentador é o seu "criptonita contra o esquecimento": a tela que só o professor vê durante a apresentação, com o slide atual, o próximo slide, um cronômetro e as notas de apoio. Para ativá-lo, clique no menu de apresentação (o ícone ao lado do botão "Apresentar") e escolha "Ver modo apresentador".

As notas de apoio são a alma desse recurso: em "Ver" > "Mostrar notas do apresentador" (ou clicando no botão de notas embaixo do slide), você escreve o roteiro da fala de cada slide — o que vai dizer, os exemplos, as perguntas para a turma. Durante a apresentação, essas notas aparecem na sua tela, invisíveis para os alunos, que veem apenas o slide.

O modo apresentador também mostra: o tempo decorrido de apresentação (ótimo para controlar a duração da aula), as miniaturas dos próximos slides (para preparar a transição) e um botão de zoom na lousa. Em apresentações com dois monitores (computador + lousa), o aluno vê o slide na lousa e você vê as notas no computador.

Dica profissional: a diferença entre um professor que "lê os slides" e um que "dá uma aula" está nas notas do apresentador. Escreva ali o que você quer dizer — não no slide. O slide fica limpo e visual; a sua fala fica rica e natural, com o apoio silencioso das notas.`,
  },
  {
    title: "Apresentar diretamente pelo navegador",
    body: `Para começar a apresentação, clique no botão "Apresentar" no canto superior direito (ou use o atalho Ctrl+F5). A apresentação abre em tela cheia no navegador, sem precisar de nenhum programa — funciona em qualquer computador com internet e até no celular, conectado à lousa ou ao projetor.

A navegação durante a apresentação: seta para a direita ou barra de espaço avança; seta para a esquerda volta. A tecla F mostra um menu de opções, e a tecla "?" exibe a lista completa de atalhos — útil em um aperto. Para sair, pressione Esc.

Um recurso moderno: o controle remoto pelo celular. Com o aplicativo "Google Apresentações" no celular, você toca em "Apresentar" e usa o aparelho como controle — avança, volta e vê as notas do apresentador na telinha, enquanto a apresentação roda no computador conectado à lousa. Isso permite circular pela sala dando aula, sem ficar preso ao computador.

Dica para a sala de aula: teste a apresentação no computador da lousa antes da aula — abra, avance alguns slides e confira se os vídeos e links funcionam. A frase mais ouvida em escolas é "professor, o vídeo não abre". Testar com antecedência evita os minutos de improviso que fazem a aula perder o ritmo.`,
  },
  {
    title: "Publicar apresentação na web",
    body: `Publicar na web transforma sua apresentação em uma página com link próprio, que qualquer pessoa pode abrir sem fazer login — não precisa de conta Google nem do aplicativo. O caminho: "Arquivo" > "Compartilhar" > "Publicar na web", e depois clique em "Publicar" confirmando a permissão.

A publicação gera um link (e um código de incorporação, se quiser colocar a apresentação em um site ou blog da escola). Ela fica disponível como uma versão estática da apresentação, ideal para: enviar o material da aula para os alunos que faltaram, disponibilizar os slides para estudo em casa, e montar um acervo de apresentações da escola acessível por um link.

Importante entender a diferença: o "Publicar na web" cria um link aberto, sem controle de quem acessa. O "Compartilhar" normal (com e-mails ou link restrito) mantém o controle de permissões. Para conteúdo sensível, como provas, use sempre o compartilhamento restrito — a publicação aberta é para material público, como apostilas e apresentações de apresentação.

Dica: combine a publicação com o Google Classroom. Publique a apresentação da semana, cole o link na atividade do Classroom e os alunos acessam pelo celular mesmo sem ter o aplicativo de apresentações instalado. E ao publicar, marque a opção de republicar automaticamente quando houver mudanças — assim o link dos alunos sempre mostra a versão atualizada.`,
  },
  {
    title: "Compartilhar apresentação com alunos e colegas",
    body: `O compartilhamento de apresentações funciona exatamente como no Docs: clique no botão "Compartilhar" no canto superior direito, digite os e-mails ou gere um link, e defina as permissões — Visualizador, Comentador ou Editor.

As boas práticas mudam conforme o destino: para material de apoio (os slides da aula para os alunos), use "Visualizador" — eles consultam, mas não mexem no original. Para revisão de um colega, "Comentador" permite que ele marque sugestões sem risco de alterar o conteúdo. Para trabalhos em grupo, "Editor" com os integrantes do grupo.

Um detalhe do Google Apresentações: os vídeos do YouTube e os links continuam funcionando para quem recebe a apresentação compartilhada — os alunos conseguem assistir aos vídeos direto na apresentação compartilhada, o que torna o material de apoio muito mais rico.

Dica de fluxo de trabalho: para reuniões pedagógicas, compartilhe a apresentação como "Editor" com os colegas e peça contribuições nos comentários — cada professor comenta os pontos da própria área. Depois, na reunião, apresentem juntos, com cada um apresentando sua parte, e a apresentação vira o registro coletivo da reunião, acessível a todos depois.`,
  },
  {
    title: "Edição colaborativa de apresentações em equipe",
    body: `A edição colaborativa no Google Apresentações é o mesmo superpoder do Docs, com um bônus: cada pessoa trabalha em slides diferentes, em vez de trechos de texto. Um grupo de cinco alunos pode dividir a apresentação — cada um responsável pelos próprios slides — e todos veem o resultado crescer em tempo real.

Na prática: compartilhe a apresentação com o grupo como "Editor". Cada integrante abre, escolhe os slides de que é responsável (por exemplo, os slides 3 a 6) e edita. Os cursores coloridos e os avatares no canto superior direito mostram quem está online e em qual slide. Se dois alunos editarem o mesmo slide ao mesmo tempo, o Google avisa, e um se move para outro slide — ou conversam pelos comentários.

Para o professor, o grande valor é o processo: com o histórico de versões (Arquivo > Histórico de versões), você vê quem criou cada slide e quando — a divisão de trabalho fica transparente, e a avaliação do trabalho em grupo se torna muito mais justa.

Dica de organização: no primeiro slide, peça que o grupo escreva o "mapa de divisão" — quem ficou responsável por quais slides. Além de organizar, esse mapa vira um combinado visível para todos, e você (professor) acompanha o cumprimento de longe, sem precisar pedir relatórios.`,
  },
  {
    title: "Comentários e feedback em slides",
    body: `Os comentários no Google Apresentações funcionam como no Docs, mas com um detalhe especial: você comenta sobre o slide inteiro, ou sobre um elemento específico (uma imagem, um texto, um gráfico). Selecione o elemento, clique no balão de comentário (ou Ctrl+Alt+M) e escreva — o comentário fica ancorado naquele elemento, com uma marcação visual.

Para o professor, os comentários são a forma de feedback em trabalhos de apresentação: "aqui o slide está muito cheio de texto, divida em dois", "ótimo uso de imagem nesta capa", "não ficou claro o que é a fonte desta informação". O aluno responde ao comentário, ajusta o slide e marca como "Resolvido" — criando um registro do diálogo de revisão.

Para mencionar uma pessoa, use "@" e o e-mail dentro do comentário: ela recebe a notificação e é chamada para a conversa. Isso é perfeito para feedback da coordenação: "@coordenadora, revisei o slide 5, pode conferir?".

Dica de avaliação: peça que os grupos troquem apresentações e comentem os slides uns dos outros antes da entrega final — a revisão por pares. Com um roteiro de comentários ("aponte 2 pontos fortes e 1 sugestão em cada seção"), os alunos praticam análise crítica e a qualidade média dos trabalhos sobe muito antes de chegar à sua correção.`,
  },
  {
    title: "Trabalho em grupo: alunos criando apresentações juntos",
    body: `Apresentações em grupo é uma das atividades mais completas do ponto de vista pedagógico: exige pesquisa, síntese, organização visual e comunicação. Com o Google Apresentações, o processo colaborativo é transparente e os problemas clássicos (um faz tudo, outro não faz nada, arquivo perdido) ficam visíveis — e solucionáveis.

A estrutura recomendada para o trabalho: o grupo cria a apresentação compartilhada, divide os slides no primeiro encontro (registrado no primeiro slide, como vimos), e cada um pesquisa e monta a própria parte ao longo da semana. O professor acompanha pelo histórico de versões: dá para ver quem editou quando, e intervir cedo se alguém está parado.

O momento de glória é a apresentação: cada integrante apresenta os próprios slides, usando o modo apresentador com as próprias notas — e o professor vê quem realmente domina o conteúdo. A apresentação compartilhada também fica disponível para toda a turma depois, como material de revisão do conteúdo apresentado.

Dica de avaliação justa: use o histórico de versões para avaliar a contribuição individual (quantidade e qualidade das edições de cada um) combinado com a apresentação oral. E oriente os grupos a usar um modelo de apresentação padrão da turma — o resultado fica uniforme e profissional, e o foco do julgamento é o conteúdo, não o design.`,
  },
  {
    title: "Permissões de edição vs visualização para a turma",
    body: `A escolha entre dar permissão de edição ou de visualização para os alunos é uma decisão pedagógica — e entender a diferença evita os dois erros clássicos: alunos bagunçando o material do professor, e alunos impossibilitados de fazer a atividade.

Visualizador é para o material do professor: os slides da aula, a apostila, o gabarito. O aluno abre, lê e estuda — mas não consegue alterar nada. É a permissão segura para qualquer conteúdo que você não quer que seja modificado, e a ideal para distribuir material de apoio pelo link do Classroom.

Editor é para o trabalho dos alunos: o arquivo da atividade em grupo, o modelo de trabalho que cada um deve preencher. Aqui vale o detalhe do Classroom: ao anexar um arquivo como atividade, escolha "Fazer uma cópia para cada aluno" — cada estudante recebe a própria cópia individual com permissão de edição, sem ninguém mexer no trabalho do outro.

A permissão intermediária, Comentador, tem um uso valioso em sala: entregue a apresentação dos colegas como "comentador" para a turma na atividade de revisão por pares — eles comentam e sugerem, mas não alteram o conteúdo alheio.

Dica de segurança: na dúvida, comece sempre como "Visualizador" e aumente a permissão se precisar. Rebaixar (tirar edição) depois que alguém bagunçou o arquivo é sempre mais trabalhoso do que conceder a permissão certa desde o início.`,
  },
];



// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.4 Google Forms
// ──────────────────────────────────────────

const formsLessons: LessonData[] = [
  {
    title: "O que é o Google Forms e usos na educação",
    body: `O Google Forms é a ferramenta de formulários do Google: você monta perguntas, envia o link e as respostas chegam organizadas automaticamente, sem precisar digitar nada. Para o professor, ele substitui com vantagem as listas de papel, os "levantem a mão quem..." e as provas digitadas à mão.

Os usos na educação são infinitos: pesquisa de opinião com a turma ("qual tema vocês querem para a feira de ciências?"), quiz de revisão com correção automática, inscrição para apresentações, avaliação de aula (feedback anônimo dos alunos), formulário de matrícula para a secretaria e até registro de presença em eventos.

A grande vantagem é a economia de tempo e a organização: as respostas caem em uma planilha automaticamente, com data e hora; os gráficos de resultado são gerados pelo próprio Forms; e o professor passa a ter dados reais sobre a turma — notas, opiniões, dificuldades — em vez de palpites.

E como tudo do Google: é gratuito, funciona no navegador e no celular, e as respostas podem ser anônimas ou identificadas, conforme a necessidade. Nas próximas aulas você vai montar o primeiro formulário, do zero até o envio.`,
  },
  {
    title: "Criar um formulário do zero",
    body: `Para criar um formulário, abra o Drive e clique em "Novo" > "Google Forms" (ou acesse forms.google.com e escolha o modelo em branco). O formulário abre com um título sem nome e a primeira pergunta já criada — pronta para você editar.

O primeiro passo é dar um título ao formulário e escrever a descrição. O título aparece para quem responde — por isso, seja claro: "Quiz - Frações - 6º Ano" ou "Inscrição para a Feira de Ciências". A descrição é o espaço para explicar o objetivo e dar instruções ("Este quiz tem 10 questões de múltipla escolha. Você tem 15 minutos.").

Cada pergunta tem um tipo — o menu ao lado da pergunta define o formato da resposta: múltipla escolha (uma opção), caixas de seleção (várias opções), resposta curta (texto de uma linha), parágrafo (texto longo), escala linear (de 1 a 5, por exemplo) e grade de múltipla escolha. A escolha do tipo certo é o que garante respostas que você consegue analisar.

Dica para começar: monte primeiro o rascunho do formulário no papel — as perguntas, os tipos e as opções. Com o roteiro pronto, a montagem no Forms leva poucos minutos. E lembre: o formulário só fica visível quando você clica em "Enviar" e compartilha o link — enquanto está editando, ninguém mais vê.`,
  },
  {
    title: "Tipos de pergunta: múltipla escolha, dissertativa, escala, grade",
    body: `O tipo de pergunta define como o aluno responde — e cada tipo serve a um propósito pedagógico. A múltipla escolha é a mais versátil: uma única resposta entre opções, ideal para quizzes, sondagens e questões objetivas. Ao lado, as caixas de seleção permitem várias respostas na mesma pergunta ("quais temas você já estudou? Marque todos que se aplicam").

A resposta curta e o parágrafo são as perguntas dissertativas: uma linha para respostas breves (nome, data, um conceito) e parágrafo para textos longos (redações, justificativas). Aqui não há correção automática — você lê cada resposta individualmente.

A escala linear pede uma nota de 1 a N ("avalie a aula de hoje, de 1 a 5") — perfeita para autoavaliação e feedback. A grade de múltipla escolha combina linhas e colunas ("em cada disciplina, marque se você estudou muito, pouco ou nada") — ótima para pesquisas estruturadas, embora seja mais trabalhosa de analisar.

Dica de combinação: um bom questionário pedagógico mistura tipos. Para uma sondagem inicial: múltipla escolha para o que os alunos já sabem, escala para como se sentem em relação ao conteúdo e um parágrafo opcional para o que gostariam de aprender. Variar os tipos mantém o aluno engajado e dá a você dados mais ricos.`,
  },
  {
    title: "Inserir imagens e vídeos nas perguntas",
    body: `O Google Forms permite enriquecer as perguntas com imagens e vídeos — um recurso que transforma quizzes de texto em atividades visuais. Para inserir uma imagem em uma pergunta, clique no ícone de imagem ao lado da pergunta: você pode enviar do computador, buscar no Drive, usar uma URL ou pesquisar no Google direto do Forms.

O uso clássico em avaliações: questões de interpretação de imagem (mostre o gráfico e pergunte o que ele indica), questões de identificação ("qual destes animais é um mamífero?" com fotos nas alternativas) e atividades de leitura (texto em imagem). As imagens nas alternativas também funcionam — cada opção pode ter sua própria imagem, clicando no ícone de imagem dentro da alternativa.

Os vídeos do YouTube entram em "Inserir" > "Vídeo" (ou pelo ícone de vídeo): o aluno assiste ao vídeo dentro do próprio formulário e responde as perguntas sobre ele. Isso é excelente para aulas invertidas — o aluno assiste o conteúdo e responde a verificação de entendimento no mesmo lugar.

Dica técnica: cuidado com o tamanho das imagens. Imagens muito grandes deixam o formulário pesado e lento no celular dos alunos. Prefira imagens pequenas e nítidas — 800 pixels de largura é um bom padrão para questões escolares.`,
  },
  {
    title: "Organizar perguntas por seções",
    body: `As seções dividem o formulário em blocos, como capítulos de um livro. Para criar, clique no botão "Adicionar seção" (o ícone com dois retângulos) no final do formulário. Cada seção tem título e descrição próprios, e as perguntas ficam agrupadas dentro dela.

A utilidade pedagógica é grande: um questionário de sondagem pode ter seções "Sobre você", "Seus hábitos de estudo" e "Suas preferências de aula". Um formulário de inscrição, seções "Dados do aluno", "Dados dos responsáveis" e "Autorizações". A divisão orienta quem responde — e o progresso fica visual (o Forms mostra "Página 2 de 3" no rodapé).

As seções também controlam o fluxo: você pode enviar pessoas para seções diferentes conforme as respostas — é a lógica condicional, assunto da próxima aula. Sem as seções, não existe lógica condicional; elas são a base dessa estrutura.

Dica de organização: use as seções também para a sua organização mental — uma seção por bloco de conteúdo no quiz de revisão ("Parte 1 - Frações", "Parte 2 - Geometria", "Parte 3 - Medidas"). Se o quiz for longo, o aluno responde com clareza, e você analisa por bloco na planilha de respostas.`,
  },
  {
    title: "Lógica condicional: mostrar perguntas por resposta",
    video: "https://www.youtube.com/watch?v=uOLNkwLdClo",
    body: `A lógica condicional faz o formulário se adaptar às respostas: dependendo do que o aluno responder, ele é enviado para uma seção ou outra. É o recurso que transforma um formulário linear em uma experiência inteligente — e a base para roteiros de autoavaliação, fluxos de inscrição e quizzes adaptativos.

Como funciona: primeiro, crie as seções que serão os "destinos" (por exemplo, a seção "A - Você marcou que estuda pouco. Veja estas dicas." e a seção "B - Ótimo! Continue com o plano."). Depois, na pergunta de escolha, clique nos três pontinhos e escolha "Ir para a seção de acordo com a resposta": cada alternativa ganha um menu para selecionar o destino.

O uso clássico na escola: o formulário de inscrição que pergunta "Qual modalidade você quer?" e envia cada aluno para a seção da modalidade escolhida; a autoavaliação que direciona o aluno para dicas diferentes conforme o desempenho; o quiz que encaminha quem erra para uma seção de revisão.

Atenção a um detalhe: se todas as alternativas de uma pergunta apontarem para o mesmo lugar, não precisa usar a lógica — ela só faz sentido com destinos diferentes. E teste sempre o fluxo completo antes de enviar, respondendo ao formulário como um aluno faria, para confirmar que os caminhos funcionam.`,
  },
  {
    title: "Configurar formulário como quiz com gabarito",
    video: "https://www.youtube.com/watch?v=ZztOfil8uzA",
    body: `Transformar o formulário em quiz é o que libera a correção automática. No menu de engrenagens (configurações), na aba "Quiz", ative a opção "Transformar em questionário". A partir desse momento, cada pergunta ganha um campo de "Gabarito" e "Pontos", e o Forms passa a corrigir sozinho.

Para definir o gabarito: clique em "Gabarito" ao lado da pergunta, marque a alternativa correta e defina os pontos (o padrão é 1 ponto por questão). Para questões dissertativas, o gabarito não se aplica — mas você pode criar uma "chave de resposta" (um texto de referência) e decidir como pontuar. Nas configurações do quiz, você também escolhe se quer liberar as respostas corretas e a pontuação para o aluno depois do envio — liberar a nota sem o gabarito, ou tudo junto.

As configurações avançadas do quiz: "Ver respostas incorretas", "Ver respostas corretas" e "Definir valores de pontos" podem ser liberadas com ou sem atraso. Uma boa prática é liberar as respostas corretas imediatamente para quizzes de revisão (o aluno aprende na hora do erro) e liberar apenas a nota para avaliações formais.

Dica pedagógica: o Forms corrige, mas o feedback de verdade está nas suas mãos. Use o recurso de feedback por questão (no gabarito, adicione "Comentários de feedback") para escrever uma explicação rápida que o aluno vê ao errar — transforme cada erro em uma mini aula.`,
  },
  {
    title: "Feedback automático por questão",
    body: `O feedback automático é uma das funcionalidades mais subestimadas do Forms: você escreve uma explicação para cada questão — uma versão para quem acertou e outra para quem errou — e o aluno recebe na hora, quando termina o quiz. É como ter você explicando cada questão, mesmo com 40 alunos respondendo ao mesmo tempo.

Para configurar: na pergunta com gabarito definido, clique em "Comentários de feedback" (na área do gabarito). Abrem-se dois campos: o feedback para a resposta correta ("Parabéns! 3/4 é equivalente a 0,75 porque dividimos numerador e denominador pelo mesmo número") e o feedback para respostas incorretas ("Revise: 3/4 = 0,75. Para transformar fração em decimal, divida o numerador pelo denominador").

O aluno, ao enviar o quiz com a opção de ver respostas liberada, recebe para cada questão o seu feedback específico — corrigindo o entendimento na hora, enquanto o conteúdo ainda está fresco. Isso é o que os especialistas chamam de feedback formativo imediato, e é um dos maiores ganhos de aprendizagem com custo zero.

Dica de eficiência: não precisa escrever feedback elaborado para todas as questões. Priorize as questões em que os alunos costumam errar mais — aquelas com pegadinhas conceituais. E use linguagem de conversa ("Cuidado: aqui a pegadinha é..."), que o aluno lê com muito mais atenção do que um texto técnico.`,
  },
  {
    title: "Definir pontuação e nota automática",
    body: `A pontuação do quiz é totalmente controlada por você: cada questão pode valer pontos diferentes. O padrão é 1 ponto por questão, mas você pode ajustar — uma questão discursiva vale 3, uma de múltipla escolha vale 1, uma de interpretação vale 2. Clique no campo de pontos ao lado da questão e digite o valor.

O Forms soma tudo automaticamente e calcula a nota final de cada aluno — sem calculadora, sem planilha manual. Nas configurações do quiz, você escolhe se a nota é divulgada como total de pontos ou em porcentagem, e se o aluno vê a nota imediatamente ao enviar ou depois que você liberar.

Um recurso essencial para provas: a opção "Liberar nota posteriormente" — você envia o quiz como prova, os alunos respondem, e a nota só é divulgada quando você liberar. Isso impede que a turma saiba o resultado antes da hora combinada e dá a você o controle do momento da divulgação.

Dica de planejamento: defina a pontuação total antes de enviar o quiz e confira se ela bate com a nota da sua avaliação — um quiz de 10 questões de 1 ponto vale 10, um de 8 questões de 2 pontos vale 16. Na planilha de respostas, a coluna de nota chega pronta: é só importar para o seu diário de classe (e o Google Planilhas ainda calcula médias para você, como veremos no módulo de Planilhas).`,
  },
  {
    title: "Limitar respostas e definir prazo",
    body: `Nem todo formulário deve ficar aberto para sempre. O Forms permite limitar respostas de duas formas: por prazo e por quantidade. Para o prazo, na aba "Apresentação" das configurações, marque "Coletar endereços de e-mail" se quiser identificar quem responde, e use a opção de aceitar respostas — você escolhe a data e hora de fechamento, e o formulário se recusa a aceitar respostas depois disso.

Para limitar a quantidade: na aba "Respostas" das configurações, ative "Limitar a 1 resposta" — cada pessoa logada na conta Google responde apenas uma vez, o que evita votos duplicados em enquetes e quizzes. Há também a opção de permitir edição da própria resposta (útil para quizzes: o aluno corrige um erro antes do prazo).

A identificação dos respondentes é um controle importante: nas configurações, "Coletar endereços de e-mail" registra automaticamente o e-mail de quem respondeu — essencial para provas e quizzes individuais (não deixe de ativar!). Para pesquisas anônimas (feedback sobre o professor, por exemplo), deixe desativado, para garantir respostas sinceras.

Dica de gestão: comunique o prazo claramente na descrição do formulário ("Inscrições até 20/05 às 18h") e confira o painel de respostas no dia do fechamento. E lembre: depois do prazo, você pode reabrir o formulário a qualquer momento apenas desmarcando a opção — o controle é sempre seu.`,
  },
  {
    title: "Ver respostas em tempo real",
    body: `O painel de respostas do Forms mostra tudo o que chega, na hora. No editor do formulário, clique na aba "Respostas": você vê o total de respostas, a média da pontuação (em quizzes), e gráficos gerados automaticamente para cada pergunta — barras para múltipla escolha, listas para dissertativas, estatísticas para escalas.

Durante uma atividade em sala, esse painel é um instrumento de avaliação formativa em tempo real: projete o painel na lousa enquanto os alunos respondem, e veja a turma inteira evoluir conforme as respostas chegam — quantos já responderam, onde estão errando mais, qual questão está travando todo mundo.

O botão "Individual" no painel mostra as respostas aluno por aluno — essencial para conferir quizzes e identificar quem teve dificuldade em qual questão. E cada resposta tem data e hora, útil para controlar entregas fora do prazo.

Dica de uso em sala: no quiz de revisão ao vivo, projete o painel de respostas e resolva na hora as questões com mais erros — a turma inteira aprende com os erros coletivos, e você ajusta a explicação no momento em que a dificuldade aparece. O Forms transforma a aula em um diálogo baseado em dados, não em suposições.`,
  },
  {
    title: "Exportar respostas para planilha",
    body: `O Google Forms e o Google Planilhas conversam nativamente: um clique transforma as respostas em uma planilha organizada, com cada respondente em uma linha e cada resposta em uma coluna. No editor do formulário, clique na aba "Respostas" e no ícone do Google Planilhas (verde): escolha criar uma nova planilha ou usar uma existente — e pronto, as respostas começam a cair lá automaticamente.

A partir daí, a planilha é sua: você formata, calcula médias, aplica filtros, cria gráficos e compila as notas. E o melhor: a conexão é viva — cada nova resposta do formulário entra automaticamente na planilha, na hora. Você nunca mais digita resposta na mão.

Um recurso poderoso para avaliações: a planilha de respostas do quiz vem com a coluna de pontuação já preenchida pelo Forms. Você pode então usar as fórmulas do Planilhas para calcular médias por turma, porcentagem de acerto por questão e até gerar o boletim com os dados.

Dica de organização: crie uma pasta no Drive só para as planilhas de respostas do ano — "2026 > Avaliações > Respostas". A convenção de nomes combinada (ex.: "Quiz_2B_Matematica_Bim1") garante que você encontre qualquer resultado em segundos, mesmo meses depois. E lembre de conferir a planilha após cada prazo de quiz — os dados importantes de avaliação moram lá.`,
  },
  {
    title: "Compartilhar formulário com alunos via link ou Classroom",
    body: `Compartilhar o formulário é o último passo antes de começar a receber respostas. Clique em "Enviar" no canto superior direito: as opções são enviar por e-mail (digite os endereços), copiar o link (para colar no WhatsApp, no e-mail da turma ou no site da escola), e gerar um código QR (que os alunos escaneiam com a câmera do celular — muito prático em sala).

A integração com o Google Classroom é a forma mais organizada: em vez de espalhar o link, crie uma atividade no Classroom e anexe o formulário — você escolhe entre "Quiz" (o Forms vira uma atividade com nota, e as notas voltam para o Classroom automaticamente) ou "Tarefa" com o formulário anexado. Os alunos veem o formulário no mural da turma, respondem, e as notas aparecem na aba de avaliações do Classroom.

Uma dica para quem envia por link: use o recurso de encurtar o link nas opções de compartilhamento ("Encurtar URL") e, se possível, cole o link na descrição da atividade com instruções claras de prazo. No WhatsApp, o link direto funciona perfeitamente no celular.

Dica de teste: antes de enviar para a turma, abra o link em uma janela anônima do navegador e responda o formulário você mesmo — como se fosse um aluno. Você confirma que tudo funciona (imagens carregam, gabarito corrige, fluxo condicional navega) e ainda ganha um exemplo de resposta para conferir como os dados chegam.`,
  },
  {
    title: "Restringir acesso a usuários específicos",
    body: `O Forms permite controlar exatamente quem pode responder. Nas configurações do formulário (engrenagem), na aba "Apresentação", ative "Limitar a usuários da sua organização" — assim, apenas pessoas com a conta da escola respondem, o que garante que um quiz ou prova só seja acessível à turma certa e bloqueia respostas de fora.

Outra forma de restrição é por e-mail individual: ao enviar o formulário pelo botão "Enviar" com "Coletar endereços de e-mail" ativado, você pode enviar convites por e-mail e ativar a opção de limitar a 1 resposta — cada e-mail convidado responde uma única vez. Isso é útil para inscrições limitadas (vagas de apresentação, oficinas).

A combinação mais segura para avaliações: formulário restrito à organização + coleta de e-mail + limite de 1 resposta. Com essas três proteções, a prova só é acessível aos alunos com conta da escola, cada um responde uma vez, e você sabe exatamente quem respondeu o quê.

Dica: para testes rápidos em sala sem complicação, o código QR é a melhor pedida — os alunos escaneiam com o celular e respondem na hora, sem digitar endereço. O QR também funciona offline da sua parte: você projeta o código na lousa e a turma inteira entra de uma vez. E lembre de desativar as restrições após o prazo, se quiser reutilizar o formulário em outra turma.`,
  },
];



// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.5 Google Planilhas
// ──────────────────────────────────────────

const sheetsLessons: LessonData[] = [
  {
    title: "O que é uma planilha e para que serve na educação",
    body: `Uma planilha é uma tabela organizada em linhas e colunas, onde cada célula guarda um dado — um número, um texto, uma data — e onde você pode calcular, comparar e visualizar informações automaticamente. O Google Planilhas é a versão gratuita e online desse tipo de ferramenta, a prima do Excel, com a vantagem de funcionar no navegador e salvar tudo na nuvem.

Para o professor, a planilha é a ferramenta de gestão mais importante da rotina: o diário de classe (notas de todas as avaliações da turma), a planilha de frequência, o controle de entregas de trabalhos, o planejamento bimestral de conteúdos, o orçamento de materiais e a compilação de dados de avaliações em larga escala.

A diferença fundamental para uma tabela comum (no Word, por exemplo) é a fórmula: a célula pode conter uma conta que calcula sozinha. Se você atualiza a nota de um aluno, a média, o total e até a nota final recalculam automaticamente. É essa capacidade que economiza horas de trabalho manual todo bimestre.

E como tudo do Google: é gratuito, colaborativo (vários professores podem trabalhar no mesmo diário), acessível de qualquer aparelho e com histórico de versões. Nos próximos passos, você vai montar a sua primeira planilha de notas — o ponto de partida para dominar tudo isso.`,
  },
  {
    title: "Interface do Google Planilhas",
    body: `Ao abrir o Google Planilhas (pelo Drive: "Novo" > "Google Planilhas", ou em sheets.google.com), você vê uma grade de células organizadas em linhas (numeradas de 1 para baixo, na lateral esquerda) e colunas (letras A, B, C, no topo). Cada célula tem um endereço: a célula da coluna B com a linha 3 se chama B3 — esse endereço é a base das fórmulas.

A barra de ferramentas no topo concentra as ações: formatação (negrito, cor, tamanho), bordas, mesclagem de células, inserção de gráficos e o símbolo de soma (Σ), atalho para as fórmulas. Acima da grade fica a barra de fórmulas, onde o conteúdo da célula selecionada aparece — é nela que você escreve ou confere as fórmulas.

As abas na parte inferior (por padrão "Planilha1") funcionam como páginas dentro do mesmo arquivo: um diário de classe pode ter uma aba por turma ("1º Ano A", "1º Ano B", "2º Ano C") ou uma aba por bimestre. Para criar uma nova, clique no "+" ao lado das abas, e renomeie com dois cliques.

Dica de primeiro contato: brinque à vontade — clique nas células, digite, selecione, use Ctrl+Z para desfazer. A interface é amigável e perdoa erros. Nas próximas aulas você vai preencher sua primeira tabela de verdade: a lista de chamada com os nomes dos alunos.`,
  },
  {
    title: "Inserir e formatar dados básicos",
    body: `Digitar em uma planilha é simples: clique na célula e digite. Para passar para a próxima célula, use Tab (vai para a direita) ou Enter (desce). Para editar uma célula já preenchida, clique duas vezes nela ou use F2. Quando você digita números, a planilha os reconhece como números (úteis para cálculos); quando digita texto, como texto.

O primeiro passo de uma planilha organizada é o cabeçalho: na linha 1, escreva os títulos das colunas — "Nome do aluno", "Prova 1", "Prova 2", "Média", "Situação". Deixe o cabeçalho em negrito e com fundo colorido para destacá-lo (selecione as células e use os botões de formatação da barra).

A formatação de números é essencial: selecione as células de notas e use o menu "Formatar" > "Número" para escolher o formato — número com 1 ou 2 casas decimais para notas (7,5 em vez de 7,500000), porcentagem para frequência (85% em vez de 0,85), data para datas. Formatar os números evita as planilhas confusas cheias de casas decimais.

Dica de organização: use a mesclagem de células para títulos grandes (selecione as células e clique no ícone de mesclar), e as bordas (menu de bordas na barra) para desenhar a grade da tabela. Uma planilha com cabeçalho destacado, números formatados e bordas claras é uma planilha que a coordenação lê sem precisar de explicações.`,
  },
  {
    title: "Formatação de células: cor, borda, tamanho",
    body: `A formatação visual da planilha — cor, borda e tamanho — é o que transforma uma grade crua em uma tabela legível e profissional. A regra básica: formatação deve comunicar, não enfeitar. Use cores e bordas para mostrar estrutura: o cabeçalho em negrito com fundo, os totais em destaque, as notas de recuperação em vermelho.

Para pintar células, selecione e use o balde de tinta (cor de preenchimento) e o "A" com a barra colorida (cor do texto). Para bordas, o menu de bordas permite escolher quais lados das células selecionadas ganham linha — uma borda ao redor da tabela e linhas divisórias internas discretas dão o acabamento ideal.

O tamanho de linhas e colunas se ajusta arrastando a borda do cabeçalho da linha ou coluna (ou pelo menu "Formatar" > "Redimensionar"). Para nomes de alunos, a coluna A precisa ser larga; para notas, colunas estreitas bastam. Você também pode selecionar várias linhas e definir uma altura uniforme — ótimo para listas de chamada com 35 alunos.

Dica de linguagem visual: combine cores com significado e mantenha o padrão em toda a escola — por exemplo, verde para "aprovado", vermelho para "reprovado", amarelo para "recuperação". Quando a coordenação vê a mesma linguagem visual em todas as planilhas dos professores, a leitura dos resultados bimestrais fica instantânea.`,
  },
  {
    title: "Fórmulas básicas: SOMA, MÉDIA, MÁXIMO, MÍNIMO",
    video: "https://www.youtube.com/watch?v=l8J-YyLfAsM",
    body: `As fórmulas são o coração da planilha — e as quatro básicas resolvem a maioria dos problemas escolares. Toda fórmula começa com o sinal de igual (=). A SOMA soma um intervalo de células: =SOMA(B2:B10) soma os valores de B2 até B10. A MÉDIA calcula a média aritmética: =MÉDIA(B2:B10). O MÁXIMO e o MÍNIMO retornam o maior e o menor valor: =MÁXIMO(B2:B10) e =MÍNIMO(B2:B10).

O intervalo B2:B10 é a forma de escrever "da célula B2 até a B10". Você pode digitar ou simplesmente clicar e arrastar sobre as células enquanto escreve a fórmula — o Planilhas preenche o intervalo sozinho. Depois de digitar, pressione Enter e o resultado aparece na célula.

A mágica da planilha está na atualização automática: se você corrige uma nota no meio do intervalo, a média, a soma e o máximo recalculam na hora, sem você tocar nas fórmulas. É essa característica que faz o diário de classe deixar de ser um trabalho manual de calculadora.

Dica de segurança: as funções em português usam os nomes traduzidos (SOMA, MÉDIA, MÁXIMO, MÍNIMO), mas o Planilhas também entende os nomes em inglês (SUM, AVERAGE, MAX, MIN). Se uma fórmula vier em inglês de outra planilha, funciona do mesmo jeito. E para conferir um cálculo importante, faça a conta de cabeça em uma linha de teste — a planilha é precisa, mas a interpretação é sua.`,
  },
  {
    title: "Fórmula de média ponderada para notas",
    body: `Nem toda média é simples — e a escola é um dos lugares onde a média ponderada aparece com mais frequência. A média ponderada dá pesos diferentes para cada avaliação: uma prova bimestral pode valer 2, um trabalho valer 1 e um teste valer 1. A fórmula no Planilhas é =SOMARPRODUTO() — e ela é mais simples do que parece.

A estrutura: =SOMARPRODUTO(intervalo_das_notas; intervalo_dos_pesos) / SOMA(intervalo_dos_pesos). Na prática, com notas em B2:D2 (Prova, Trabalho, Teste) e pesos em B3:D3 (2, 1, 1), a fórmula fica: =SOMARPRODUTO(B2:D2; B3:D3) / SOMA(B3:D3).

Como funciona: o SOMARPRODUTO multiplica cada nota pelo seu peso e soma tudo (Prova x 2 + Trabalho x 1 + Teste x 1); a divisão pela soma dos pesos (2+1+1=4) transforma o total em média. O resultado é a média ponderada correta, calculada automaticamente para cada aluno.

Dica de organização: coloque a linha de pesos no topo da planilha (linha 3, por exemplo), uma vez só. Com o cifrão você trava a referência — escreva =SOMARPRODUTO(B5:D5; $B$3:$D$3) / SOMA($B$3:$D$3) — assim, ao arrastar a fórmula para baixo (puxe o quadradinho no canto inferior direito da célula), os pesos ficam fixos e cada aluno recebe o seu cálculo. Esse truque do $ vale ouro em qualquer planilha de notas.`,
  },
  {
    title: "Congelar linhas e colunas",
    body: `Congelar é o recurso que mantém o cabeçalho sempre visível enquanto você rola a planilha. Numa lista de chamada com 35 alunos, ao rolar para baixo para ver o último aluno, o cabeçalho "Nome" e "Prova 1" desaparece — e você se perde entre tantas colunas. Congelando a primeira linha, ela fica fixa no topo, sempre à vista.

Como congelar: no menu "Exibir" > "Congelar", escolha quantas linhas (1, 2 ou 3) ou colunas congelar. Você também pode arrastar a linha cinza espessa que aparece no canto superior esquerdo da grade: puxe-a para baixo para congelar linhas, para a direita para congelar colunas.

O uso típico no diário de classe: congele a primeira linha (cabeçalho) e a primeira coluna (nomes dos alunos). Assim, ao rolar horizontalmente pelas colunas de notas e verticalmente pela lista de alunos, você sempre sabe qual nota está olhando e de quem.

Dica: combine o congelamento com a visão "Total de linhas/colunas" do rodapé para navegar planilhas grandes. E lembre que o congelamento é uma configuração de visualização — não altera os dados. Ao compartilhar a planilha com a coordenação, o congelamento que você configurou vale para quem abre, facilitando a leitura de todos.`,
  },
  {
    title: "Filtros e ordenação de dados",
    video: "https://www.youtube.com/watch?v=lZ8P_Isvwy4",
    body: `Os filtros e a ordenação são as ferramentas para lidar com dados em quantidade — e a diferença entre "olhar uma lista" e "analisar uma lista". A ordenação reordena os dados: clique com o botão direito na coluna ou use o menu "Dados" > "Ordenar intervalo" para classificar os alunos em ordem alfabética, as notas da maior para a menor, ou as datas de mais recentes para mais antigas.

Os filtros escondem temporariamente o que você não quer ver. Com o cabeçalho selecionado, ative "Dados" > "Criar filtro": cada coluna do cabeçalho ganha um ícone de funil, e você pode filtrar — mostrar só os alunos da turma B, só as notas acima de 6, só as entregas de um bimestre. Os dados não são apagados, apenas escondidos; desative o filtro e tudo volta.

O uso combinado é poderoso: filtre "alunos com nota abaixo de 6" e a planilha mostra instantaneamente quem precisa de recuperação; ordene por frequência e veja quem faltou mais; filtre por turma e analise uma turma por vez no mesmo diário.

Dica pedagógica: o filtro é seu aliado na reunião de conselho de classe. Com o diário aberto na lousa, filtre os alunos com média abaixo da linha de corte e projete: a discussão do conselho ganha foco imediato — ninguém mais precisa folhear planilhas em busca de nomes. E o recurso "Visualizar por" (menu de visualização) cria versões filtradas prontas, como "Alunos em recuperação", sem mexer nos dados originais.`,
  },
  {
    title: "Formatação condicional: destacar notas abaixo da média",
    video: "https://www.youtube.com/watch?v=cMikJ81GJFU",
    body: `A formatação condicional é a ferramenta que pinta células automaticamente conforme o valor — e ela transforma a leitura de um diário de classe. Em vez de procurar as notas baixas entre dezenas de números, a planilha as pinta de vermelho sozinha. O caminho: "Formatar" > "Formatação condicional", escolher o intervalo (as colunas de notas) e definir a regra.

A regra mais útil para o professor: "Menor que" 6 (ou o valor da sua linha de corte) com preenchimento vermelho — toda nota abaixo de 6 fica vermelha na hora. Uma segunda regra "Maior que ou igual a" 6 com verde mostra aprovados. O Planilhas ainda oferece regras prontas, como "Texto contém" (para marcar "RECUPERAÇÃO" ou "ENTREGOU").

As regras podem combinar cores por faixa: use "Escala de cores" para que a célula fique do verde (nota alta) ao vermelho (nota baixa) com degradê — uma olhada na coluna já mostra a distribuição de desempenho da turma. Você também pode usar as regras com fórmulas para condições avançadas, como destacar a célula quando a frequência for menor que 75%.

Dica de visualização em conselho: configure a formatação condicional em todo o intervalo de notas e frequência do diário. Ao abrir a planilha, o panorama da turma — quem está no verde, quem está no vermelho — aparece em um instante, sem nenhum clique extra. É a ferramenta mais rápida para transformar dados em diagnóstico.`,
  },
  {
    title: "Criar gráficos simples a partir de dados",
    body: `Um gráfico transforma números em imagem — e uma imagem comunica muito mais rápido. Para criar um gráfico no Planilhas: selecione os dados (por exemplo, as colunas "Bimestre" e "Média da turma"), clique em "Inserir" > "Gráfico". O Planilhas cria o gráfico automaticamente e abre o painel de configuração à direita, onde você escolhe o tipo e os detalhes.

Os tipos básicos e seus usos: o gráfico de barras ou colunas compara categorias (nota média por disciplina, presença por turma) — o mais versátil para relatórios pedagógicos. O gráfico de linha mostra evolução no tempo (desempenho por bimestre ao longo do ano). O gráfico de pizza mostra proporções (distribuição de conceitos: quantos A, B, C, D) — perfeito para visões gerais.

Para corrigir o que o gráfico mostrou de forma estranha, use o painel à direita: defina o intervalo de dados, o rótulo (qual coluna vira nome das categorias) e os títulos do gráfico e dos eixos. Um gráfico com título claro e eixos nomeados se explica sozinho.

Dica de uso pedagógico: gere gráficos para a reunião de pais — "Média da turma por disciplina", "Distribuição de conceitos do bimestre". Um gráfico bem feito comunica em segundos o que uma página de números demoraria a explicar, e a conversa com as famílias ganha foco nos dados reais em vez de percepções.`,
  },
  {
    title: "Planilha de frequência e chamada",
    body: `A planilha de frequência é a versão digital da caderneta de chamada — e uma das primeiras planilhas que todo professor deveria montar. A estrutura básica: na coluna A, os nomes dos alunos; nas colunas seguintes, um dia de aula por coluna (B = dia 1, C = dia 2, D = dia 3...), com um "P" para presente e "F" para falta (ou "FJ" para falta justificada).

O controle visual vem da formatação condicional: pinte "P" de verde e "F" de vermelho automaticamente — a coluna do dia mostra na hora quem faltou. Para o cálculo, a coluna final guarda a porcentagem de presença de cada aluno com a fórmula: =CONT.SE(B2:Z2; "P") / CONT.VALORES(B2:Z2) — que divide quantos "P" pelo total de dias letivos registrados.

A fórmula CONT.SE (contar se) é a função da frequência: =CONT.SE(intervalo; critério) conta quantas células do intervalo atendem ao critério. Com ela, você conta presenças ("P"), faltas ("F") e justificadas ("FJ") sem contar nada na mão. E a porcentagem de presença recalculada sozinha a cada dia lançado.

Dica legal: a frequência é um documento com implicações legais — o aluno reprova por faltas se a presença ficar abaixo de 75% do total. Por isso, mantenha a planilha sempre atualizada, com a porcentagem de presença visível por aluno e a data de cada dia no cabeçalho das colunas. No fim do bimestre, exporte em PDF (Arquivo > Baixar > PDF) e arquive com o diário de classe.`,
  },
  {
    title: "Proteger células para não editar acidentalmente",
    body: `Proteger células impede que alguém edite regiões importantes da planilha sem querer — e protege você de si mesmo. No diário de classe, as fórmulas (média, total, frequência) não devem ser alteradas à mão: se alguém digita por cima de uma fórmula, ela some e o cálculo quebra. Com a proteção, só quem você autorizar pode editar.

Como proteger: selecione as células das fórmulas (ou a aba inteira), clique com o botão direito e escolha "Proteger intervalo". No painel, defina quem pode editar: "Somente você" ou "Restrito" com os e-mails autorizados (a coordenação, por exemplo). Quem não está autorizado vê as células, mas não consegue editar — e quem tenta recebe um aviso.

A proteção por aba é a mais comum em diários compartilhados: proteja as abas de bimestres já fechados, deixando aberta apenas a aba do bimestre atual. Ou proteja toda a planilha e libere apenas o intervalo das notas para você inserir os valores — as fórmulas de média ficam permanentemente protegidas.

Dica de trabalho em equipe: quando vários professores compartilham um diário, a proteção por intervalo evita o acidente clássico de alguém sobrescrever a fórmula de média do colega. Combine com a equipe quem edita o quê, proteja as áreas sensíveis e trabalhe em paz — a planilha continua colaborativa, mas com limites que evitam retrabalho.`,
  },
  {
    title: "Compartilhar planilha com coordenação e equipe pedagógica",
    body: `O compartilhamento de planilhas segue o mesmo padrão do Docs e funciona com um clique no botão "Compartilhar". Para a coordenação e a equipe pedagógica, o nível mais comum é "Visualizador" — eles consultam as notas e frequências sem risco de alterar nada. Use "Comentador" para colegas que vão dar feedback sobre o planejamento, e "Editor" apenas para quem de fato trabalha nos dados.

Um detalhe valioso das planilhas: as visualizações protegidas. Com "Dados" > "Proteger planilhas e intervalos", você pode criar "visualizações" — versões da planilha onde determinados intervalos aparecem escondidos ou protegidos para quem abre pelo link. Por exemplo, uma visualização "Coordenação" sem as colunas de observações pessoais, e uma visualização "Professor" com tudo.

A conexão com o Forms, lembrando: as respostas dos formulários caem automaticamente na planilha de respostas — compartilhe essa planilha com a coordenação como "Visualizador" e eles acompanham as avaliações em tempo real, sem você precisar enviar relatórios.

Dica de profissionalismo: antes de compartilhar o diário com a coordenação, faça uma revisão completa — congele o cabeçalho, aplique a formatação condicional, proteja as fórmulas e confira os números do bimestre. Um diário bem acabado compartilhado na hora certa transmite organização; um diário bagunçado compartilhado cria desconfiança sobre os dados.`,
  },
  {
    title: "Definir quem pode editar e quem só pode visualizar",
    body: `A gestão de permissões é a diferença entre uma planilha que funciona e uma que vira caos. A regra de bolso: quem precisa produzir dados edita; quem precisa consultar dados visualiza. No botão "Compartilhar", cada pessoa ou grupo recebe um nível — Visualizador, Comentador ou Editor — e você pode mudar a qualquer momento.

A grande vantagem das planilhas é o controle fino: além das permissões gerais, a proteção por intervalo permite bloquear áreas específicas mesmo para editores. Na prática: a coordenação é "Editor" do diário, mas o intervalo de fórmulas de média está protegido — ela insere notas, mas não quebra cálculos por engano.

Para grupos grandes, o recurso de grupos: em vez de compartilhar com 20 e-mails um por um, use os grupos da escola (se houver, com o Workspace) ou compartilhe por pasta — o que você compartilha com a pasta vale para quem tem acesso a ela. E lembre: pessoas específicas sempre têm prioridade sobre a configuração geral do link.

Dica de auditoria: revisite as permissões a cada bimestre. No menu "Compartilhar" você vê a lista completa de quem tem acesso — remova ex-colegas que saíram da escola (o acesso ao diário deve sair junto), ajuste quem subiu de função e confirme que nenhum link público ficou aberto em uma planilha com dados sensíveis de alunos.`,
  },
  {
    title: "Planilha colaborativa de planejamento com outros professores",
    body: `A planilha colaborativa de planejamento é onde vários professores constroem juntos — o planejamento bimestral, o calendário de avaliações, o mapa de conteúdos por turma. Com o compartilhamento como "Editor" para a equipe, cada professor preenche sua parte e todos veem o conjunto crescer em tempo real, sem versões conflitantes.

A estrutura recomendada: uma aba por disciplina ou por turma, com colunas padronizadas — "Conteúdo", "Habilidade", "Aulas previstas", "Avaliação", "Recursos". Antes de começar, combinem o padrão das colunas e os nomes das abas; a padronização é o que mantém a planilha utilizável por todos.

A coordenação visual vem das ferramentas que você já conhece: congele o cabeçalho, use cores por professor (cada um preenche em uma cor), aplique a formatação condicional para destacar lacunas (células de "Avaliação" vazias em vermelho) e use os comentários (Ctrl+Alt+M) para conversas dentro da planilha — "@professor_joao, o conteúdo de frações está na semana 3?".

Dica de trabalho em equipe: use a proteção por intervalo para separar territórios — cada professor pode editar apenas as próprias colunas. A planilha fica colaborativa sem o risco de alguém apagar o planejamento do colega. E ao final do planejamento, exporte em PDF para o registro oficial e mantenha a planilha viva no Drive compartilhado da escola para ajustes ao longo do bimestre.`,
  },
  {
    title: "Exportar e importar dados do Google Forms para a planilha",
    body: `A integração entre Forms e Planilhas é automática — e saber gerenciá-la economiza um tempo enorme. Quando você conecta um formulário a uma planilha (pelo ícone verde na aba "Respostas" do Forms), cada resposta nova entra como uma nova linha na planilha, automaticamente. As colunas correspondem às perguntas, e as colunas de pontuação dos quizzes chegam preenchidas.

A partir daí, a planilha vira o seu centro de análise: você adiciona colunas de cálculo ao lado dos dados brutos (média por aluno, percentual de acerto por questão), aplica filtros por turma, cria gráficos de desempenho e compila os resultados de todas as avaliações do bimestre em uma só visão.

Se um formulário antigo não foi conectado na criação, ainda dá para exportar: no Forms, aba "Respostas" > ícone da planilha > "Criar planilha" ou "Selecionar planilha existente". E para dados que vêm de fora (uma planilha do Excel da escola anterior), "Arquivo" > "Importar" traz o arquivo para dentro do Planilhas, mantendo as fórmulas — ou você simplesmente copia e cola os dados.

Dica de fluxo de avaliação: monte o ciclo completo — o quiz do Forms corrige sozinho, as notas caem na planilha, as fórmulas calculam médias e a formatação condicional pinta os destaques. Esse fluxo — Forms + Planilhas — transforma a correção de uma avaliação de 3 horas de trabalho manual em 10 minutos de conferência. E o mesmo raciocínio serve para frequência, sondagens e planejamento.`,
  },
];



// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.6 Google Agenda
// ──────────────────────────────────────────

const calendarLessons: LessonData[] = [
  {
    title: "O que é o Google Agenda e integração com conta escolar",
    video: "https://www.youtube.com/watch?v=JArW-bzjDFg",
    body: `O Google Agenda é o calendário digital do Google — um organizador de tempo que funciona no navegador, no celular e em qualquer aparelho com a sua conta Google. Para o professor, ele substitui as agendas de papel com uma vantagem imensa: tudo sincroniza automaticamente e os eventos aparecem em qualquer dispositivo, sempre atualizados.

A integração com a conta escolar é automática: se a escola usa o Workspace (o pacote Google institucional), a agenda da escola vem junto com a conta — e a coordenação pode compartilhar calendários com você. É comum a escola ter um calendário geral (reuniões, feriados, dias de prova) que aparece direto na agenda de todos os professores.

O que cabe na agenda do professor: horários de aula, reuniões pedagógicas, datas de provas e entregas, prazos administrativos, plantões e até a rotina pessoal. Tudo com lembretes que avisam com antecedência — no computador, no celular ou por e-mail.

Dica de início: abra calendar.google.com com sua conta da escola e explore a tela. Você verá o mês atual com seus eventos, o botão "Criar" no canto superior esquerdo e a lista de calendários à esquerda. Nas próximas aulas, você vai criar seus primeiros eventos e montar um calendário completo da sua rotina escolar.`,
  },
  {
    title: "Criar eventos simples e recorrentes",
    body: `Para criar um evento, clique no botão "Criar" (ou no dia/horário diretamente na grade do calendário) e preencha: título ("Reunião de pais - 1º Ano A"), data e hora, e a duração. O evento aparece na agenda na hora. Para eventos do dia inteiro (como "Entrega de notas na secretaria"), marque "Dia inteiro" — ele fica no topo do dia, sem horário.

Os eventos recorrentes são os mais valiosos para o professor: a reunião semanal da coordenação, a aula de reforço toda terça, o plantão de dúvidas toda quinta. Ao criar o evento, clique em "Não se repete" e escolha a recorrência: diária, semanal (com os dias da semana), mensal ou anual. Defina também "Repete até" uma data — por exemplo, a reunião semanal até o fim do semestre.

Criar um evento recorrente e depois editar uma ocorrência específica: a Agenda pergunta se você quer alterar "Este evento" (só aquele dia), "Esta e as próximas ocorrências" ou "Todos os eventos" da série. Escolha com atenção — alterar "todos" quando você só queria mudar um dia é um erro comum.

Dica de rotina: coloque na agenda tudo o que é fixo da semana (horários de aula, planejamento, correções) como eventos recorrentes. Em uma semana, sua agenda vira um mapa do tempo — e a semana passa a se planejar sozinha, porque a estrutura já está lá, liberando sua mente para o conteúdo das aulas.`,
  },
  {
    title: "Adicionar local, descrição e anexos ao evento",
    body: `Um evento completo informa muito mais do que data e hora. No formulário do evento, o campo "Adicionar local" aceita o nome do lugar — "Sala dos professores", "Laboratório de informática", "Auditório" — e a Agenda pode sugerir endereços enquanto você digita. Com o endereço preenchido, o evento ganha um link para ver o local no Google Maps, útil para reuniões fora da escola.

A descrição é o espaço para o contexto: a pauta da reunião, o que levar ("levar o diário de classe"), os combinados da semana. Tudo o que você escreve ali fica no evento, acessível em qualquer aparelho — e, se o evento for compartilhado, visível para os convidados.

Os anexos fazem do evento um ponto central de organização: com o Google Meet ativado (veremos na aula específica), o link da reunião entra automático; você também pode anexar arquivos do Drive (a pauta em Docs, a planilha de notas a discutir). Quem abre o evento encontra tudo em um lugar só.

Dica de profissionalismo: para reuniões com a coordenação, capriche no evento — título claro, pauta na descrição, arquivos anexados e local definido. O hábito de eventos completos reduz o tempo de reunião (todo mundo chega sabendo o que vai ser discutido) e cria um registro do que foi tratado, consultável depois por qualquer participante.`,
  },
  {
    title: "Criar múltiplos calendários por turma ou disciplina",
    body: `O Google Agenda permite criar vários calendários dentro da mesma conta — e essa é a ferramenta definitiva de organização para quem dá aula para várias turmas. Na lista de calendários à esquerda, clique no "+" ao lado de "Outros calendários" e escolha "Criar novo calendário": dê um nome ("1º Ano A", "2º Ano B") e, se quiser, uma cor.

Com calendários separados, cada turma tem seus próprios eventos: provas, entregas e atividades do 1º Ano A ficam no calendário do 1º Ano A, e o mesmo vale para as outras turmas. Você liga e desliga a exibição com um clique na caixinha ao lado do nome — quando planeja a aula do 2º Ano B, esconde os demais e enxerga só o que interessa.

O código de cores é o atalho visual: cada calendário tem uma cor própria (definida na criação ou alterada nos três pontinhos > "Cor da etiqueta"). A agenda da semana mostra um mosaico colorido — cada cor é uma turma — e você identifica o dia da semana de uma olhada, sem ler cada evento.

Dica de organização: o sistema clássico do professor: um calendário "Escola" (reuniões e eventos institucionais), um calendário por turma (atividades e provas) e um calendário pessoal (rotina e compromissos). O tempo de planejamento semanal começa com os calendários abertos: você vê o que cada turma precisa e monta a semana sem sobreposições.`,
  },
  {
    title: "Visualização por dia, semana e mês",
    body: `A Agenda oferece quatro modos de visualização — Dia, Semana, Mês e Agenda (lista) — e cada um serve a um momento do planejamento. No canto superior direito, os botões alternam entre os modos; a tecla de atalho funciona também (D, S, M). O modo Mês dá o panorama geral: provas, reuniões e feriados do mês, ideal para o planejamento bimestral.

O modo Semana é o mapa da rotina: cada dia em uma coluna, com os horários em linhas — você vê o encaixe das aulas, os espaços livres para planejamento e os conflitos de horário de uma olhada. É o modo padrão do professor no dia a dia. O modo Dia mostra um único dia em detalhe, com cada horário — útil para planejar um dia específico com profundidade.

O modo Agenda (ou lista) é o modo texto: os eventos aparecem como uma lista ordenada por data, sem a grade visual — perfeito para conferir rapidamente "o que vem por aí" e para ler os detalhes dos próximos compromissos. A tecla de navegação para ir ao dia de hoje: o botão "Hoje".

Dica de planejamento: crie o hábito da "revisão de agenda" — segunda-feira de manhã, abra a semana no modo Semana e confira os compromissos; sexta-feira, abra a próxima semana e ajuste o que precisar. E no início de cada bimestre, abra o mês e marque os marcos (provas, fechamento de notas) antes de qualquer planejamento de conteúdo — o calendário primeiro, o conteúdo depois.`,
  },
  {
    title: "Configurar lembretes e notificações",
    video: "https://www.youtube.com/watch?v=4UYQ-xf-xrU",
    body: `Os lembretes são o que faz o calendário funcionar de verdade — sem eles, um evento esquecido é um evento inútil. Ao criar um evento, o campo "Notificação" permite definir avisos: 10 minutos antes, 1 hora antes, 1 dia antes — você pode combinar vários (avisar 1 dia antes e 10 minutos antes, por exemplo). O aviso chega como pop-up no computador, notificação no celular ou e-mail, conforme sua preferência.

Você também pode criar "Lembretes" soltos, que não ocupam horário: clicando no dia (ou pelo botão "Criar" > "Lembrete"), você define uma tarefa com data ("Entregar notas na secretaria") e ela aparece no topo do dia, sem precisar escolher hora. É o espaço perfeito para as tarefas administrativas que não têm hora marcada.

A configuração padrão das notificações fica nas engrenagens (⚙️) > "Configurações" > "Geral" > "Notificações": ali você define o padrão de todos os eventos (por exemplo, avisar sempre 30 minutos antes) e escolhe os canais — notificação do navegador, e-mail ou notificação no celular. Definir um bom padrão evita criar evento por evento lembrando de configurar o aviso.

Dica de uso inteligente: para prazos de alunos (entrega de trabalho, prova), configure dois lembretes — um com 1 dia de antecedência ("amanhã: prova de matemática") e outro com 30 minutos. O aluno precisa do aviso de véspera para estudar; o de 30 minutos é o lembrete operacional para você. Dois avisos, tempos diferentes, mesma paz de espírito.`,
  },
  {
    title: "Integração com Google Meet para reuniões",
    video: "https://www.youtube.com/watch?v=7T7daTlhln0",
    body: `O Google Meet é o serviço de videochamadas do Google, e ele se integra à Agenda de forma automática: ao criar um evento, a opção "Adicionar Google Meet" gera um link de videoconferência para o evento — os convidados entram na reunião clicando no link, sem precisar instalar nada além do navegador.

Para o professor, essa integração resolve as reuniões a distância: reunião pedagógica, plantão de dúvidas online, reunião de pais virtual, aula remota de reforço. O evento da Agenda já nasce com o link do Meet, e os convidados encontram tudo no lugar certo — o calendário e a reunião no mesmo clique.

Um detalhe valioso: o Meet gera também o link da videoconferência no formato "meet.google.com/xxx-xxxx-xxx" — que pode ser copiado e enviado pelo WhatsApp ou pelo Classroom para quem não estiver no evento. E as reuniões do Meet podem ser gravadas, com o vídeo salvo automaticamente no Drive de quem gravou — ótimo para revisar reuniões importantes ou compartilhar o conteúdo com quem faltou.

Dica de configuração: ao criar o evento com Meet, defina a duração realista (reuniões de 30 minutos têm mais chance de começar e terminar no horário) e, se quiser, use a opção de bloquear o Meet para convidados específicos — nas configurações do evento, você controla se qualquer pessoa com o link pode entrar ou apenas os convidados. Para reuniões com dados sensíveis, o controle de participantes é recomendado.`,
  },
  {
    title: "Agenda no celular: sincronização automática",
    body: `A Agenda no celular é onde a sincronização automática brilha: com o aplicativo Google Agenda instalado (Android e iPhone), tudo o que você cria no computador aparece no celular em segundos — e vice-versa. Os eventos, os lembretes, os calendários por turma — tudo sincronizado, sem nenhum passo manual.

O aplicativo Agenda no celular é o companheiro de sala de aula: confere o horário da próxima aula, recebe os lembretes das provas, vê as notificações de reunião — tudo no bolso. As notificações no celular são o canal mais eficaz: avisos de 10 minutos antes funcionam melhor no pulso do que no computador, que pode estar fechado na sala ao lado.

No celular você também cria eventos e lembretes rapidamente: toque no "+" (ou no dia), preencha o essencial e pronto. Uma dica de produtividade: use o assistente de voz — "ok Google, criar evento: reunião com a coordenação amanhã às 14h" — e o evento entra na agenda sem digitar.

Dica de bateria e organização: nas configurações do aplicativo, escolha quais calendários aparecem (evite poluição visual) e ajuste o horário de notificações silenciosas, se o celular vibrar demais em aula. E vale configurar o widget do calendário na tela inicial do celular: a semana à vista no primeiro toque, sem abrir aplicativo nenhum.`,
  },
  {
    title: "Usar a agenda para organizar datas de provas e entregas",
    body: `A agenda é o melhor amigo do planejamento de avaliações: quando todas as provas e entregas estão no calendário, você visualiza os picos de trabalho, evita sobreposições e comunica as datas com clareza. A prática recomendada: no início do bimestre, ao planejar os conteúdos, marque na agenda todas as provas e entregas — cada uma no calendário da sua turma.

A regra de ouro é a distribuição: com as avaliações visíveis no modo Mês, você vê na hora se colocou três provas na mesma semana — e redistribui enquanto é tempo. O calendário transforma o planejamento de avaliações de uma lista de intenções em um cronograma real, com datas que você não esquece.

As entregas e prazos entram como eventos com lembrete: "Entrega de relatórios - 2º Ano B" no dia com lembrete de 1 dia antes. E para as provas que envolvem a escola inteira (provas bimestrais unificadas), combine com a coordenação o calendário geral — assim você planeja sabendo que na semana X todas as turmas fazem prova, e o seu planejamento de conteúdo se ajusta a esse ritmo.

Dica de comunicação: ao definir as datas no calendário, avise os alunos na sala e no Classroom ("prova de matemática: 15/05, conforme o calendário da turma"). Quando a data está no calendário compartilhado da turma, o aluno não pode dizer "não sabia" — e você ganha o hábito profissional de planejar com antecedência e comunicar com clareza.`,
  },
  {
    title: "Convidar colegas e criar eventos compartilhados",
    body: `Convidar é o que transforma um evento pessoal em um compromisso coletivo. No formulário do evento, o campo "Adicionar convidados" aceita os e-mails dos colegas: ao salvar, eles recebem o convite por e-mail com o botão "Sim, talvez, não" — e a Agenda mostra quem confirmou, quem não respondeu e quem recusou, na lista de convidados do evento.

A confirmação é o grande valor do convite: para reuniões, você sabe com antecedência quantos virão — e quem confirmou recebe os lembretes e os anexos do evento automaticamente. Quando a pauta ou o local mudam, você edita o evento e todos os convidados recebem a atualização na hora.

O convite também funciona para reservar recursos: se a escola usa salas reserváveis, o evento pode ser configurado para reservar a sala (o convite para o "calendário da sala" confirma a reserva). E eventos com convidados podem ser marcados como "privados" — os detalhes só aparecem para os convidados, não para quem vê seu calendário.

Dica de reunião pedagógica: ao criar a reunião recorrente semanal, convide os participantes uma única vez — a recorrência carrega os convidados em todas as ocorrências. Peça confirmação ("responda se você virá") e, dois dias antes, confira a lista de quem confirmou para planejar a sala e a pauta. Reunião com presença confirmada é reunião que começa no horário.`,
  },
  {
    title: "Compartilhar calendário com equipe pedagógica",
    body: `Compartilhar o calendário inteiro — não um evento, mas o calendário completo de uma turma — é o recurso que organiza equipes inteiras. Nos três pontinhos do calendário (na lista à esquerda) > "Configurações e compartilhamento", você define as permissões: quem pode ver todos os detalhes, quem pode ver apenas "livre/ocupado" e quem pode até editar o calendário.

O uso pedagógico clássico: o calendário da turma compartilhado com os alunos (como "ver detalhes de todos os eventos") para que eles acompanhem provas e entregas; o calendário da disciplina compartilhado entre os professores da mesma série para alinhar avaliações; e o calendário da coordenação compartilhado com toda a equipe para eventos institucionais.

O nível "ver apenas livre/ocupado" é a solução para a privacidade: os colegas veem quando você está ocupado (para marcar reuniões) sem ver o detalhe dos seus compromissos. É o padrão recomendado para compartilhamentos amplos dentro da escola — transparência de agenda sem exposição de detalhes.

Dica de implantação na escola: proponha à coordenação o "calendário institucional único" — um calendário com feriados, reuniões, provas unificadas e prazos administrativos, compartilhado com todos os professores como "ver detalhes". Cada professor o adiciona à própria lista de calendários (o botão "+" > "Inscrever-se em calendário" ou o link de compartilhamento) e ele passa a aparecer junto com os calendários pessoais. Uma escola, uma agenda, zero comunicados perdidos.`,
  },
  {
    title: "Calendário coletivo de turma visível para alunos",
    body: `O calendário coletivo da turma é o canal oficial de datas da sala: provas, entregas, apresentações e eventos — tudo em um calendário que os alunos acompanham pelos próprios celulares. A montagem é simples: crie um calendário com o nome da turma ("1º Ano A - 2026"), adicione todos os eventos de avaliação e compartilhe com os alunos no modo "ver detalhes de todos os eventos".

O compartilhamento pode ser feito por e-mail (cada aluno adiciona o calendário à própria agenda) ou pelo link de compartilhamento, que também pode ser colocado no Google Classroom — "adicionar o calendário da turma" vira uma das primeiras instruções do ano letivo. A partir daí, o aluno vê as datas na agenda dele, com lembretes próprios.

A grande vantagem é a redução de perguntas: "professor, quando é a prova?" deixa de ser uma pergunta por aluno — a resposta está no calendário, que o aluno consulta sozinho. E as mudanças de data (adiamento por feriado, por exemplo) chegam na hora, porque o calendário compartilhado atualiza automaticamente no aparelho de todos.

Dica de combinação com o Classroom: o Google Classroom já cria um calendário próprio para cada turma, onde caem automaticamente as atividades com prazo. Use o calendário do Classroom para as atividades digitais e o seu calendário compartilhado da turma para as avaliações presenciais e eventos — ou ensine os alunos a sobrepor os dois na agenda, criando a visão completa do que a turma tem pela frente.`,
  },
];



// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.7 Google Classroom
// ──────────────────────────────────────────

const classroomLessons: LessonData[] = [
  {
    title: "O que é o Google Classroom e como se diferencia de grupos de WhatsApp",
    video: "https://www.youtube.com/watch?v=8Mp4kQ0Ri8o",
    body: `O Google Classroom (em português, "Sala de Aula do Google") é o ambiente virtual de aprendizagem da escola: um espaço online onde a turma encontra tudo o que o professor publica — avisos, atividades, materiais, avaliações — organizado por data e por tópico, com registro de quem entregou e quem não entregou.

A diferença para o grupo de WhatsApp é estrutural. No WhatsApp, tudo se mistura: o aviso da prova se perde entre memes, as entregas são fotos bagunçadas no chat e não existe registro organizado de nada. No Classroom, cada atividade é um item separado, com prazo, status de entrega e nota — o professor acompanha tudo em uma visão clara, e nada se perde.

Outra diferença essencial: no Classroom, o conteúdo fica organizado por tópicos (unidades, bimestres, semanas), e o professor tem um painel de avaliação com as notas de todas as atividades de cada aluno. No WhatsApp, não existe isso — a "nota" depende de o professor anotar cada entrega à mão.

Dica de mentalidade: o Classroom não substitui o WhatsApp — cada um tem seu papel. O WhatsApp fica para o aviso rápido ("a aula de hoje começa 10 minutos mais tarde"); o Classroom é o registro oficial da aprendizagem: atividades, prazos, entregas e notas em um só lugar, organizado e consultável. O professor moderno usa os dois, cada um para o que faz de melhor.`,
  },
  {
    title: "Criar uma turma e configurar informações básicas",
    video: "https://www.youtube.com/watch?v=DIVzWLrEjF8",
    body: `Para criar uma turma, acesse classroom.google.com e clique no "+" no canto superior direito, escolhendo "Criar turma". Preencha o nome da turma (ex.: "6º Ano A - 2026"), a seção (ex.: "Matemática") e, se quiser, a sala e o assunto. O nome da turma é o que os alunos veem — use o padrão da escola para facilitar a identificação.

Depois de criar, é hora da configuração básica: na turma, o menu de engrenagens (⚙️) dá acesso às configurações, onde você define o código da turma (editável), o tema visual (escolha um fundo para a página da turma), e os serviços que os alunos podem usar nas atividades (por exemplo, se podem postar no mural ou apenas comentar).

O mural é a página inicial da turma: é onde aparecem os avisos e as atividades, em ordem cronológica. O painel lateral "Pessoas" mostra os professores e alunos da turma, e a aba "Trabalhos" organiza as atividades por tópico. A aba "Notas" concentra o painel de avaliação, e a "Google Agenda" mostra o calendário de prazos da turma.

Dica de primeiro dia: crie a turma antes da primeira aula e personalize o visual com o tema — uma turma com cara de "nossa sala" gera identificação imediata. Depois, escreva um aviso de boas-vindas no mural com as regras de uso (prazos, formato das entregas, canal de dúvidas). O primeiro dia no Classroom já mostra aos alunos que ali é um espaço organizado e importante.`,
  },
  {
    title: "Convidar alunos por código ou e-mail",
    body: `Existem duas formas principais de levar os alunos para a turma: pelo código e pelo e-mail. O código da turma aparece no cabeçalho da página (formato de 6 a 7 caracteres, como "abc1234") e é a forma mais rápida: os alunos abrem classroom.google.com, clicam no "+" > "Entrar na turma" e digitam o código — sem precisar de e-mail digitado por você.

A forma por e-mail: na aba "Pessoas", clique em "Convidar alunos" e digite os e-mails dos alunos (ou cole a lista). Eles recebem um convite por e-mail e entram na turma com um clique. Essa forma é ideal para turmas menores ou quando os alunos ainda estão aprendendo a usar a plataforma.

O código pode ser renovado e desativado: nos três pontinhos ao lado do código, você pode redefini-lo (se vazou para quem não devia) ou desativá-lo (quando todos já entraram, evitando intrusos). Você também vê quantos alunos já entraram na aba "Pessoas" — a conferência de "quem ainda falta entrar" fica fácil.

Dica de controle: na primeira aula com o Classroom, projete o código na lousa e dê 5 minutos para todos entrarem; depois, acompanhe na aba "Pessoas" quem ficou de fora e resolva na hora. Se um aluno sem e-mail institucional precisar entrar, você pode usar o e-mail pessoal dele — e, se a escola tiver uma política de contas, oriente os alunos a usarem a conta da escola para tudo o que for acadêmico.`,
  },
  {
    title: "Organizar a turma por tópicos e disciplinas",
    video: "https://www.youtube.com/watch?v=4X-e_f9MLSY",
    body: `Os tópicos são as "pastas" do Classroom: você agrupa as atividades por unidade, bimestre, semana ou tipo. Para criar um tópico, na aba "Trabalhos", clique em "Criar" > "Tópico" e dê um nome ("Unidade 1 - Frações", "1º Bimestre", "Semana 3"). Depois, cada atividade criada pode ser associada a um tópico no momento da criação.

A organização por tópicos transforma a aba Trabalhos em uma estrutura clara: em vez de uma lista longa e cronológica, as atividades ficam agrupadas — o aluno abre "Unidade 1" e vê tudo o que foi feito naquela unidade. Para turmas com duas disciplinas no mesmo Classroom (o que não é recomendado, mas acontece), os tópicos separam as disciplinas.

Você pode organizar os tópicos na ordem que quiser — arraste-os para reordenar — e mover atividades entre tópicos (nos três pontinhos da atividade > "Mover"). As atividades com prazo aparecem também no calendário da turma automaticamente, então a estrutura por tópicos organiza a aba Trabalhos sem atrapalhar a visão de prazos.

Dica de organização anual: crie os tópicos do ano inteiro no início do ano letivo, na ordem em que serão usados ("Unidade 1", "Unidade 2"... ou "1º Bimestre"... "4º Bimestre"). Criar a estrutura uma vez no começo evita a bagunça de atividades soltas no fim do ano — e os alunos aprendem a se orientar pela estrutura fixa da turma.`,
  },
  {
    title: "Publicar avisos e comunicados para a turma",
    body: `Os avisos são as mensagens que aparecem no mural da turma — o canal oficial de comunicação com todos os alunos. Para publicar, na aba "Mural", clique em "Compartilhe algo com sua turma", escreva a mensagem e clique em "Publicar". O aviso aparece no mural para todos, com a data e o seu nome.

Os avisos aceitam conteúdo rico: além do texto, você pode anexar arquivos do Drive, links (por exemplo, o link do formulário de inscrição), vídeos do YouTube e até perguntas. O botão de fixar (📌) mantém um aviso no topo do mural — perfeito para comunicados permanentes, como "datas das provas do bimestre" ou "regras da turma".

Os alunos podem comentar nos avisos (conforme a permissão configurada) e, se você ativar a opção, o aviso pode ser enviado por e-mail para todos os alunos que não visitaram a turma recentemente — o Classroom avisa "ainda não visto por X alunos" e você pode reenviar. Você também pode publicar o mesmo aviso em várias turmas de uma vez, selecionando as turmas antes de publicar.

Dica de comunicação: use os avisos para o que é informação oficial (datas, combinados, materiais) e mantenha o padrão — um aviso por assunto, com título claro. E aproveite o recurso "atribuir a várias turmas" para comunicados gerais: um aviso publicado em todas as suas turmas de uma vez economiza tempo e garante que ninguém fique de fora.`,
  },
  {
    title: "Criar e atribuir atividades com prazo",
    video: "https://www.youtube.com/watch?v=ONbClF7k-q0",
    body: `A atividade é a peça central do Classroom — o trabalho que o aluno deve realizar e entregar. Para criar, na aba "Trabalhos", clique em "Criar" > "Atividade". No formulário, preencha o título ("Atividade - Frações equivalentes"), as instruções (o passo a passo do que fazer), escolha o tópico e defina o prazo: a data e a hora de entrega.

No prazo, você pode adicionar pontos (quanto vale a atividade: 10, 20, 100) e o tema da avaliação — o Classroom soma automaticamente as notas de todas as atividades. Para entregas que precisam ser feitas no papel, existe a opção de atividade "sem entrega digital" — o aluno marca como concluída e você lança a nota manualmente.

As instruções da atividade podem incluir arquivos anexados (o enunciado em PDF, o modelo em Docs) e links (o formulário do quiz, o vídeo de apoio). O campo "Tópico" organiza a atividade na estrutura da turma, e as opções avançadas definem se o aluno pode editar após o prazo e se as notas são anônimas (para avaliações entre pares).

Dica de configuração: defina prazos realistas com hora — "15/05 às 23:59" em vez de apenas "15/05" — e use o campo "Instruções" com clareza: o que fazer, como entregar, o que será avaliado. Uma atividade com instruções completas reduz em 80% as dúvidas dos alunos ("é para fazer onde?") e as entregas erradas. E ative o lembrete automático: o Classroom lembra os alunos que não entregaram — você não precisa ser o cobrador.`,
  },
  {
    title: "Tipos de atividade: tarefa, quiz, pergunta, material",
    body: `O menu "Criar" da aba Trabalhos oferece quatro tipos de itens, e cada um serve a um propósito. A "Atividade" é a tarefa com entrega e nota — o tipo mais comum: o aluno anexa o trabalho (ou trabalha no arquivo do Google) e entrega. O "Quiz" é a atividade ligada ao Google Forms: você escolhe um formulário em modo quiz e a nota corrigida pelo Forms volta automaticamente para o Classroom.

A "Pergunta" é uma atividade de resposta rápida, sem arquivo: você pergunta ("Qual é a função do numerador?") e os alunos respondem em texto curto, com a opção de resposta curta ou múltipla escolha — perfeita para sondagens, verificação de leitura e opiniões. A "Pergunta" pode ter nota e prazo, ou ser apenas discussão.

O "Material" é um item de estudo, sem entrega e sem nota: um texto, uma apresentação, um link, um vídeo — o aluno consulta quando quiser. É onde ficam os conteúdos de apoio ("Material da aula 5 - slides e leitura complementar"), organizados por tópico como as atividades.

Dica de combinação: use os quatro tipos no mesmo fluxo de aprendizagem — "Material" para o conteúdo, "Pergunta" para verificar a compreensão inicial, "Atividade" para o trabalho com entrega e nota, e "Quiz" para a avaliação objetiva com correção automática. Essa sequência — ver, responder, produzir, avaliar — estrutura a aprendizagem da semana no Classroom de forma completa e visível para o aluno.`,
  },
  {
    title: "Anexar arquivos do Drive nas atividades",
    body: `Os arquivos do Drive são a forma principal de distribuir material no Classroom — e o recurso mais poderoso é a cópia individual. Ao criar uma atividade, clique no ícone do Drive para anexar um arquivo (o enunciado em Docs, a planilha modelo, a apresentação de apoio). O anexo aparece como um cartão na atividade, e os alunos o abrem com um clique.

O segredo é o menu ao lado do arquivo anexado: ele oferece três formas de entrega. "Os alunos podem ver o arquivo" — todos veem o mesmo arquivo, sem cópias (ideal para materiais de leitura). "Os alunos podem editar o arquivo" — todos editam o mesmo arquivo (raro, usado para construção coletiva). E a mais valiosa: "Fazer uma cópia para cada aluno" — cada aluno recebe automaticamente a própria cópia do arquivo, já nomeada com o nome dele.

A cópia individual elimina os clássicos problemas dos trabalhos digitais: ninguém apaga o trabalho do outro (cada um tem a própria cópia), o arquivo original do professor fica intacto, e a entrega acontece no próprio arquivo — o aluno trabalha na cópia e clica em "Entregar" quando termina.

Dica de fluxo de trabalho: use "Fazer uma cópia para cada aluno" para atividades práticas (preencher um roteiro, resolver uma lista, montar uma apresentação). Use "os alunos podem ver" para materiais de estudo. E lembre: o arquivo anexado precisa estar no seu Drive com permissão adequada — o Classroom cuida disso automaticamente quando o arquivo é do seu Drive.`,
  },
  {
    title: "Visualizar entregas dos alunos",
    body: `A aba "Trabalhos" de cada atividade mostra o painel de entregas: "Entregues", "Atribuídos" (ainda não entregues), "Devolvidos" e "Sem nota". Clicando em uma atividade, você vê imediatamente quem entregou e quem está pendente — a visão de acompanhamento que substitui a famosa pergunta "quem ainda não entregou?".

Na visão da atividade, cada aluno aparece com o status da entrega: "Entregue" (com a data), "Atribuído" (pendente) ou "Ausente" (não marcado). O Classroom organiza a lista e você abre cada entrega com um clique para corrigir. O recurso "Ver comentário da turma" permite dar feedback geral, e o botão de marcar ausência atualiza o status de quem não respondeu.

Um recurso de economia de tempo: o Classroom permite devolver atividades com comentários privados para cada aluno — e os comentários podem incluir anexos (um documento corrigido, por exemplo). O painel de avaliação (aba "Notas") consolida todas as notas de todas as atividades em uma planilha, exportável para o Google Planilhas.

Dica de acompanhamento: use o painel de entregas como ferramenta de intervenção precoce — dois dias antes do prazo, verifique quem ainda não entregou e envie um lembrete individual (o Classroom tem o botão "Lembrar" para quem está pendente). E ao corrigir, use os comentários privados como feedback individualizado — o aluno recebe o retorno no próprio trabalho, e o registro da correção fica salvo.`,
  },
  {
    title: "Devolver atividade com comentário e nota",
    video: "https://www.youtube.com/watch?v=uknBu1_EbCc",
    body: `A devolução é o fechamento do ciclo da atividade: você corrige, dá a nota e devolve para o aluno. No painel da atividade, abra a entrega do aluno, escreva o comentário privado (o feedback), defina a nota (ou clique em "Sem nota") e clique em "Devolver". O aluno recebe a notificação e vê o trabalho corrigido, o comentário e a nota.

A devolução em lote economiza tempo: você pode selecionar várias entregas e devolvê-las de uma vez, definindo a mesma nota e o mesmo comentário para todas — ou usar o recurso de nota em lote com pontos diferentes, preenchendo cada campo. Para turmas grandes, a correção em lote é o que torna o Classroom viável no dia a dia.

O ciclo se completa com a "revisão": se o aluno reentrega depois de uma devolução (você pediu ajustes), a entrega volta com a marca de "entregue novamente" e você corrige de novo. O histórico de tentativas fica registrado — útil para acompanhar a evolução do aluno na reescrita.

Dica de feedback: o comentário privado é o seu espaço de conversa individual com cada aluno. Prefira feedback específico ("a introdução ficou clara; no parágrafo 3, o exemplo precisa de fonte") a genérico ("bom trabalho"). E combine a nota com o comentário: o aluno entende por que recebeu aquela nota — e a devolução vira parte do aprendizado, não apenas um número no sistema.`,
  },
  {
    title: "Acompanhar quem entregou e quem está pendente",
    body: `O acompanhamento de pendências é uma das funções que mais economizam o tempo do professor — e o Classroom faz isso automaticamente. No painel da atividade, as abas mostram "Entregues" e "Atribuídos" com contagem: você vê de uma olhada que, de 32 alunos, 24 entregaram e 8 estão pendentes — sem precisar conferir lista por lista.

Na visão geral da aba "Trabalhos", cada atividade mostra a contagem de entregas. E no painel de avaliação (aba "Notas"), você tem a matriz completa: linhas de alunos, colunas de atividades, com o status de cada célula — entregue, pendente, devolvido, nota lançada. A matriz revela padrões: o aluno que nunca entrega, a atividade que quase ninguém fez.

O Classroom oferece dois botões de ação para pendências: "Lembrar" envia um e-mail automático para todos os alunos que não entregaram — você não precisa copiar e-mails um a um; e "Marcar como ausente" registra formalmente a ausência de quem não respondeu, atualizando o status para o conselho de classe.

Dica de gestão: crie o hábito do "checkpoint de pendências" — duas vezes por semana (ex.: terça e sexta), abra o painel de avaliação e verifique a matriz. Identifique pendências que se acumulam, envie os lembretes e registre as ausências. Esse ritual de 10 minutos impede que pendências se acumulem até o fim do bimestre — quando é tarde demais para intervir.`,
  },
  {
    title: "Integração com Google Forms para avaliações",
    body: `A integração entre Classroom e Forms é a dupla mais poderosa para avaliações: o quiz do Forms (com correção automática, como você viu no módulo de Formulários) vira uma atividade do Classroom com a nota voltando sozinha. Para criar, na aba "Trabalhos", clique em "Criar" > "Quiz", anexe o formulário em modo quiz (ou crie um novo a partir do Classroom) e defina o prazo e os pontos.

O fluxo completo da avaliação: o aluno abre a atividade no Classroom, clica no link, responde o quiz no Forms e envia. A correção acontece no momento do envio (gabarito e pontos configurados). As notas entram no painel de avaliação do Classroom automaticamente — sem planilha manual, sem conferência de notas na mão.

Um detalhe importante: o quiz do Forms precisa estar em modo "quiz" (ativado nas configurações) e, para o Classroom receber as notas, o formulário deve estar anexado como quiz na atividade. A opção de liberar as respostas corretas após o envio (configurada no Forms) controla se o aluno vê o gabarito — para avaliações formais, libere depois; para quizzes de estudo, libere na hora.

Dica de fluxo de avaliação bimestral: monte o padrão — quiz no Forms com gabarito e feedback por questão, anexado como atividade no Classroom com prazo e pontos. O aluno responde, o sistema corrige, a nota entra no painel, e você exporta o painel para o Planilhas para os cálculos de média. O ciclo inteiro — aplicar, corrigir, registrar, calcular — em poucos minutos, com dados organizados para o conselho de classe.`,
  },
  {
    title: "Compartilhar materiais do Drive diretamente na turma",
    body: `Distribuir materiais no Classroom pelo Drive é simples e organizado: na aba "Trabalhos", clique em "Criar" > "Material", anexe os arquivos do Drive (a apresentação da aula, o texto de apoio, a lista de exercícios) e publique. O material aparece no mural e na aba Trabalhos, agrupado no tópico escolhido — o aluno encontra o conteúdo da semana em um lugar só.

A diferença para anexos de atividade: o "Material" é para consulta, sem entrega e sem prazo — o aluno estuda quando quiser. Use materiais para os conteúdos de apoio da semana, organizados por tópico ("Unidade 2 - Materiais"), e reserve as "Atividades" para o que precisa ser entregue.

O compartilhamento também acontece por link: você pode colar no material um link do Drive (um vídeo armazenado no Drive, uma pasta inteira de recursos) ou links externos (o site da atividade interativa, o vídeo do YouTube). E há o fluxo inverso: materiais criados no Classroom ficam no seu Drive, numa pasta automática "Classroom" — fácil de acessar e organizar depois.

Dica de curadoria: crie o hábito de publicar o material antes da aula — os alunos que se antecipam estudam antes, e os que faltam encontram o conteúdo sem precisar pedir. E use a descrição do material para dar contexto ("Leia antes da aula de terça — traz dúvidas para discutirmos"). O material no Classroom transforma a aula presencial em ponto de partida, não de chegada: o conteúdo já está disponível, a aula aprofunda.`,
  },
  {
    title: "Controle de permissões de edição nas atividades dos alunos",
    body: `O controle de quem edita o quê é um dos detalhes que mais evitam dor de cabeça no Classroom. Quando você anexa um arquivo a uma atividade, as três opções de permissão — "ver", "editar" e "fazer uma cópia para cada aluno" — definem exatamente o que cada aluno pode fazer com aquele arquivo.

Para atividades individuais, "Fazer uma cópia para cada aluno" é quase sempre a escolha certa: cada aluno recebe a própria cópia, edita apenas ela, e o arquivo de referência fica intacto. Para materiais de leitura, "ver" (sem cópia) é o ideal — ninguém edita, todos leem o mesmo conteúdo. A opção "editar" (todos no mesmo arquivo) é para casos específicos, como construção coletiva de um documento da turma.

Além das permissões do arquivo, o Classroom controla as permissões da própria turma nas configurações (engrenagem): quem pode postar no mural, quem pode comentar, quem pode enviar mensagens privadas — e se os alunos podem comentar e responder comentários nas atividades. Configurar isso no início do ano define o clima da turma digital.

Dica de proteção: no início do ano, defina as permissões do mural (por exemplo, "somente professores podem postar; alunos podem comentar") e explique aos alunos por quê — o mural organizado é um espaço de todos. E lembre: mesmo com a permissão certa, acidentes acontecem — o histórico de versões do Docs e o "desfazer" do professor (reabrir o arquivo do aluno) resolvem os imprevistos sem drama.`,
  },
  {
    title: "Alunos acessando e entregando atividades pelos computadores da escola",
    body: `A realidade de muitas escolas: os alunos acessam o Classroom pelos computadores do laboratório ou da sala de informática — e o fluxo precisa funcionar nesse cenário. O primeiro passo é garantir o acesso: computadores conectados à internet, com navegador atualizado (Chrome é o ideal) e o aluno logado na conta Google da escola (ou pessoal, conforme a política).

Para a aula no laboratório, o fluxo padrão: o aluno abre classroom.google.com, entra na turma, abre a atividade, trabalha no arquivo (na própria cópia, se for individual) e clica em "Entregar" antes de sair do computador. Um detalhe crítico: oriente os alunos a entregar no mesmo computador ou salvar o progresso — o Docs salva automaticamente, mas a entrega final deve ser feita com a conta certa logada.

As instruções para a aula no laboratório fazem toda a diferença: um material no Classroom "Roteiro da aula no laboratório" com o passo a passo (entrar, abrir, trabalhar, entregar) reduz o caos do primeiro contato — e os alunos que terminam cedo sabem exatamente o que fazer enquanto os outros terminam.

Dica de rotina: no início do ano, faça uma "aula de treinamento do Classroom" no laboratório: todos entram, abrem uma atividade de teste, entregam e conferem a devolução. Uma aula gasta nesse treinamento economiza dezenas de aulas futuras — os alunos que dominam o fluxo do laboratório não precisam de ajuda a cada atividade, e o tempo de aula fica para o aprendizado, não para a logística.`,
  },
];



// ──────────────────────────────────────────
// Conteúdo didático — Módulo 1.8 Uso Pedagógico da Lousa Digital
// ──────────────────────────────────────────

const lousaLessons: LessonData[] = [
  {
    title: "O que é a lousa digital e seus recursos básicos",
    video: "https://www.youtube.com/watch?v=0-pVU7ffsp8",
    body: `A lousa digital é uma tela sensível ao toque conectada a um computador, que substitui o quadro branco e o giz: você escreve com os dedos ou com uma caneta própria, toca para navegar, abre arquivos, vídeos e sites, e tudo o que faz aparece na tela — grande e visível para a turma inteira.

Os recursos básicos presentes na maioria das lousas: a escrita à mão livre (com várias cores de caneta e borracha), o toque para clicar e arrastar (como um mouse gigante), o teclado virtual na tela, e o reconhecimento de escrita (o que você escreve vira texto digitado). Muitas também têm atalhos físicos na lateral: ligar/desligar, calibrar e ajustar volume.

A lousa digital não é "um quadro com cara de tablet": é uma janela para todo o conteúdo digital. Com ela, a aula pode navegar pela internet, exibir vídeos, abrir o material do Drive e rodar atividades interativas — sem precisar montar projetor, notebook e caixa de som separadamente.

Dica para o primeiro contato: explore a lousa quando a sala estiver vazia — ligue, teste a caneta, escreva, apague, abra um site. Dez minutos de exploração solitária valem mais do que meia hora de tentativa na frente da turma. E descubra onde fica o botão de calibração (o ajuste do toque) — é o primeiro socorro quando a lousa começa a "errar o alvo" dos seus toques.`,
  },
  {
    title: "Diferença entre lousa digital e projetor comum",
    body: `A diferença essencial entre a lousa digital e o projetor comum é a interatividade. O projetor exibe o que está no computador — uma imagem parada na parede ou na tela. A lousa digital também exibe, mas com uma diferença enorme: você toca nela para interagir. O que seria uma apresentação passiva vira uma tela com a qual você e os alunos trabalham.

Na prática, as diferenças aparecem em três pontos. A escrita: no projetor, você escreve por cima da imagem com caneta de quadro branco (suja, apaga, e não salva nada); na lousa digital, você escreve com a caneta digital, em qualquer cor, e pode salvar o que escreveu como arquivo. A navegação: no projetor, alguém precisa ficar no computador para mudar de slide; na lousa, você toca na tela para avançar, abrir links e arrastar elementos.

O terceiro ponto é a interatividade com os alunos: na lousa digital, o aluno vai até a frente, toca, desenha, arrasta respostas — participação ativa. No projetor, os alunos assistem; na lousa, eles fazem. É a diferença entre "assistir a aula" e "participar da aula".

Dica de transição: se a escola ainda tem projetor, você já pode ensaiar o fluxo da lousa — projete o material, planeje a aula em slides e prepare as atividades interativas. Quando a lousa chegar, o seu planejamento didático já estará pronto: a tecnologia muda a ferramenta, mas o bom planejamento é o mesmo.`,
  },
  {
    title: "Navegar na internet diretamente pela lousa",
    body: `Navegar pela internet na lousa é uma das atividades mais transformadoras — e a mais simples: abra o navegador (como no computador), digite o endereço e toque para clicar. A lousa funciona como um computador gigante com tela de toque: os sites, os vídeos e as ferramentas online rodam normalmente.

O uso pedagógico da navegação ao vivo: visitar sites de pesquisa junto com a turma (e ensinar a avaliar fontes), acessar jornais e notícias para discussão de atualidades, entrar em mapas interativos, museus virtuais e tours 360 graus, e mostrar o funcionamento real de ferramentas online — "olha como se cadastra, olha onde clica". A lousa transforma a pesquisa em uma experiência coletiva e comentada.

A navegação na lousa também é a porta para as ferramentas da aula: abrir o Google Sala de Aula para mostrar o que a turma precisa fazer, o Google Forms para o quiz ao vivo, o Kahoot para o jogo de revisão — tudo diretamente na tela grande, com a turma acompanhando cada passo.

Dica de preparação: navegue e teste os sites ANTES da aula — alguns sites bloqueiam conteúdo ou não funcionam bem em navegadores específicos, e o carregamento lento mata o ritmo da aula. Tenha os endereços prontos (ou favoritos salvos no navegador da lousa) e um plano B se o site cair na hora. E cuidado com um detalhe: desative o modo de economia de bateria se a lousa travar a navegação — é um problema comum em lousas conectadas por cabo à tomada do notebook.`,
  },
  {
    title: "Abrir e apresentar arquivos do Google Drive na lousa",
    body: `A combinação lousa digital + Google Drive é a base do planejamento sem papel: todo o seu material — apresentações, documentos, planilhas, vídeos — fica no Drive e abre direto na lousa, sem pendrive, sem baixar, sem "não achei o arquivo". O fluxo: abra o navegador na lousa, entre em drive.google.com com sua conta e abra o arquivo da aula.

Os arquivos do Google abrem nos aplicativos nativos: a apresentação abre no Google Apresentações (e você apresenta direto da lousa, tocando para avançar), o documento abre no Docs, a planilha no Planilhas. Tudo funciona com toque — avançar slides, rolar a página, ampliar — e você pode escrever por cima do conteúdo com a caneta da lousa, destacando pontos durante a explicação.

A organização do Drive também aparece na lousa: abra a pasta da turma e navegue pelos materiais do bimestre com os alunos — o conteúdo fica visível e organizado, e os alunos aprendem a estrutura de organização dos materiais.

Dica de eficiência: deixe os materiais da semana prontos em uma pasta do Drive ("Esta semana - 6º Ano") e abra a pasta no início de cada aula. E ative o acesso offline para os arquivos principais — se a internet da escola falhar no meio da aula, a apresentação continua abrindo pela versão offline salva. A lousa com o Drive preparado transforma o improviso em exceção, não em rotina.`,
  },
  {
    title: "Usar o Google Apresentações como quadro interativo",
    body: `O Google Apresentações na lousa é mais do que uma apresentação: é um quadro interativo. A ideia é simples — a apresentação vira a estrutura da aula, e a lousa permite interagir com ela: avançar e voltar slides tocando na tela, escrever por cima dos slides com a caneta (destacando, circulando, ligando conceitos) e abrir links e vídeos dentro da apresentação.

O modo apresentador na lousa funciona com dois dispositivos: a apresentação na lousa (o que a turma vê) e o computador com o modo apresentador (suas notas, o próximo slide, o cronômetro). Se a lousa não suportar dois monitores, use as notas impressas ou uma tela de apoio no celular com o modo apresentador.

As atividades interativas montadas só com slides funcionam muito bem na lousa: o menu da aula com botões de navegação (vimos isso no módulo de Apresentações), os slides de "pergunta e resposta" com revelação progressiva (cada clique revela uma resposta), e os jogos de revisão com botões de alternativa — tudo funciona com toque na lousa, com a turma participando na frente.

Dica de interatividade: crie o hábito do "slide em branco" entre os slides de conteúdo — um slide vazio onde você escreve na lousa as contribuições da turma (o mapa mental da aula, as respostas da discussão). Esse slide vazio transforma a apresentação em um espaço de construção coletiva: o conteúdo do professor e o conhecimento dos alunos se encontram na mesma tela.`,
  },
  {
    title: "Escrever e desenhar diretamente na lousa",
    video: "https://www.youtube.com/watch?v=aGfQ4dEwEIY",
    body: `Escrever e desenhar na lousa digital é o gesto mais natural da ferramenta: pegue a caneta (ou use o dedo, conforme o modelo) e escreva como no quadro branco — com a diferença de que a "tinta" é digital: cores variadas, espessuras de traço, borracha que não deixa resíduo, e o conteúdo pode ser salvo e compartilhado.

Os recursos de escrita variam por modelo: a maioria tem a paleta de canetas (cores e espessuras), a borracha (que apaga só o traço digital, não a imagem de fundo), o seletor de objeto (para mover o que você desenhou) e, em modelos mais completos, o reconhecimento de escrita — o que você escreve se transforma em texto digitado, com formas geométricas que se ajustam sozinhas.

O uso pedagógico é vasto: explicar problemas de matemática passo a passo escrevendo na lousa, desenhar esquemas e mapas conceituais com a turma, corrigir exercícios mostrando o raciocínio em cores, e usar os fundos especiais (quadriculado para gráficos, pautado para escrita, mapas em branco para geografia).

Dica de aula: escreva em cores com função — o título em uma cor, o conceito principal em outra, os exemplos em uma terceira. A cor orienta o olhar dos alunos e organiza a informação no espaço. E crie o hábito de salvar a "lousa do dia" ao final da aula (a maioria das lousas salva como imagem ou PDF): o conteúdo vira material de apoio para quem faltou e registro da aula para você revisar o que foi trabalhado.`,
  },
  {
    title: "Recursos de zoom, destaque e apontador laser virtual",
    body: `Três recursos simples da lousa digital melhoram muito a legibilidade e o foco da aula. O zoom amplia qualquer parte da tela: para mostrar detalhes de uma imagem, um trecho pequeno de texto ou uma fórmula — toque no ícone de lupa (ou o gesto de pinça, se a lousa suportar) e amplie até o que a turma do fundo consiga ler com conforto.

O destaque funciona como um marca-texto gigante: você seleciona a ferramenta de realce e passa sobre o texto ou a imagem para grifar em cor — perfeito para marcar a definição importante, a palavra-chave do enunciado ou o trecho da leitura que será discutido. Combinado com a caneta, o destaque cria camadas de leitura na mesma tela.

O apontador laser virtual substitui o "lápis apontando para a tela": com a ferramenta de laser (em geral um ícone de alvo), um ponto de luz aparece onde você toca e se move — sem deixar marcas, ideal para indicar elementos durante a explicação sem sujar a tela com círculos.

Dica de didática: use os três em sequência — o laser para apresentar o elemento, o zoom para ampliar os detalhes e o destaque para fixar o que importa. Esse fluxo — ver, ampliar, marcar — guia o olhar dos alunos com precisão cirúrgica, e a atenção da turma acompanha exatamente onde você quer que ela esteja.`,
  },
  {
    title: "Exibir vídeos do YouTube integrados à aula",
    body: `Os vídeos do YouTube são um dos recursos mais usados na lousa — e a integração é simples: abra o navegador, acesse youtube.com, toque no vídeo e exiba em tela cheia. A lousa vira um cinema didático, e o vídeo pode ser pausado, voltado e analisado trecho por trecho com a turma.

O fluxo de aula com vídeo tem uma técnica importante: não é "assistir e pronto". A boa prática é o ciclo antes-durante-depois — antes: apresente o que vão assistir e o que observar ("assistam prestando atenção em como o autor explica o conceito X"); durante: pause nos momentos-chave para comentar, perguntar e escrever na lousa por cima do vídeo (o quadro do vídeo congela e você pode circular elementos); depois: discuta o que viram e conecte com o conteúdo da aula.

Para evitar o caos das buscas ao vivo, prepare os vídeos antes: salve-os em uma playlist do seu canal (ou em uma lista de favoritos), teste o carregamento na lousa e tenha o link pronto. E cuidado com dois detalhes técnicos: o volume (teste a caixa de som antes da aula) e os anúncios (se o vídeo tiver comerciais, oriente a turma ou use o recurso de tela cheia para minimizar distrações).

Dica de gestão de tempo: defina a duração realista do vídeo na sua cabeça — um vídeo de 5 minutos com pausas e discussão vira facilmente 20 minutos de aula. Planeje os trechos que serão pausados e as perguntas de cada pausa, e o vídeo deixa de ser um "enrolador de tempo" para se tornar o coração da aprendizagem daquele dia.`,
  },
  {
    title: "Usar a lousa para aplicar quizzes em tempo real com Kahoot e Quizizz",
    video: "https://www.youtube.com/watch?v=9T3vW-gYCX8",
    body: `Os quizzes ao vivo são a forma mais envolvente de revisar conteúdo — e a lousa é o palco perfeito: projete o quiz, os alunos respondem pelos próprios celulares e a pontuação corre em tempo real na tela grande, com animações, sons e ranking. As duas ferramentas mais usadas: o Kahoot (perguntas em tela, respostas coloridas no celular — mais lúdico) e o Quizizz (perguntas e respostas no celular do aluno — cada um no seu ritmo, ótimo para tarefas).

O fluxo de uma partida de Kahoot na lousa: você prepara o quiz antes (kahoot.com — crie as perguntas ou use quizzes prontos da biblioteca), abre na lousa, clica em "Play" e escolhe o modo clássico. A lousa mostra o PIN do jogo e os alunos entram pelo celular (kahoot.it). As perguntas aparecem na lousa, os alunos respondem nos celulares, e o placar atualiza na tela — a turma inteira vê o ranking em tempo real.

O Quizizz funciona de forma parecida, com a diferença do ritmo individual: cada aluno responde no próprio tempo, no próprio celular, e a lousa mostra o progresso da turma. É a escolha ideal para tarefas de casa ou verificação silenciosa — o resultado chega para você em um relatório completo.

Dica pedagógica: use o quiz ao vivo como diagnóstico, não como competição excludente. Reforce que errar faz parte — e aproveite a revisão imediata (o Kahoot mostra a resposta correta após cada pergunta) para explicar o erro na hora, na lousa. E prepare duas versões: o quiz de revisão rápida (5 a 8 perguntas) para o início da aula, e o quiz completo para o fechamento de unidade.`,
  },
  {
    title: "Integrar o Google Classroom com a lousa digital",
    body: `A integração do Classroom com a lousa digital transforma a aula presencial em extensão natural do ambiente virtual: na lousa, você abre a turma do Classroom, mostra o que está publicado, corrige atividades em conjunto e orienta a turma nas entregas — o digital e o presencial se conectam na mesma tela.

O fluxo prático: abra classroom.google.com na lousa, entre na turma e projete o mural — a turma vê os avisos e as atividades em destaque. Abra uma atividade para mostrar o que precisa ser feito, os anexos e o prazo; abra as entregas de alguns alunos para corrigir coletivamente (com a permissão adequada) e use os comentários como exemplo de feedback para toda a turma.

A lousa também é o lugar das aulas práticas de ferramentas: "hoje vamos aprender a usar o Google Apresentações" — projete na lousa, demonstre cada passo, e os alunos acompanham nos computadores do laboratório ou nas próprias contas. O "eu mostro, vocês fazem" ganha escala: uma demonstração na lousa vale por trinta explicações individuais.

Dica de rotina: comece a aula do dia abrindo o Classroom na lousa — 2 minutos para a turma ver o mural, os prazos da semana e o que está pendente. Esse ritual cria o hábito do aluno consultar o Classroom por conta própria e alinha a turma inteira no mesmo ponto de partida, sem que ninguém diga "não sabia o que tinha para fazer".`,
  },
  {
    title: "Espelhar a tela do computador do aluno na lousa",
    body: `Espelhar (ou transmitir) a tela é mostrar na lousa o que está no computador (ou celular) de um aluno — e é um dos recursos mais poderosos para o trabalho com projetos. Quando o aluno projeta a própria tela, o trabalho dele vira objeto de análise da turma inteira: ele apresenta, explica e recebe feedback coletivo.

As formas de espelhar variam por equipamento: algumas lousas têm o espelhamento integrado (o aluno se conecta pelo mesmo Wi-Fi e envia a tela); em outras, você usa ferramentas como o Google Chrome (a guia do aluno é transmitida para a tela), o Meet (compartilhar tela durante a chamada) ou apps de espelhamento compatíveis com a lousa. O detalhe técnico essencial é estar na mesma rede da escola.

Os usos pedagógicos: o aluno apresenta a pesquisa dele para a turma (apresentação de trabalhos sem cabo VGA), mostra um código ou uma solução de problema na aula de informática, compartilha a produção artística para a crítica coletiva, e o professor projeta a tela de um aluno para demonstrar o passo a passo em tempo real.

Dica de gestão: combine as regras antes — o espelhamento é para apresentações e demonstrações combinadas, não para "mostrar o que está na minha tela" por curiosidade. E tenha sempre um plano B: se o Wi-Fi falhar, o aluno apresenta do próprio computador enquanto você abre o arquivo dele no Drive na lousa — o conteúdo chega à tela grande por outro caminho, sem travar a aula.`,
  },
  {
    title: "Salvar e compartilhar o conteúdo trabalhado na lousa",
    body: `Uma das maiores vantagens da lousa digital sobre o quadro de giz: tudo o que você escreve pode ser salvo e compartilhado. A maioria das lousas tem o botão de captura (ou salvar como imagem/PDF) — um toque salva a tela atual com todas as anotações feitas por cima do conteúdo. O arquivo vai para o computador conectado, e você o envia para onde quiser.

O fluxo de compartilhamento: ao final da aula, salve a "lousa do dia" (a apresentação anotada, o mapa conceitual construído, o problema resolvido com as anotações em cores). Envie para o Drive e compartilhe com a turma pelo Classroom como material — quem faltou recupera a aula inteira, e quem esteve presente tem o registro para revisar antes da prova.

Alguns modelos de lousa vão além: o software acompanhante salva a sessão inteira da aula (todas as telas anotadas em sequência) e exporta em PDF, ou até permite gravar a aula em vídeo (tela + narração) para disponibilizar como material de revisão. O registro da aula deixa de depender da memória — ele existe, é digital e é compartilhável.

Dica de rotina: crie o padrão "salvar e enviar em 2 minutos" — ao final de cada aula, salve, suba para a pasta do Drive da turma e publique o link no Classroom. Esse ritual vale ouro na recuperação de conteúdo, na comunicação com a coordenação (que acompanha o que está sendo trabalhado) e na documentação pedagógica da sua prática.`,
  },
  {
    title: "Ferramentas de colaboração em tempo real exibidas na lousa",
    body: `A lousa digital é a vitrine perfeita para as ferramentas colaborativas do Google — e a combinação lousa + Docs/Planilhas/Apresentações cria uma sala de aula onde a turma inteira trabalha junto, em tempo real, com tudo visível na tela grande.

O exemplo clássico: o documento colaborativo da turma. Você abre um Docs compartilhado na lousa com permissão de edição para todos, propõe uma atividade ("vamos escrever coletivamente a definição de X") e os alunos contribuem dos próprios computadores — cada texto que aparece na tela grande tem a cor do cursor do aluno. A turma vê a construção coletiva acontecendo ao vivo: "olha, o texto do João apareceu!".

O mesmo vale para as planilhas (a turma preenche dados coletivamente e os gráficos se formam na lousa) e para as apresentações (cada grupo monta os próprios slides, e a turma acompanha o progresso na tela). O feedback imediato é o grande ganho pedagógico: o aluno vê o trabalho dele projetado, em tempo real, e ajusta com base no que vê.

Dica de organização: para atividades colaborativas na lousa, defina as regras antes — quem edita o quê (cada aluno uma seção), o tempo da atividade e o que será avaliado. E use os cursores coloridos como ferramenta de gestão: enquanto a turma trabalha, você vê na lousa quem está produzindo, quem está parado e quem precisa de ajuda — a intervenção acontece na hora certa, sem esperar o fim da aula.`,
  },
  {
    title: "Boas práticas de gestão de turma com a lousa digital",
    body: `A lousa digital muda a dinâmica da sala — e com ela vêm novas regras de gestão. A primeira boa prática é a do fluxo da aula: defina um ritmo claro (abertura, conteúdo, atividade, fechamento) e mantenha a lousa como o centro visual desse fluxo — a turma sabe que "quando a lousa mostra X, estamos na fase Y" da aula.

A segunda é a gestão da participação: a lousa atrai para a frente — use isso com ordem. Crie o combinado de quem vai à lousa (por rodízio, por sorteio, por voluntariado com limite), cronometre as participações para não virar "um aluno monopoliza a tela" e distribua as oportunidades de tocar, escrever e responder.

A terceira é a gestão da atenção: com uma tela gigante e interativa, a distração também cresce. Combata com estrutura — a lousa mostra apenas o que é relevante no momento (feche as abas que não estão em uso, minimize o que não será usado), evite navegação solta durante a explicação e use os recursos de foco (o laser, o zoom, o destaque) para direcionar o olhar.

Dica de combinados iniciais: no primeiro dia de uso, estabeleça com a turma as regras da lousa: quem manuseia a caneta, como pedir a vez, o que pode e não pode abrir na lousa (nada de redes sociais, por exemplo). Regras combinadas de forma clara no começo evitam os conflitos de gestão ao longo do ano — e a lousa se torna uma aliada do professor, não uma fonte de indisciplina.`,
  },
  {
    title: "Solução de problemas básicos na lousa: travamento, conexão, calibração",
    body: `Toda lousa digital trava um dia — e o professor que sabe os primeiros socorros básicos não perde a aula. O problema mais comum é o travamento: a tela não responde ou congela. O primeiro passo é sempre o mesmo: espere alguns segundos (às vezes é só lentidão), depois feche os programas abertos e, se nada funcionar, reinicie o computador conectado — não a lousa primeiro, mas o sistema que a controla.

O segundo problema clássico é o toque "descalibrado": você toca em um ponto e a lousa responde em outro (o cursor fica "fora do dedo"). Isso se resolve com a calibração — o botão ou atalho de calibração fica na lateral da lousa ou no software da marca. Ao calibrar, você toca nos pontos que aparecem na tela (em geral 5 a 9 pontos) e o alinhamento do toque volta ao normal.

O terceiro é a conexão: a lousa não conecta ao computador (imagem ou toque ausentes). Verifique os cabos (HDMI, USB — o cabo de toque é o que faz a lousa "sentir" o toque), confirme se o software da lousa está aberto no computador, e teste a troca de porta USB. Muitas lousas usam dois cabos — o de imagem e o de toque — e basta um solto para a lousa virar um projetor comum.

Dica de prevenção: anote no caderno de ocorrências da sala os problemas recorrentes da lousa (e a solução que funcionou) — a próxima aula e o próximo professor agradecem. E o recurso mais valioso: conheça o técnico da escola (ou o suporte da marca) e tenha o contato à mão. Saber os primeiros socorros básicos resolve 80% dos problemas; o técnico resolve os outros 20% — com o problema bem descrito, o chamado fica muito mais rápido.`,
  },
  {
    title: "Manutenção e cuidados com a lousa digital",
    body: `Uma lousa digital bem cuidada dura anos — e os cuidados são simples. A regra número um: use a caneta própria (ou as ferramentas do software) para escrever — canetas de quadro branco comuns e marcadores deixam resíduos que danificam a superfície sensível ao toque. E nunca use objetos pontiagudos: a tela é delicada, e um risco no local do sensor pode criar "pontos mortos" permanentes no toque.

A limpeza também tem técnica: use um pano macio levemente umedecido (nada de solventes, álcool em excesso ou produtos abrasivos) e desligue a lousa antes de limpar. A superfície deve ser limpa com frequência — a poeira acumulada interfere no sensor de toque e deixa a lousa "lenta para responder".

O hardware exige cuidados cotidianos: desligue a lousa ao final do dia (muitas ficam em modo de espera consumindo energia e aquecendo), proteja-a de quedas e impactos (o suporte e a instalação na parede devem ser verificados periodicamente), e cuide dos cabos — o cabo de toque, em especial, sofre com o trânsito de pessoas perto da lousa.

Dica de institucionalização: proponha à coordenação o "cuidado coletivo da lousa" — uma lista de verificação simples na sala (lousa desligada ao final do dia? caneta guardada? superfície limpa?) e a nomeação de um professor responsável por conferir a cada semana. Lousa é patrimônio coletivo da escola: quando todos cuidam, a ferramenta está sempre pronta quando a aula precisa — e o investimento da escola rende por muito mais tempo.`,
  },
];



// ──────────────────────────────────────────
// Dados do curso
// ──────────────────────────────────────────

const courseData: CourseData = {
  title: "Alfabetização Digital e Gestão da Aula (Básico)",
  description:
    "Domine as ferramentas Google na prática: Drive, Docs, Apresentações, Forms, Planilhas, Agenda, Classroom e Lousa Digital. Curso 100% didático, passo a passo, pensado para professores que querem modernizar a gestão da aula sem complicação — com vídeo explicativo em aulas-chave e texto de apoio em todas as aulas.",
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

  // 3. Módulos + aulas (upsert: cria se não existir, atualiza se existir)
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

