

// Commit trigger
// Updated images
export const menuData: MenuItem[] = [
  {id: 'bd-1',name: 'Borda de Catupiry',ingredients: 'Borda recheada com queijo tipo Catupiry.',priceSingle: 4,category: 'bordas'},
  {id: 'bd-2',name: 'Borda de Chocolate ao Leite',ingredients: 'Borda recheada com chocolate ao leite.',priceSingle: 5,category: 'bordas'},
  {id: 'bd-3',name: 'Borda de Chocolate Branco',ingredients: 'Borda recheada com chocolate branco.',priceSingle: 5,category: 'bordas'},
  // --- DOBRO PIZZAS: ASSINATURAS DA CASA ---
  {id: 'p-dobro-hothoney', name: 'Calabresa Hot Honey', ingredients: 'Massa artesanal de fermentação lenta, molho pomodoro rústico, mozzarella especial, rodelas tostadas de calabresa defumada nobre e finalização com infusão exclusiva de mel picante da casa (Hot Honey).', priceP: 15.9, priceM: 18.9, priceG: 22.9, category: 'especiais', imageUrl: '/dobro/calabresa-hot-honey.jpeg', isBestseller: true},
  {id: 'p-dobro-peramel', name: 'Pera & Mel', ingredients: 'Base aveludada de queijo gorgonzola e mozzarella selecionada, lâminas frescas de pera, nozes crocantes e fio generoso de mel puro de flor de laranjeira.', priceP: 16.9, priceM: 19.9, priceG: 23.9, category: 'gourmet', imageUrl: '/dobro/pera-mel.jpeg', isBestseller: true},
  {id: 'p-dobro-blumenau', name: 'Linguiça Blumenau Artesanal', ingredients: 'Autêntica linguiça Blumenau defumada artesanalmente e assada no forno, molho pomodoro fresco, queijo mozzarella derretido, cebola roxa finamente fatiada e alecrim fresco.', priceP: 15.9, priceM: 18.9, priceG: 22.9, category: 'especiais', imageUrl: '/dobro/blumenau.jpeg', isBestseller: true},
  {id: 'p-dobro-zucchini', name: 'Zucchini Al Forno', ingredients: 'Massa de fermentação natural, lâminas delicadas de abobrinha italiana marinadas no azeite extravirgem, mozzarella cremosa, lascas de parmesão e raspas perfumadas de limão siciliano.', priceP: 14.9, priceM: 17.9, priceG: 21.9, category: 'vegetarianas', imageUrl: '/dobro/zucchini.jpeg', isBestseller: true},
  {id: 'p-dobro-calabresacream', name: 'Calabresa com Cream Cheese', ingredients: 'Molho de tomate caseiro, mozzarella especial em ponto de ouro, calabresa defumada artesanal e generosas gotas de cream cheese cremoso gratinadas no forno.', priceP: 14.9, priceM: 16.9, priceG: 20.9, category: 'tradicionais', imageUrl: '/dobro/calabresa-cream-cheese.jpeg', isBestseller: true},
  {id: 'p-dobro-classica', name: 'Clássica Dobro', ingredients: 'A clássica margherita elevada: molho rústico de tomates pelados, mozzarella farta, tomatinhos cereja doces confitados e folhas frescas de manjericão aromático.', priceP: 13.9, priceM: 15.9, priceG: 19.9, category: 'tradicionais', imageUrl: '/dobro/classica.jpeg', isBestseller: true},
  {id: 'p-dobro-avelamorango', name: 'Avelã, Morango & Amor', ingredients: 'Massa doce artesanal crocante, camada farta do mais puro creme nobre de cacau e avelãs, fatias frescas de morangos suculentos selecionados e lascas tostadas de amêndoas.', priceP: 15.9, priceM: 17.9, priceG: 21.9, category: 'doces', imageUrl: '/dobro/avela-morango-amor.jpeg', isBestseller: true},
  // --- DOBRO PIZZAS: SANDUBAS ARTESANAIS ---
  {id: 's-dobro-elisabet', name: 'Sanduba Elisabet', ingredients: 'Massa artesanal de pizza Dobro assada na hora, fatias suculentas de rosbife com tempero especial da casa, maionese artesanal da casa, salsa criola, alface americana crocante e toque de cebolinha verde.', priceSingle: 32.0, category: 'sandubas', imageUrl: '/dobro/sanduba-elisabet.jpeg', isBestseller: false},
  {id: 's-dobro-parma', name: 'Sanduba de Parma', ingredients: 'Massa artesanal de pizza Dobro assada na hora, lâminas de presunto de Parma nobre, mussarela de búfala fresca, molho pesto aromático, tomatinhos cereja confit e rúcula fresca selecionada.', priceSingle: 35.0, category: 'sandubas', imageUrl: '/dobro/sanduba-parma.jpeg', isBestseller: false},
];

export const RESTAURANT_WHATSAPP_PHONE = "351938360931";
export const FREE_DELIVERY_THRESHOLD = 35;

export const NEIGHBORHOOD_DELIVERY_FEES: Record<string, number> = {
  "Cotovia": 0,
  "Quintinha": 0,
  "Quintola de Santana": 0,
  "Santana": 0,
  "Maçã": 0,
  "Faúlha": 0,
  "Sampaio": 0,
  "Corredora": 0,
  "Almoinha": 0,
  "Alto das Vinhas": 0,
  "Carrasqueira": 0,
  "Vila de Sesimbra": 2.0,
  "Zambujal": 2.0,
  "Caixas": 4.0,
  "Alfarim": 4.0,
  "Aiana": 4.0,
  "Meco": 5.0,
  "Azeitão": 5.0,
  "Aldeia da Piedade": 5.0,
  "Aldeia de Irmãos": 5.0,
  "Oleiros": 5.0,
  "Várzeas": 5.0,
  "Vila Nogueira": 5.0,
  "Moinho da Torre": 5.0,
  "Casal Bolinhos": 5.0,
  "Lagoa da Albufeira": 6.0
};



export interface ExtraIngredient {
  id: string;
  name: string;
  price: number;
}

export const pizzaExtras: ExtraIngredient[] = [
  { id: 'ex-1', name: 'Extra Queijo', price: 1.50 },
  { id: 'ex-2', name: 'Extra Bacon', price: 1.50 },
  { id: 'ex-3', name: 'Extra Azeitonas', price: 1.00 },
  { id: 'ex-4', name: 'Extra Cebola', price: 1.00 },
  { id: 'ex-5', name: 'Extra Cogumelos', price: 1.00 },
  { id: 'ex-6', name: 'Extra Fiambre', price: 1.50 },
  { id: 'ex-7', name: 'Extra Catupiry', price: 2.00 },
  { id: 'ex-8', name: 'Extra Milho', price: 1.00 }
];

export const menuPizzas = menuData.filter(item => item.id.startsWith('p-'));
export const menuBordas = menuData.filter(item => item.id.startsWith('bd-'));

export const menuDoDia: MenuItem[] = [
  // --- DOBRO PIZZAS: BEBIDAS ---
  {id: 'b-1', name: 'Coca-Cola 350ml (Lata)', ingredients: 'Refrigerante Coca-Cola original lata 350ml gelada.', priceSingle: 6.00, category: 'bebidas', imageUrl: '/dobro/bebida-coca-cola.webp'},
  {id: 'b-2', name: 'Coca-Cola Zero 350ml (Lata)', ingredients: 'Refrigerante Coca-Cola zero açúcar lata 350ml gelada.', priceSingle: 6.00, category: 'bebidas', imageUrl: '/dobro/bebida-coca-cola-zero.webp'},
  {id: 'b-3', name: 'Água Mineral com Gás', ingredients: 'Água mineral gaseificada fresca.', priceSingle: 4.50, category: 'bebidas', imageUrl: '/dobro/bebida-agua.webp'},
  {id: 'b-4', name: 'Água Mineral sem Gás', ingredients: 'Água mineral natural fresca.', priceSingle: 4.00, category: 'bebidas', imageUrl: '/dobro/bebida-agua.webp'},
  {id: 'bd-1',name: 'Borda de Catupiry',ingredients: 'Borda recheada com queijo tipo Catupiry.',priceSingle: 4.00,category: 'bordas'},
  {id: 'bd-2',name: 'Borda de Chocolate ao Leite',ingredients: 'Borda recheada com chocolate ao leite.',priceSingle: 5.00,category: 'bordas'},
  {id: 'bd-3',name: 'Borda de Chocolate Branco',ingredients: 'Borda recheada com chocolate branco.',priceSingle: 5.00,category: 'bordas'},
  {id: 'bd-4',name: 'Borda de Nutella',ingredients: 'Borda recheada com Nutella.',priceSingle: 5.00,category: 'bordas'}
];
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

export const ALL_MENU_ITEMS = [...menuData, ...menuDoDia];

export const menuEsfihas = menuData.filter(item => item.id.startsWith('e-'));
export const menuBebidas = ALL_MENU_ITEMS.filter(item => item.id.startsWith('b-') && !item.id.startsWith('bd-'));
export const menuSandubas = menuData.filter(item => item.category === 'sandubas' || item.id.startsWith('s-'));
