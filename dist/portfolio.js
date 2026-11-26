export const projects = [
  {id:'acai-finance',name:'Açaí Finance',mission:'O dinheiro tem que fechar.',objective:'Comece pela Grove Street e conheça o Açaí Finance.',tag:'SAAS & PAGAMENTOS',district:'GROVE STREET',color:0xd8ed89,x:4,z:12,
    summary:'Uma plataforma SaaS para alimentação e varejo. Catálogo, pedidos, PDV, caixa e pagamentos, com várias empresas no mesmo sistema e os dados de cada uma protegidos.',
    role:'Produto, arquitetura, backend, frontend e infraestrutura',stack:['PHP','React','MySQL','Mercado Pago','Docker'],image:'acai-finance-desktop.webp',live:'https://acaifinance.com.br',repo:'https://github.com/filpe19/acai-finance-case-study',
    proof:['O contexto de cada empresa é validado no backend para impedir acesso cruzado.','Pagamentos e webhooks tratados como eventos que podem se repetir, sem duplicar lançamentos.','Arquitetura, checkout, painel e operação em produção construídos de ponta a ponta.']},
  {id:'tickiton',name:'TickiTon',mission:'Todo ingresso tem seu lugar.',objective:'Cruze o bairro e encontre o ponto da TickiTon.',tag:'WEB & IOS',district:'GANTON · PASSAGEM',color:0xf0bd82,x:-68,z:-1,
    summary:'Bilheteria digital com Pix e cartão, reserva de estoque, ingresso com QR Code assinado e check-in. Uma experiência que conecta a web a um app iOS nativo publicado na App Store.',
    role:'Produto, backend, frontend, app iOS e operação',stack:['PHP','MySQL','SwiftUI','Mercado Pago','Docker'],image:'tickiton-desktop.webp',live:'https://tickiton.com.br',repo:'https://github.com/filpe19/tickiton-case-study',
    proof:['Estoque reservado de forma atômica antes da confirmação do pagamento.','QR Code assinado e validação de entrada com suporte a operação offline.','No teste de carga descrito no projeto, 500 compradores disputaram 300 vagas sem venda além do estoque.']},
  {id:'nix-assistente-ia',name:'Nix Assistente IA',mission:'Uma conversa que resolve.',objective:'Siga até a esquina de Ganton para conhecer a Nix.',tag:'IA & AUTOMAÇÃO',district:'GANTON · ESQUINA',color:0x9acdd6,x:-154,z:-12,
    summary:'Um assistente financeiro no WhatsApp e no Telegram. Você conta o que gastou, por texto ou áudio, e a Nix organiza registros, relatórios, orçamentos e metas.',
    role:'Produto, backend, IA, cobrança e admin',stack:['Laravel','React','Redis','MySQL','whisper.cpp'],image:'nix-desktop.webp',live:'https://assistenteia.online',repo:'https://github.com/filpe19/finance-ai-case-study',
    proof:['IA para interpretar a mensagem; regras financeiras e números calculados pelo backend.','Valores em centavos inteiros e webhooks idempotentes para manter o registro consistente.','Processamento de áudio em fila e respostas determinísticas quando o provedor de IA falha.']}
];
export const contact = {email:'felipealsouza17@gmail.com',github:'https://github.com/filpe19',portfolio:'https://felipesouza.dev'};
