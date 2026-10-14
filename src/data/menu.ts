// DOBRO PIZZAS — Cardápio Oficial
// Tamanho Único 28cm · Receitas Autorais & Fermentação Lenta

export interface MenuItem {
  id: string;
  name: string;
  ingredients: string;
  category: string;
  priceSingle?: number;
  priceP?: number;
  priceM?: number;
  priceG?: number;
  priceBig?: number;
  priceSuperBig?: number;
  imageUrl?: string;
  imageUrl2?: string;
  dayOfWeek?: number;
  isBestseller?: boolean;
}

export const menuData: MenuItem[] = [
  // --- MAIS VENDIDAS ---
  {
    id: 'p-dobro-classica',
    name: 'Clássica',
    ingredients: 'Massa Dobro Longa Fermentação, molho pomodoro, mussarela, tomatinhos, manjericão e orégano.',
    priceSingle: 38.0,
    category: 'mais-pedidos',
    imageUrl: '/dobro/classica.jpeg',
    isBestseller: true
  },
  {
    id: 'p-dobro-hothoney',
    name: 'Calabresa Hot Honey',
    ingredients: 'Massa Dobro Longa Fermentação, molho pomodoro, mussarela, calabresa, molho de mel com pimenta calabresa.',
    priceSingle: 42.0,
    category: 'mais-pedidos',
    imageUrl: '/dobro/calabresa-hot-honey.jpeg',
    isBestseller: true
  },
  {
    id: 'p-dobro-calabresacream',
    name: 'Calabresa e Cream Cheese',
    ingredients: 'Massa Dobro Longa Fermentação, molho pomodoro, mussarela, calabresa, cream cheese e orégano.',
    priceSingle: 39.0,
    category: 'mais-pedidos',
    imageUrl: '/dobro/calabresa-cream-cheese.jpeg',
    isBestseller: true
  },
  {
    id: 'p-dobro-4queijos',
    name: '4 Queijos',
    ingredients: 'Massa Dobro Longa Fermentação, molho pomodoro, mussarela, gorgonzola, cream cheese, parmesão, orégano.',
    priceSingle: 42.0,
    category: 'mais-pedidos',
    imageUrl: '/dobro/4-queijos.jpeg',
    isBestseller: true
  },
  {
    id: 'p-dobro-peperoni',
    name: 'Peperoni',
    ingredients: 'Massa Dobro Longa Fermentação, molho pomodoro, mussarela, peperoni e orégano.',
    priceSingle: 38.0,
    category: 'mais-pedidos',
    imageUrl: '/dobro/peperoni.jpeg',
    isBestseller: true
  },
  {
    id: 'p-dobro-jilo',
    name: 'Jiló',
    ingredients: 'Massa Dobro Longa Fermentação, molho pomodoro, mussarela, jiló cozido, bacon e orégano.',
    priceSingle: 38.0,
    category: 'mais-pedidos',
    imageUrl: '/dobro/jilo.jpeg',
    isBestseller: true
  },

  // --- PIZZAS PREMIUM DOBRO ---
  {
    id: 'p-dobro-blumenau',
    name: 'Blumenau',
    ingredients: 'Massa Dobro Longa Fermentação, molho pomodoro, mussarela, linguiça Blumenau, parmesão e orégano.',
    priceSingle: 42.0,
    category: 'premium',
    imageUrl: '/dobro/blumenau.jpeg',
    isBestseller: false
  },
  {
    id: 'p-dobro-zucchini',
    name: 'Zuchinni',
    ingredients: 'Massa Dobro Longa Fermentação, molho pomodoro, mussarela, fatias de abobrinha italiana flambada no azeite com tomilho, parmesão e orégano.',
    priceSingle: 44.0,
    category: 'premium',
    imageUrl: '/dobro/zucchini.jpeg',
    isBestseller: false
  },
  {
    id: 'p-dobro-peramel',
    name: 'Pêra e Mel',
    ingredients: 'Massa Dobro Longa Fermentação, mel, mussarela, fatias de pera, gorgonzola, finalizada com mel.',
    priceSingle: 45.0,
    category: 'premium',
    imageUrl: '/dobro/pera-mel.jpeg',
    isBestseller: false
  },
  {
    id: 'p-dobro-avelamorango',
    name: 'Avelã, Morango e Amor',
    ingredients: 'Massa Dobro Longa Fermentação, geleia de morango dobro, creme de avelã, morango fresco.',
    priceSingle: 42.0,
    category: 'premium',
    imageUrl: '/dobro/avela-morango-amor.jpeg',
    isBestseller: false
  },
  {
    id: 'p-dobro-roja',
    name: 'Roja',
    ingredients: 'Massa Dobro Longa Fermentação, geléia de frutas vermelhas levemente apimentada, mussarela, gorgonzola.',
    priceSingle: 42.0,
    category: 'premium',
    imageUrl: '/dobro/roja.jpeg',
    isBestseller: false
  },

  // --- SANDUBAS ARTESANAIS NA MASSA DA CASA ---
  {
    id: 's-dobro-elisabet',
    name: 'Sanduba Elisabet',
    ingredients: 'Massa Dobro Longa Fermentação, rosbeef, maionese da casa,salsa criolla, alface americana, cebolinha verde.',
    priceSingle: 32.0,
    category: 'sandubas',
    imageUrl: '/dobro/sanduba-elisabet.jpeg',
    isBestseller: false
  },
  {
    id: 's-dobro-parma',
    name: 'Sanduba de Parma',
    ingredients: 'Massa Dobro Longa Fermentação, molho pesto, rúcula, tomate confit, mussarela de búfala, presunto parma e raspas de limão siciliano',
    priceSingle: 35.0,
    category: 'sandubas',
    imageUrl: '/dobro/sanduba-parma.jpeg',
    isBestseller: false
  }
];

// Telefone oficial Dobro Pizzas
export const RESTAURANT_WHATSAPP_PHONE = "5541995984072";
// Dobro não possui entrega grátis independente do valor do pedido
export const FREE_DELIVERY_THRESHOLD = Infinity;

// Bairros atendidos até ~5km de São José dos Pinhais (Rua Querino Zagonel, 500)
export const NEIGHBORHOOD_DELIVERY_FEES: Record<string, number> = {
  "Itália (Bairro da Casa)": 0,
  "Braga": 0,
  "Centro": 5.0,
  "São Pedro": 5.0,
  "Aristocrata": 5.0,
  "Pedro Moro": 5.0,
  "Cruzeiro": 6.0,
  "Bom Jesus": 6.0,
  "Afonso Pena": 7.0,
  "Colônia Rio Grande": 7.0,
  "Ouro Fino": 8.0,
  "Guatupê": 8.0
};

export interface ExtraIngredient {
  id: string;
  name: string;
  price: number;
}

export const pizzaExtras: ExtraIngredient[] = [
  { id: 'ex-1', name: 'Extra Queijo Mozzarella', price: 6.00 },
  { id: 'ex-2', name: 'Extra Calabresa Defumada', price: 6.00 },
  { id: 'ex-3', name: 'Extra Cream Cheese', price: 7.00 },
  { id: 'ex-4', name: 'Fio de Hot Honey (Mel Picante)', price: 5.00 },
  { id: 'ex-5', name: 'Tomatinhos Confit', price: 5.00 },
  { id: 'ex-6', name: 'Cebola Roxa Fininha', price: 3.00 }
];

export const menuDoDia: MenuItem[] = [
  // --- BEBIDAS GELADAS ---
  { id: 'b-1', name: 'Coca-Cola 350ml (Lata)', ingredients: 'Refrigerante Coca-Cola original lata 350ml gelada.', priceSingle: 6.00, category: 'bebidas', imageUrl: '/dobro/bebida-coca-cola.webp' },
  { id: 'b-2', name: 'Coca-Cola Zero 350ml (Lata)', ingredients: 'Refrigerante Coca-Cola zero açúcar lata 350ml gelada.', priceSingle: 6.00, category: 'bebidas', imageUrl: '/dobro/bebida-coca-cola-zero.webp' },
  { id: 'b-3', name: 'Água Mineral com Gás', ingredients: 'Água mineral gaseificada fresca 500ml.', priceSingle: 4.50, category: 'bebidas', imageUrl: '/dobro/bebida-agua.webp' },
  { id: 'b-4', name: 'Água Mineral sem Gás', ingredients: 'Água mineral natural fresca 500ml.', priceSingle: 4.00, category: 'bebidas', imageUrl: '/dobro/bebida-agua.webp' }
];

export const ALL_MENU_ITEMS = [...menuData, ...menuDoDia];

export const menuPizzas = menuData.filter(item => item.id.startsWith('p-'));
export const menuBordas: MenuItem[] = [];
export const menuEsfihas: MenuItem[] = [];
export const menuBebidas = ALL_MENU_ITEMS.filter(item => item.id.startsWith('b-'));
export const menuSandubas = menuData.filter(item => item.category === 'sandubas' || item.id.startsWith('s-'));
