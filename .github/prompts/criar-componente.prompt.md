---
description: "Cria um novo componente React seguindo os padrões do projeto"
name: "Criar Componente"
argument-hint: "Nome do componente (opcional)"
---

# Criar Componente React

Você é um especialista em React, TypeScript e Tailwind CSS. Sua tarefa é criar um novo componente React seguindo rigorosamente os padrões deste projeto.

## 1. Coleta de Informações (Interativo)

Se o usuário não forneceu o nome do componente ou detalhes suficientes, pergunte:
1.  **Nome do Componente**: (Ex: `Button`, `Card`, `UserProfile`)
2.  **Localização**: Onde o componente deve ser salvo? (Ex: `src/components`, `src/app/components`, pasta específica de uma feature)
3.  **Funcionalidade**: O que o componente deve fazer? Quais props ele deve aceitar?
4.  **Estilo**: Algum requisito específico de estilo (Tailwind)? Deve ser responsivo?
5.  **Ícones**: Necessita de ícones? (Verifique `src/app/components/icons` ou `src/assets/icons`)

## 2. Padrões do Projeto

Ao criar o componente, siga estas diretrizes:

-   **Framework**: Next.js 15 (App Router).
-   **Linguagem**: TypeScript.
-   **Estilização**: Tailwind CSS 4.
-   **Ícones**: Use os ícones existentes em `src/app/components/icons` se possível.
-   **Componentes Funcionais**: Use `const ComponentName = (props: Props) => { ... }`.
-   **Tipagem**: Defina interfaces claras para as props.
-   **Interatividade**: Se precisar de estado ou hooks (`useState`, `useEffect`, etc.), adicione `"use client";` no topo do arquivo.
-   **Acessibilidade**: Use tags HTML semânticas e atributos ARIA quando necessário.
-   **Tema**: Use as cores e variáveis definidas em `src/app/globals.css` e `tailwind.config.js` (se houver).

## 3. Estrutura do Arquivo

```tsx
// src/path/to/Component.tsx
"use client"; // Apenas se necessário

import React from 'react';
// Outros imports

interface ComponentProps {
  // Definição das props
}

export const ComponentName = ({ prop1, prop2 }: ComponentProps) => {
  return (
    <div className="flex flex-col gap-4 p-4 bg-background text-foreground">
      {/* Conteúdo do componente */}
    </div>
  );
};
```

## 4. Execução

1.  **Analise** as respostas do usuário.
2.  **Verifique** se o arquivo já existe para evitar sobrescrita acidental.
3.  **Gere** o código do componente.
4.  **Crie** o arquivo usando a ferramenta `create_file`.

## Exemplo de Uso

**Usuário**: `/criar-componente`
**Assistente**: "Qual o nome do componente e onde deseja salvá-lo?"
**Usuário**: "Quero um `AlertBox` em `src/components`. Ele deve ter um título, uma mensagem e tipos (sucesso, erro, aviso)."
**Assistente**: (Gera o código e cria o arquivo `src/components/AlertBox.tsx`)
