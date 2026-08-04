# Controle de Estoque Glipearte

Sistema web de controle de acervo para a **Glipearte Pegue e Monte**, loja de aluguel de artigos para festas. Permite cadastrar produtos e fornecedores, gerenciar quantidades, valores investidos, movimentações financeiras e usuários, além de gerar relatórios e exportar dados.

**Criado e Desenvolvido por Pedro Correia Lopes Filho**

---

## Objetivo

Oferecer uma ferramenta simples, responsiva e acessível para controle interno do acervo da Glipearte, com:

- Cadastro e exclusão de produtos e fornecedores
- Controle de quantidade e valor investido
- Registro de entradas e saídas financeiras
- Busca e filtros para localizar produtos e fornecedores
- Relatórios visuais e exportação CSV
- Gerenciamento de usuários e perfis de acesso

---

## Módulos Implementados

| Módulo | Descrição |
|--------|-----------|
| **Dashboard** | Visão geral com indicadores, gráficos de investimento por categoria, movimentação financeira e tabelas recentes |
| **Estoque** | Lista de produtos com busca, filtros por categoria/status, cadastro, edição e exclusão |
| **Fornecedores** | Cadastro completo de fornecedores com CNPJ, telefone, e-mail, endereço e categoria |
| **Financeiro** | Lançamentos de entradas e saídas vinculados a produtos, com saldo e filtros |
| **Relatórios** | Gráficos de estoque por categoria e status, resumo geral e exportação CSV |
| **Usuários** | Cadastro de usuários com perfis (Administrador, Gerente, Operador, Leitor) e status |

---

## Tecnologias Utilizadas

- **HTML5** semântico e acessível
- **Tailwind CSS** via CDN para estilização responsiva
- **JavaScript** puro (ES6+) como SPA sem backend próprio
- **Chart.js** para visualização de dados
- **Font Awesome** para ícones
- **Google Fonts** (Inter) para tipografia
- **RESTful Table API** para persistência de dados

> **Nota:** este projeto foi entregue como site estático funcional. As tecnologias React, Vue, Angular, Next.js, Laravel, Node.js, Python, Java ou .NET não puderam ser utilizadas porque exigem servidor/back-end, o que está fora do escopo deste agente de sites estáticos. A experiência de usuário, no entanto, é equivalente à de uma aplicação SPA.

---

## Estrutura de Arquivos

```
index.html              # Estrutura principal e navegação
css/
  style.css             # Estilos customizados e utilidades
js/
  app.js                # Lógica da SPA, rotas, API e formulários
.tables/schema.json     # Esquemas das tabelas de dados
README.md               # Documentação
```

---

## Funcionalidades por Tela

### Dashboard (`/`)
- Cards de resumo: produtos cadastrados, itens em estoque, total investido e saldo financeiro
- Gráfico de investimento por categoria (doughnut)
- Gráfico de movimentação financeira (barras)
- Tabelas de produtos e movimentações recentes
- Botão de exportar resumo CSV

### Estoque (`#products` — acessado pelo menu)
- Lista paginável de produtos com busca local e filtros por categoria e status
- Cadastro de produto com nome, categoria, descrição, fornecedor, status, quantidade e valor unitário
- Cálculo automático de valor total
- Edição e exclusão de produtos

### Fornecedores (`#suppliers`)
- Lista com busca por nome, CNPJ ou e-mail
- Cadastro com nome, CNPJ, telefone, e-mail, categoria de fornecimento e endereço
- Edição e exclusão (bloqueada se houver produtos vinculados)

### Financeiro (`#financial`)
- Lançamentos de entrada/saída por categoria (Venda, Aluguel, Compra, Manutenção, Outros)
- Vínculo opcional com produto
- Filtros por tipo, data e busca textual
- Cards de total entradas, saídas e saldo

### Relatórios (`#reports`)
- Gráfico de estoque por categoria (barras)
- Gráfico de status dos produtos (pizza)
- Resumo geral: produtos, fornecedores, itens e investimento
- Exportação completa para CSV

### Usuários (`#users`)
- Cadastro de usuários com nome, e-mail, perfil e status ativo/inativo
- Perfis: Administrador, Gerente, Operador, Leitor
- Edição e exclusão

---

## Modelos de Dados (Tabelas)

### `products`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | Identificador único |
| name | text | Nome do produto |
| description | rich_text | Descrição |
| category | text | Categoria |
| supplier_id | text | ID do fornecedor |
| quantity | number | Quantidade em estoque |
| unit_value | number | Valor unitário investido |
| total_value | number | Valor total investido |
| status | text | Status do produto |
| created_at | datetime | Data de criação |

### `suppliers`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | Identificador único |
| name | text | Nome do fornecedor |
| cnpj | text | CNPJ |
| phone | text | Telefone |
| email | text | E-mail |
| address | rich_text | Endereço |
| category | text | Categoria de fornecimento |
| created_at | datetime | Data de criação |

### `users`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | Identificador único |
| name | text | Nome completo |
| email | text | E-mail |
| role | text | Perfil de acesso |
| active | bool | Ativo/inativo |
| created_at | datetime | Data de criação |

### `financial_records`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | Identificador único |
| type | text | Entrada/Saída |
| category | text | Categoria financeira |
| description | rich_text | Descrição |
| amount | number | Valor |
| date | datetime | Data |
| product_id | text | Produto relacionado (opcional) |
| created_at | datetime | Data de criação |

---

## API Endpoints Utilizados

A aplicação consome a RESTful Table API nos endpoints relativos:

- `GET tables/products?limit=1000`
- `GET tables/suppliers?limit=1000`
- `GET tables/users?limit=1000`
- `GET tables/financial_records?limit=1000`
- `POST tables/{table}` — criar registro
- `PUT tables/{table}/{id}` — atualizar registro
- `DELETE tables/{table}/{id}` — excluir registro (soft delete)

---

## Como Usar

1. Abra `index.html` no navegador ou publique o projeto.
2. Navegue pelos módulos pelo menu lateral.
3. Use os botões **Novo...** para cadastrar produtos, fornecedores, usuários e movimentações.
4. Utilize a **barra de busca** no topo para localizar produtos ou fornecedores rapidamente.
5. Em **Relatórios**, clique em **Exportar CSV** para baixar os dados.

---

## Acessibilidade e Boas Práticas

- HTML semântico com navegação por teclado
- Atributos ARIA em menus, botões e modais
- Contraste adequado entre cores
- Foco visível em elementos interativos
- Modal fechável com tecla `Esc`
- Link "Pular para conteúdo principal"
- Validação em campos obrigatórios
- Layout responsivo para mobile, tablet e desktop

---

## Próximos Passos Recomendados

- Implementar autenticação real (login/senha) quando houver backend disponível
- Adicionar histórico de movimentações de estoque (entrada/saída de itens)
- Criar tela de configurações e categorias personalizadas
- Gerar relatórios em PDF
- Integrar com sistema de cobranças/aluguel

---

## Publicação

Para tornar o site acessível online, utilize a aba **Publish** do projeto. A publicação é feita em um clique e fornece a URL de acesso público.

---

**Autor:** Pedro Correia Lopes Filho  
**Ano:** 2026
