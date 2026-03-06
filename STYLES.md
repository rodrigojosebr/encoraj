# Encoraj — Design System & Estilos

Stack: **Panda CSS** (zero-runtime, PostCSS) + **`@encoraj/ui`** (componentes React).

---

## Estrutura

```
packages/
  panda-config/src/
    tokens/
      colors.ts       ← paleta de cores
      typography.ts   ← fontes, tamanhos, pesos, line-heights
      spacing.ts      ← escala de espaçamento
    recipes/
      button.recipe.ts
      badge.recipe.ts
      text.recipe.ts
      input.recipe.ts
  ui/src/
    atoms/
      Button/         ← buttonRecipe (slot recipe)
      Input/          ← inputRecipe (slot recipe)
      Badge/          ← badgeRecipe
      Text/           ← textRecipe
      Spinner/        ← css() inline
    molecules/
      FormField/      ← Input com label + erro (slot recipe)
      Card/           ← css() inline
      Alert/          ← css() inline
```

---

## Tokens

### Cores

Paleta de valores fixos — usar sempre via token, nunca valor hex cru no código.

**Neutro (gray)**
| Token | Hex | Uso típico |
|---|---|---|
| `gray.50` | `#f9fafb` | fundo de página, input disabled |
| `gray.100` | `#f3f4f6` | fundo de botão secondary, card flat |
| `gray.200` | `#e5e7eb` | borda padrão, divisores |
| `gray.300` | `#d1d5db` | borda de input |
| `gray.400` | `#9ca3af` | placeholder |
| `gray.500` | `#6b7280` | texto caption |
| `gray.600` | `#4b5563` | — |
| `gray.700` | `#374151` | texto label, texto body secundário |
| `gray.800` | `#1f2937` | texto subheading |
| `gray.900` | `#111827` | texto heading, input value |
| `gray.950` | `#030712` | — |

**Brand (blue)**
| Token | Hex | Uso típico |
|---|---|---|
| `blue.50` | `#eff6ff` | hover ghost/outline |
| `blue.100` | `#dbeafe` | badge arrived, focus ring |
| `blue.500` | `#3b82f6` | focus border input |
| `blue.600` | `#2563eb` | botão primary, link |
| `blue.700` | `#1d4ed8` | hover botão primary |
| `blue.800` | `#1e40af` | active botão primary, badge text arrived |
| `blue.900` | `#1e3a8a` | — |

**Semântico**
| Token | Hex | Uso típico |
|---|---|---|
| `green.50` | `#f0fdf4` | Alert success bg |
| `green.100` | `#dcfce7` | Badge delivered bg |
| `green.500` | `#22c55e` | — |
| `green.600` | `#16a34a` | Alert success border |
| `green.700` | `#15803d` | Badge delivered text, Alert success text |
| `yellow.50` | `#fefce8` | Alert warning bg |
| `yellow.100` | `#fef9c3` | Badge notified bg |
| `yellow.500` | `#eab308` | — |
| `yellow.600` | `#ca8a04` | Alert warning border |
| `yellow.700` | `#a16207` | Badge notified text, Alert warning text |
| `red.50` | `#fef2f2` | Alert error bg |
| `red.100` | `#fee2e2` | Focus ring error, botão danger hover |
| `red.500` | `#ef4444` | Input border error |
| `red.600` | `#dc2626` | Botão danger, Alert error border, erro text |
| `red.700` | `#b91c1c` | Alert error text |

---

### Tipografia

**Fontes**
| Token | Valor |
|---|---|
| `sans` | Inter, system-ui, -apple-system, sans-serif |
| `mono` | ui-monospace, SFMono-Regular, Menlo, monospace |

**Tamanhos**
| Token | rem | px |
|---|---|---|
| `xs` | 0.75rem | 12px |
| `sm` | 0.875rem | 14px |
| `base` | 1rem | 16px |
| `lg` | 1.125rem | 18px |
| `xl` | 1.25rem | 20px |
| `2xl` | 1.5rem | 24px |
| `3xl` | 1.875rem | 30px |
| `4xl` | 2.25rem | 36px |

**Pesos**
| Token | Valor |
|---|---|
| `normal` | 400 |
| `medium` | 500 |
| `semibold` | 600 |
| `bold` | 700 |

**Line-heights**
| Token | Valor |
|---|---|
| `tight` | 1.25 |
| `snug` | 1.375 |
| `normal` | 1.5 |
| `relaxed` | 1.625 |

---

### Espaçamento

Escala 4px. Usar sempre tokens — nunca valores arbitrários como `16px` ou `1rem` diretamente.

| Token | rem | px |
|---|---|---|
| `0.5` | 0.125rem | 2px |
| `1` | 0.25rem | 4px |
| `2` | 0.5rem | 8px |
| `3` | 0.75rem | 12px |
| `4` | 1rem | 16px |
| `6` | 1.5rem | 24px |
| `8` | 2rem | 32px |
| `10` | 2.5rem | 40px |
| `12` | 3rem | 48px |
| `16` | 4rem | 64px |
| `20` | 5rem | 80px |
| `24` | 6rem | 96px |

---

## Componentes

### Button

Recipe: `buttonRecipe` (`defineSlotRecipe`) — slots: `root`, `leftIcon`, `rightIcon`.

**Props**
| Prop | Valores | Default |
|---|---|---|
| `variant` | `solid` \| `outline` \| `ghost` | `solid` |
| `intent` | `primary` \| `secondary` \| `danger` | `primary` |
| `size` | `sm` \| `md` \| `lg` | `md` |
| `loading` | `boolean` | `false` |
| `leftIcon` | `ReactNode` | — |
| `rightIcon` | `ReactNode` | — |

**Combinações de variant × intent**

| | `primary` | `secondary` | `danger` |
|---|---|---|---|
| `solid` | bg blue.600, texto white | bg gray.100, texto gray.800 | bg red.600, texto white |
| `outline` | borda blue.600, texto blue.600 | borda gray.300, texto gray.700 | borda red.600, texto red.600 |
| `ghost` | texto blue.600 | texto gray.700 | texto red.600 |

**Tamanhos**
| Size | Height | PaddingX | FontSize |
|---|---|---|---|
| `sm` | 8 (32px) | 3 (12px) | sm |
| `md` | 10 (40px) | 4 (16px) | base |
| `lg` | 12 (48px) | 6 (24px) | lg |

**Exemplos**
```tsx
// Ação principal
<Button>Salvar</Button>

// Cancelar / secundário
<Button intent="secondary">Cancelar</Button>

// Ação destrutiva
<Button intent="danger" variant="outline">Excluir</Button>

// Com loading
<Button loading>Salvando...</Button>

// Com ícone
<Button leftIcon={<PlusIcon />}>Novo morador</Button>

// Tamanho pequeno
<Button size="sm" intent="secondary">Editar</Button>
```

---

### Input

Recipe: `inputRecipe` (`defineSlotRecipe`) — slots: `wrapper`, `label`, `input`, `errorMessage`.

**Props (atom `Input`)**
| Prop | Valores | Default |
|---|---|---|
| `size` | `sm` \| `md` \| `lg` | `md` |
| `error` | `boolean` | `false` |

**Tamanhos**
| Size | Height | PaddingX | FontSize |
|---|---|---|---|
| `sm` | 8 (32px) | 3 (12px) | sm |
| `md` | 10 (40px) | 4 (16px) | base |
| `lg` | 12 (48px) | 4 (16px) | lg |

Estado focus: borda `blue.500` + ring `blue.100`.
Estado error: borda `red.500` + ring `red.100`.

---

### FormField

Wrapper de `Input` com label automático e mensagem de erro. Usa `useId()` internamente — não passar `htmlFor` via prop; o id é gerenciado internamente.

**Props**
| Prop | Tipo | Obrigatório |
|---|---|---|
| `label` | `string` | sim |
| `errorMessage` | `string` | não |
| `hint` | `string` | não |
| `size` | `sm` \| `md` \| `lg` | não |
| `...` | props nativas de `<input>` | — |

**Exemplos**
```tsx
// Campo simples
<FormField label="Nome" name="name" />

// Com erro de validação
<FormField
  label="Email"
  name="email"
  type="email"
  errorMessage="Email inválido"
/>

// Com dica
<FormField
  label="WhatsApp"
  name="whatsapp"
  hint="Formato: +5511999999999"
/>
```

---

### Badge

Recipe: `badgeRecipe` (`defineRecipe`).

**Props**
| Prop | Valores | Default |
|---|---|---|
| `status` | `arrived` \| `notified` \| `delivered` \| `neutral` | `neutral` |

**Cores por status**
| Status | Fundo | Texto | Significado |
|---|---|---|---|
| `arrived` | blue.100 | blue.800 | Encomenda chegou |
| `notified` | yellow.100 | yellow.800 (700) | Morador notificado |
| `delivered` | green.100 | green.700 | Retirado |
| `neutral` | gray.100 | gray.700 | Genérico |

**Exemplos**
```tsx
<Badge status="arrived">Chegou</Badge>
<Badge status="notified">Notificado</Badge>
<Badge status="delivered">Retirado</Badge>
<Badge>Inativo</Badge>
```

---

### Text

Recipe: `textRecipe` (`defineRecipe`). Tag HTML inferida automaticamente por `variant`.

**Props**
| Prop | Valores | Default | Tag padrão |
|---|---|---|---|
| `variant` | `heading` \| `subheading` \| `body` \| `label` \| `caption` | `body` | ver tabela |
| `as` | qualquer tag HTML | (inferido) | — |

**Variantes**
| Variant | FontSize | Weight | LineHeight | Cor | Tag |
|---|---|---|---|---|---|
| `heading` | 3xl | bold | tight | gray.900 | `h1` |
| `subheading` | xl | semibold | snug | gray.800 | `h2` |
| `body` | base | normal | normal | gray.700 | `p` |
| `label` | sm | medium | normal | gray.700 | `span` |
| `caption` | xs | normal | normal | gray.500 | `span` |

**Exemplos**
```tsx
<Text variant="heading">Moradores</Text>
<Text variant="subheading">Lista de moradores cadastrados</Text>
<Text>Texto de parágrafo padrão.</Text>
<Text variant="label">Nome</Text>
<Text variant="caption">Última atualização: hoje</Text>

// Forçar tag diferente
<Text variant="heading" as="h2">Seção secundária</Text>
```

---

### Card

Componente via `css()` inline — sem recipe.

**Props**
| Prop | Valores | Default |
|---|---|---|
| `variant` | `flat` \| `elevated` \| `outlined` | `outlined` |

| Variant | Fundo | Borda | Sombra |
|---|---|---|---|
| `flat` | gray.50 | — | — |
| `elevated` | white | — | `md` |
| `outlined` | white | gray.200 1px | — |

Padding fixo: `6` (24px) em todos os lados.

**Exemplos**
```tsx
// Padrão — formulários, listagens
<Card>
  <Text variant="subheading">Novo morador</Text>
  ...
</Card>

// Destaque visual
<Card variant="elevated">...</Card>

// Fundo sutil
<Card variant="flat">...</Card>
```

---

### Alert

Componente via `css()` inline — sem recipe.

**Props**
| Prop | Valores | Default |
|---|---|---|
| `variant` | `success` \| `error` \| `warning` \| `info` | `info` |
| `title` | `string` | — |

| Variant | Fundo | Borda | Texto |
|---|---|---|---|
| `success` | green.50 | green.500 | green.700 |
| `error` | red.50 | red.500 | red.700 |
| `warning` | yellow.50 | yellow.500 | yellow.700 |
| `info` | blue.50 | blue.500 | blue.700 |

**Exemplos**
```tsx
// Erro de login
<Alert variant="error" title="Credenciais inválidas">
  Verifique email e senha.
</Alert>

// Ação bem-sucedida
<Alert variant="success">Morador cadastrado com sucesso.</Alert>

// Aviso
<Alert variant="warning" title="Atenção">
  Encomenda parada há 7 dias.
</Alert>
```

---

## Convenções de uso

### Usar `css()` vs receita

| Situação | Abordagem |
|---|---|
| Componente reutilizável com variantes | `defineRecipe` ou `defineSlotRecipe` em `packages/panda-config` |
| Layout one-off de página | `css()` inline no componente |
| Sobreposição pontual de estilo | prop `className` + `cx()` |

### Regras

- **Nunca usar valores hex crus** — sempre `token(colors.xxx)` ou shorthand `blue.600`
- **Nunca usar `px` arbitrários** — usar tokens de spacing (`4` = 16px, `6` = 24px, etc.)
- **Novas receitas** sempre em `packages/panda-config/src/recipes/` — nunca dentro de `apps/`
- **Componentes client** (`'use client'`) apenas quando usam estado, efeito ou handlers de evento
- **Rodar `yarn panda`** em `apps/encoraj/` após qualquer alteração em `packages/panda-config/`

### Hierarquia de importação

```ts
// Receita compilada (usada nos componentes)
import { button } from '@encoraj/styled-system/recipes'

// CSS utilitário avulso
import { css, cx } from '@encoraj/styled-system/css'

// Componente do design system
import { Button, FormField, Badge } from '@encoraj/ui'
```
