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
  // --- MAIS VENDIDAS (TRADICIONAIS DOBRO) ---
  {
    id: 'p-dobro-classica',
    name: 'Clássica Dobro',
    ingredients: 'Massa artesanal 28cm de fermentação lenta, molho rústico de tomates pelados, mozzarella farta, tomatinhos cereja confitados e folhas frescas de manjericão aromático.',
    priceSingle: 38.0,
    category: 'mais-pedidos',
    imageUrl: '/dobro/classica.jpeg',
    isBestseller: true
  },
  {
    id: 'p-dobro-hothoney',
    name: 'Calabresa Hot Honey',
    ingredients: 'Massa artesanal 28cm de fermentação lenta, molho pomodoro rústico, mozzarella especial, rodelas tostadas de calabresa defumada nobre e infusão exclusiva de mel picante da casa (Hot Honey).',
    priceSingle: 42.0,
    category: 'mais-pedidos',
    imageUrl: '/dobro/calabresa-hot-honey.jpeg',
    isBestseller: true
  },
  {
    id: 'p-dobro-calabresacream',
    name: 'Calabresa com Cream Cheese',
    ingredients: 'Massa artesanal 28cm de fermentação lenta, molho de tomate caseiro, mozzarella especial em ponto de ouro, calabresa defumada artesanal e generosas gotas de cream cheese cremoso gratinadas no forno.',
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

  // --- PIZZAS PREMIUM DOBRO ---
  {
    id: 'p-dobro-blumenau',
    name: 'Linguiça Blumenau Artesanal',
    ingredients: 'Massa artesanal 28cm de fermentação lenta, autêntica linguiça Blumenau defumada artesanalmente e assada no forno, molho pomodoro fresco, mozzarella derretida, cebola roxa finamente fatiada e alecrim fresco.',
    priceSingle: 42.0,
    category: 'premium',
    imageUrl: '/dobro/blumenau.jpeg',
    isBestseller: false
  },
  {
    id: 'p-dobro-jilo',
    name: 'Jiló Especial',
    ingredients: 'Massa artesanal 28cm de fermentação lenta, lâminas finas de jiló confitadas no azeite extravirgem, mozzarella cremosa, lascas de queijo e raspas aromáticas de limão siciliano.',
    priceSingle: 44.0,
    category: 'premium',
    imageUrl: '/dobro/zucchini.jpeg',
    isBestseller: false
  },
  {
    id: 'p-dobro-peramel',
    name: 'Pera & Mel',
    ingredients: 'Massa artesanal 28cm de fermentação lenta, base aveludada de queijo gorgonzola e mozzarella selecionada, lâminas frescas de pera, nozes crocantes e fio generoso de mel puro de flor de laranjeira.',
    priceSingle: 45.0,
    category: 'premium',
    imageUrl: '/dobro/pera-mel.jpeg',
    isBestseller: false
  },
  {
    id: 'p-dobro-avelamorango',
    name: 'Avelã, Morango & Amor',
    ingredients: 'Massa doce artesanal 28cm crocante, camada farta do mais puro creme nobre de cacau e avelãs, fatias frescas de morangos suculentos selecionados e lascas tostadas de amêndoas.',
    priceSingle: 42.0,
    category: 'premium',
    imageUrl: '/dobro/avela-morango-amor.jpeg',
    isBestseller: false
  },

  // --- SANDUBAS ARTESANAIS NA MASSA DA CASA ---
  {
    id: 's-dobro-elisabet',
    name: 'Sanduba Elisabet',
    ingredients: 'Massa artesanal de pizza Dobro assada na hora, fatias suculentas de rosbife com tempero especial da casa, maionese artesanal da casa, salsa criolla fresca, alface americana crocante e toque de cebolinha verde.',
    priceSingle: 32.0,
    category: 'sandubas',
    imageUrl: '/dobro/sanduba-elisabet.jpeg',
    isBestseller: false
  },
  {
    id: 's-dobro-parma',
    name: 'Sanduba de Parma',
    ingredients: 'Massa artesanal de pizza Dobro assada na hora, lâminas de presunto de Parma nobre, mussarela de búfala fresca, molho pesto artesanal aromático, tomatinhos cereja confit e rúcula fresca selecionada.',
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
