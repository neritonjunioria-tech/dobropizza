

// Commit trigger
// Updated images
export const menuData: MenuItem[] = [
  {id: 'e-1',name: '1 - Bacon',ingredients: 'mozzarella farta e fatias de bacon crocante cozido.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais'},
  {id: 'e-2',name: '2 - Calabresa',ingredients: 'mozzarella premium e calabresa defumada moída de alta qualidade.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais', imageUrl: '/62-calabresa.png'},
  {id: 'e-3',name: '3 - Calapiry',ingredients: 'combinação saborosa de calabresa defumada com requeijão catupiry legítimo.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais'},
  {id: 'e-4',name: '4 - Carijó',ingredients: 'mozzarella premium, frango temperado e grãos de milho doce cozido.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais'},
  {id: 'e-5',name: '5 - Carne',ingredients: 'delicioso e suculento recheio de carne bovina picada temperada e limão.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais', imageUrl: '/65-carne.png'},
  {id: 'e-6',name: '6 - Crocante',ingredients: 'mozzarella farta, pedacinhos de bacon, milho doce e finalização com batata palha.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais'},
  {id: 'e-7',name: '7 - Fiambre com Queijo',ingredients: 'recheio misto prático com mozzarella e fiambre fatiado picadinho.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais', imageUrl: '/67-fiambrecomqueijo.png'},
  {id: 'e-8',name: '8 - Frango',ingredients: 'mozzarella premium de forno de pedra com peito de frango desfiado temperado.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais'},
  {id: 'e-9',name: '9 - Frango com Catupiry',ingredients: 'frango desfiado temperado com uma camada generosa de catupiry suave.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais'},
  {id: 'e-10',name: '10 - Frampalha',ingredients: 'mozzarella, frango suculento defumado, catupiry cremoso e batata palha crocante.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais'},
  {id: 'e-11',name: '11 - Milho',ingredients: 'massa assada de esfiha com queijo mozzarella bem derretido e milho doce.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais'},
  {id: 'e-12',name: '12 - Milho com Bacon',ingredients: 'mozzarella de forno, pedaços generosos de bacon e milho macio cozido.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais', imageUrl: '/72-milhocombacon.png'},
  {id: 'e-13',name: '13 - Tradicional',ingredients: 'recheio leve com mozzarella farta, fiambre fatiado e pedaços de tomate.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais', imageUrl: '/73-tradicional.png'},
  {id: 'e-14',name: '14 - Margherita',ingredients: 'mozzarella de excelente qualidade, rodelas picadas de tomate e manjericão fresco.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais'},
  {id: 'e-15',name: '15 - Napolitana',ingredients: 'mozzarella cremosinha, tomate fresco picado e farta cobertura de parmesão ralado.',priceSingle: 1.99,category: 'esfihas-salgadas-tradicionais'},
  {id: 'e-16',name: '16 - Brócolis com Bacon',ingredients: 'cobertura de brócolis frescos cortados, mozzarella farta e pedaços de bacon crocante.',priceSingle: 2.99,category: 'esfihas-salgadas-especiais', imageUrl: '/76-brocoliscombacon.png'},
  {id: 'e-17',name: '17 - Carbonara',ingredients: 'recheio especial de mozzarella cremosa, pedaços de bacon saboroso e queijo catupiry.',priceSingle: 2.99,category: 'esfihas-salgadas-especiais'},
  {id: 'e-18',name: '18 - Peperoni',ingredients: 'autêntico sabor de salame peperoni picante fatiado sobre cobertra de mozzarella.',priceSingle: 2.99,category: 'esfihas-salgadas-especiais'},
  {id: 'e-19',name: '19 - Rúcula com Tomate Seco',ingredients: 'mozzarella derretida no forno, folhas picadas de rúcula fresca e tomate seco artesanal.',priceSingle: 2.99,category: 'esfihas-salgadas-especiais'},
  {id: 'e-20',name: '20 - Strogonoff de Carne',ingredients: 'carne bovina tenra ao creme de estrogonofe culinário, champignon e batata palha.',priceSingle: 2.99,category: 'esfihas-salgadas-especiais', imageUrl: '/80-strogonoffdecarne.png'},
  {id: 'e-21',name: '21 - Strogonoff de Frango',ingredients: 'peito de frango picadinho ao molho estrogonofe cremoso, champignon e batata palha.',priceSingle: 2.99,category: 'esfihas-salgadas-especiais'},
  {id: 'e-22',name: '22 - Queijo',ingredients: 'mistura refinada de mozzarella premium com creme de natas e salsa fresca picadinha.',priceSingle: 2.99,category: 'esfihas-salgadas-especiais', imageUrl: '/82-queijo.png'},
  {id: 'e-23',name: '23 - 4 Queijos',ingredients: 'deliciosa fusão de mozzarella farta, parmesão gourmet, provolone fatiado e catupiry.',priceSingle: 2.99,category: 'esfihas-salgadas-especiais'},
  {id: 'e-24',name: '24 - 5 Queijos',ingredients: 'combinação perfeita de cinco queijos:  mozzarella, parmesão, provolone, gorgonzola real e catupiry.',priceSingle: 2.99,category: 'esfihas-salgadas-especiais'},
  {id: 'e-25',name: '25 - Banana com Canela',ingredients: 'mozzarella farta, canela em pó, açúcar confeiteiro e banana prata fatiada e cozida.',priceSingle: 3.5,category: 'esfihas-doces', imageUrl: '/85-bananacomcanela.png'},
  {id: 'e-26',name: '26 - Chocolate Branco',ingredients: 'mozzarella farta servida bem quente com cobertura rica de chocolate branco nobre.',priceSingle: 3.5,category: 'esfihas-doces', imageUrl: '/86-chocolatebranco.png'},
  {id: 'e-27',name: '27 - Chocolate Preto',ingredients: 'cobertura cremosa e farta de calda de chocolate de cacau preto sobre mozzarella.',priceSingle: 3.5,category: 'esfihas-doces', imageUrl: '/87-chocolatepreto.png'},
  {id: 'e-28',name: '28 - Nutella',ingredients: 'recheio dos sonhos com o legítimo creme de chocolate com avelãs Nutella e mozzarella.',priceSingle: 3.5,category: 'esfihas-doces'},
  {id: 'e-29',name: '29 - MM\'s',ingredients: 'esfiha de queijo mozzarella coberta com Nutella farta e repleta de coloridos confeitos MM\'s.',priceSingle: 3.5,category: 'esfihas-doces', imageUrl: '/89-mm.png'},
  {id: 'e-30',name: '30 - Leite Ninho - Nido',ingredients: 'base irresistível de Nutella premium coberta generosamente com o clássico Leite Ninho (Nido) em pó.',priceSingle: 3.5,category: 'esfihas-doces'},
  {id: 'e-31',name: '31 - Oreo Chocolate Branco',ingredients: 'cobertura cremosa de chocolate branco enriquecida com bolachas Oreo originais trituradas.',priceSingle: 3.5,category: 'esfihas-doces'},
  {id: 'e-32',name: '32 - Oreo Chocolate Preto',ingredients: 'calda de chocolate preto de cacau com abundantes farelos crocantes de biscoito Oreo.',priceSingle: 3.5,category: 'esfihas-doces'},
  {id: 'e-33',name: '33 - Prestígio',ingredients: 'cobertura deliciosa de chocolate preto nobre salpicada com coco ralado desidratado fino.',priceSingle: 3.5,category: 'esfihas-doces', imageUrl: '/93-prestigio.png'},
  {id: 'e-34',name: '34 - Sensação com Nutella',ingredients: 'camada de creme de avelã Nutella autêntico finalizada com fatias de morango fresco e maduro.',priceSingle: 3.5,category: 'esfihas-doces'},
  {id: 'e-35',name: '35 - Sensação com Chocolate Branco',ingredients: 'combinação fina de chocolate branco quente nobre derretido com morango em fatias.',priceSingle: 3.5,category: 'esfihas-doces'},
  {id: 'e-36',name: '36 - Sensação com Chocolate Preto',ingredients: 'calda quente artesanal de chocolate preto decorada com morangos frescos picados.',priceSingle: 3.5,category: 'esfihas-doces'},
  {id: 'e-37',name: '37 - Surpresa de Uva Verde Chocolate Branco',ingredients: 'chocolate branco nobre com metades suculentas de uvas verdes finas sem sementes.',priceSingle: 3.5,category: 'esfihas-doces'},
  {id: 'e-38',name: '38 - Surpresa de Uva Verde Chocolate Preto',ingredients: 'calda aveludada de chocolate preto nobre combinada com metades refrescantes de uva verde.',priceSingle: 3.5,category: 'esfihas-doces'},
  {id: 'e-39',name: '39 - Triângulo Amoroso',ingredients: 'visual lindo com metade chocolate preto, metade chocolate branco e morango fresco no centro.',priceSingle: 3.5,category: 'esfihas-doces'},
  {id: 'e-40',name: '40 - Banana com Nutella',ingredients: 'fatias deliciosas de banana prata fresca cobertas com o legítimo creme de avelã Nutella.',priceSingle: 3.5,category: 'esfihas-doces'},
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
  {id: 'p-1',name: '1 - Alho e Óleo',ingredients: 'Molho de tomate, mozzarella farta, alho crocante frito e fio de azeite.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/1-alhoeoleo.png'},
  {id: 'p-2',name: '2 - Atum',ingredients: 'Molho de tomate caseiro, mozzarella farta, atum premium e cebola fatiada.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/2-atum.png'},
  {id: 'p-3',name: '3 - Bacon',ingredients: 'Molho de tomate caseiro, mozzarella farta e fatias de bacon crocante.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/3-bacon.png'},
  {id: 'p-4',name: '4 - Baiana',ingredients: 'Molho de tomate, mozzarella farta, calabresa moída, pimenta, ovo picado e cebola fatiada.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/4-baiana.png'},
  {id: 'p-5',name: '5 - Brasileira',ingredients: 'Molho de tomate, mozzarella farta, fiambre fatiado, bacon crocante e catupiry cremoso.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/5-brasileira.png'},
  {id: 'p-6',name: '6 - Calabresa',ingredients: 'Molho de tomate caseiro, mozzarella farta e rodelas de calabresa defumada.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/6-calabresa.png'},
  {id: 'p-7',name: '7 - Calabresa Acebolada',ingredients: 'Molho de tomate, mozzarella farta, calabresa defumada fatiada e abundante cebola.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'},
  {id: 'p-8',name: '8 - Calapiry',ingredients: 'Molho de tomate, mozzarella farta, calabresa defumada fatiada e requeijão catupiry de qualidade.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'},
  {id: 'p-9',name: '9 - Camorra',ingredients: 'Molho de tomate, mozzarella farta, calabresa defumada, fatias de bacon e catupiry.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/9-camorra-1.png'},
  {id: 'p-10',name: '10 - Carijó',ingredients: 'Molho de tomate, mozzarella farta, frango suculento desfiado e milho doce gratinado.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'},
  {id: 'p-11',name: '11 - Chambacon',ingredients: 'Molho de tomate, mozzarella farta, cogumelos frescos fatiados e pedaços de bacon.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/11-chambacon.png'},
  {id: 'p-12',name: '12 - Champignon',ingredients: 'Molho de tomate, mozzarella farta, cogumelos champignons fatiados e catupiry.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'},
  {id: 'p-13',name: '13 - Cosa Nostra',ingredients: 'Molho de tomate, mozzarella, lombo canadense (paio), frango desfiado, cogumelos e catupiry.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'},
  {id: 'p-14',name: '14 - Crocante',ingredients: 'Molho de tomate, mozzarella, bacon dourado, milho doce e acabamento com batata palha crocante.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'},
  {id: 'p-15',name: '15 - 4 Queijos',ingredients: 'Molho de tomate caseiro, mozzarella farta, parmesão ralado, queijo provolone e catupiry.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/15-4queijos.png'},
  {id: 'p-16',name: '16 - Da Casa',ingredients: 'Molho de tomate, mozzarella, calabresa, tomate picado fresco, ervilhas finas, ovo picado e cebola.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/16-dacasa.png'},
  {id: 'p-17',name: '17 - Espanhola',ingredients: 'Molho de tomate, mozzarella farta, lombo fatiado (paio), frango, ovo cozido picado e pimento colorido.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'},
  {id: 'p-18',name: '18 - Fiambre e Queijo',ingredients: 'Molho de tomate caseiro, cobertura farta de queijo mozzarella e fiambre cozido fatiado.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'},
  {id: 'p-19',name: '19 - Frango com Catupiry',ingredients: 'Molho de tomate caseiro, mozzarella, frango desfiado temperado e catupiry cremoso legítimo.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/19-frangocomcatupiry.png'},
  {id: 'p-20',name: '20 - Frampalha',ingredients: 'Molho de tomate, mozzarella, peito de frango temperado desfiado e cobertura de batata palha crocante.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'},
  {id: 'p-21',name: '21 - Milho',ingredients: 'Molho de tomate caseiro, mozzarella farta e grãos de milho doce.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'},
  {id: 'p-22',name: '22 - Milho com Bacon',ingredients: 'Molho de tomate caseiro, mozzarella farta, bacon crocante defumado e milho doce gratinado.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/22-milhocombacon.png'},
  {id: 'p-23',name: '23 - Mozzarella',ingredients: 'Molho de tomate caseiro e deliciosa cobertura dupla de queijo mozzarella.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'},
  {id: 'p-24',name: '24 - Portuguesa',ingredients: 'Molho de tomate caseiro, mozzarella, fiambre fatiado, ovos cozidos picados e cebola fatiada.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/24-portuguesa.png'},
  {id: 'p-25',name: '25 - Tradicional',ingredients: 'Molho de tomate, mozzarella farta, fiambre fatiado e fatias de tomate fresco.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/25-tradicional.png'},
  {id: 'p-26',name: '26 - Margherita',ingredients: 'Molho de tomate, mozzarella farta, fatias de tomate e manjericão fresco aromático.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'vegetarianas', imageUrl: '/26-margherita.png'},
  {id: 'p-27',name: '27 - Napolitana',ingredients: 'Molho de tomate, mozzarella farta, rodelas de tomate fresco e queijo parmesão ralado gratinado.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'vegetarianas'},
  {id: 'p-28',name: '28 - Alho Poró - Francês',ingredients: 'Molho de tomate, mozzarella, lombo fatiado (paio), alho poró (francês) salteado e catupiry.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais', imageUrl: '/28-alhoporofrances.png'},
  {id: 'p-29',name: '29 - Brócolis com Bacon',ingredients: 'Molho de tomate, mozzarella, buquês de brócolis frescos cozidos e generosos pedaços de bacon.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais'},
  {id: 'p-30',name: '30 - Carbonara',ingredients: 'Molho de tomate, mozzarella farta, fatias de bacon salteado e catupiry legítimo cremoso.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais'},
  {id: 'p-31',name: '31 - Lombo - Paio',ingredients: 'Molho de tomate caseiro, mozzarella farta, lombo fatiado (paio) e catupiry.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais'},
  {id: 'p-32',name: '32 - Mafiosa',ingredients: 'Molho de tomate, mozzarella farta, lombo fatiado (paio), fatias de bacon e catupiry cremoso.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais'},
  {id: 'p-33',name: '33 - Peperoni',ingredients: 'Molho de tomate clássico, mozzarella farta e rodelas de peperoni picante selecionado.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais'},
  {id: 'p-34',name: '34 - Portuguesa Paulista',ingredients: 'Molho de tomate, mozzarella, fiambre, bacon, ovo, atum premium, ervilha e cebola fatiada.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais'},
  {id: 'p-35',name: '35 - Rúcula c/ Tomate Seco',ingredients: 'Molho de tomate, mozzarella farta, folhas de rúcula selvagem fresca e tomates secos selecionados.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais'},
  {id: 'p-36',name: '36 - Estrogonofe de Frango',ingredients: 'Molho de tomate, mozzarella farta, cubos de peito de frango ao molho estrogonofe culinário, cogumelos e batata palha por cima.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais'},
  {id: 'p-37',name: '37 - Estrogonofe de Carne',ingredients: 'Molho de tomate, mozzarella farta, pedaços de carne bovina tenra ao molho estrogonofe artesanal, cogumelos e batata palha.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais', imageUrl: '/37-estrogonofedecarne.png'},
  {id: 'p-38',name: '38 - Siciliana',ingredients: 'Molho de tomate, mozzarella farta, cogumelos champignons, bacon defumado crocante e ovos picados.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais'},
  {id: 'p-39',name: '39 - 41 Menu\'s',ingredients: 'A pizza mais completa! Molho de tomate, mozzarella farta, frango suculento, calabresa defumada, milho, fatias de bacon e catupiry original.',priceP: 18.9,priceM: 20.9,priceG: 23.9,category: 'gourmet', imageUrl: '/39-41menus.png'},
  {id: 'p-40',name: '40 - Iscas de Carne',ingredients: 'Molho de tomate, mozzarella farta, folhas de rúcula fresca, iscas de alcatra salteadas, tomate fresco picadinho e catupiry.',priceP: 18.9,priceM: 20.9,priceG: 23.9,category: 'gourmet', imageUrl: '/40-iscasdecarne.png'},
  {id: 'p-41',name: '41 - Estrogonofe de Frango Inverso',ingredients: 'Molho de tomate, estrogonofe de frango gourmet, cogumelos, batata palha bem crocante e queijo mozzarella fatiado gratinado por cima.',priceP: 18.9,priceM: 20.9,priceG: 23.9,category: 'gourmet', imageUrl: '/41-estrogonofedefrangoinverso.png'},
  {id: 'p-42',name: '42 - Estrogonofe de Carne Inverso',ingredients: 'Molho de tomate, estrogonofe de carne bovina, cogumelos champignons, batata palha crocante e cobertura generosa de mozzarella gratinada.',priceP: 18.9,priceM: 20.9,priceG: 23.9,category: 'gourmet', imageUrl: '/42-estrogonofe decarneinverso.png'},
  {id: 'p-43',name: '43 - 2970',ingredients: 'Molho de tomate, mozzarella, tiras de alcatra tenra aceboladas no forno, bacon fatiado, cogumelos, azeitonas fatiadas e catupiry legítimo.',priceP: 18.9,priceM: 20.9,priceG: 23.9,category: 'gourmet', imageUrl: '/43-2970.png'},
  {id: 'p-44',name: '44 - 2925',ingredients: 'Molho de tomate, iscas de alcatra refinadas, tomate picado fresco, queijo catupiry e acabamento com mozzarella fatiada gratinada no forno de pedra.',priceP: 18.9,priceM: 20.9,priceG: 23.9,category: 'gourmet'},
  {id: 'p-45',name: '45 - 5 Queijos',ingredients: 'Molho de tomate saboroso, mozzarella farta, queijo parmesão, provolone curado, gorgonzola importado e requeijão catupiry cremoso.',priceP: 18.9,priceM: 20.9,priceG: 23.9,category: 'gourmet'},
  {id: 'p-46',name: '46 - Banana com Canela',ingredients: 'Base suave de mozzarella, rodelas doces de banana prata, açúcar polvilhado e aroma de canela assada.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-47',name: '47 - Chocolate Branco',ingredients: 'Deliciosa cobertura de chocolate branco derretido sobre fina camada de queijo mozzarella.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-48',name: '48 - Chocolate Preto',ingredients: 'Massa assada com mozzarella cremosa e calda farta de chocolate preto nobre.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-49',name: '49 - Nutella',ingredients: 'Camada irresistível do genuíno creme de chocolate e avelãs Nutella sobre base doce de mozzarella.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-50',name: '50 - MM\'s',ingredients: 'Base cremosa de queijo mozzarella e Nutella abundante, salpicada com pastilhas coloridas e crocantes de chocolate MM\'s.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-51',name: '51 - Leite Ninho - Nido',ingredients: 'Nutella farta derretida combinada com uma fina camada polvilhada de leite em pó Leite Ninho (Nido) de excelente qualidade.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces', imageUrl: '/51-leiteninhonido.png'},
  {id: 'p-52',name: '52 - Oreo Chocolate Branco',ingredients: 'Combinação dos deuses:  chocolate branco derretido de primeira linha com pedaços do lendário biscoito Oreo crocante.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-53',name: '53 - Oreo Chocolate Preto',ingredients: 'Generosa cobertura de chocolate preto nobre finalizada com farelos crocantes do biscoito de chocolate Oreo.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-54',name: '54 - Prestígio',ingredients: 'Uma homenagem ao coco:  chocolate preto nobre derretido salpicado com coco ralado desidratado e perfumado.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-55',name: '55 - Sensação com Nutella',ingredients: 'Combinação perfeita:  base de Nutella rica e aveludada coberta com fatias frescas de morangos suculentos.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-56',name: '56 - Sensação com Chocolate Branco',ingredients: 'Base de chocolate branco macio derretido coberto com pedaços frescos de morango cultivado.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-57',name: '57 - Sensação com Chocolate Preto',ingredients: 'Chocolate preto nobre derretido decorado artisticamente com fatias de morangos maduros selecionados.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces', imageUrl: '/57-sensacaocomchocolatepreto.png'},
  {id: 'p-58',name: '58 - Surpresa de Uva Verde Chocolate Branco',ingredients: 'Chocolate branco derretido de alta qualidade recheado com uvas verdes frescas sem vide (sem caroço), cortadas ao meio.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-59',name: '59 - Surpresa de Uva Verde Chocolate Preto',ingredients: 'Chocolate preto suave com abundantes metades frescas de uva verde sem caroço, criando um equilíbrio azedinho incrível.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces'},
  {id: 'p-60',name: '60 - Triângulo Amoroso',ingredients: 'Arte doce:  metade chocolate preto, metade chocolate branco premium finalizada com morangos frescos no centro.',priceP: 14.99,priceM: 16.9,priceG: 19.9,category: 'doces', imageUrl: '/60-trianguloamoroso.png'}
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
  { id: 'md-1-pizza', name: 'Segunda-feira: 1 Pizza Grande + Grátis Coca 1L!', ingredients: 'Sabores da promoção: Calabresa, Calabresa acebolada, Da Casa, Calapiry, Crocante, Frampalha, Marguerita', priceSingle: 17.90, category: 'promocoes', dayOfWeek: 1, imageUrl: '/destaque-segunda-pizza.png'},
  { id: 'md-1-esfirra', name: 'Segunda-feira: 10 Esfirras e GANHE 2 ESFIRRAS DOCE.', ingredients: '(5 Esfirras de calabresa e 5 esfirras de queijo) GANHE 2 esfirras doces (chocolate ao leite e chocolate branco)', priceSingle: 14.99, category: 'promocoes', dayOfWeek: 1, imageUrl: '/destaque-segunda-esfirra.png'},
  // { id: 'md-2-pizza', name: 'Combo Terça – 2 Pizzas Médias', ingredients: 'Leve 2 Pizzas Médias com preço especial! Escolha entre os sabores: Da Casa, Frango com Catupiry, Carijó, Fiambre com Queijo, Milho e Tradicional. Promoção válida somente às terças-feiras.', priceSingle: 20.00, category: 'promocoes', dayOfWeek: 2, imageUrl: '/destaque-terca-pizza.png'},
  { id: 'md-2-esfirra', name: 'Combo Terça – 10 Esfirras + Coca!', ingredients: 'Leve 5 esfirras tradicionais + 5 esfirras doces e ainda ganhe Coca-Cola. O combo perfeito para compartilhar, válido somente às terças-feiras.', priceSingle: 20.00, category: 'promocoes', dayOfWeek: 2, imageUrl: '/destaque-terca-esfirra.png'},
  // { id: 'md-3-pizza', name: 'Quarta-feira: Promoção Pizza', ingredients: 'Pizza Promocional de Quarta-feira', priceSingle: 6.99, category: 'promocoes', dayOfWeek: 3, imageUrl: '/destaque-quarta-pizza.png'},
  // { id: 'md-3-esfirra', name: 'Quarta-feira: Promoção Esfirra', ingredients: 'Esfirra Promocional de Quarta-feira', priceSingle: 6.99, category: 'promocoes', dayOfWeek: 3, imageUrl: '/destaque-quarta-esfirra.png'},
  // { id: 'md-4-pizza', name: 'Quinta-feira: Promoção Pizza', ingredients: 'Pizza Promocional de Quinta-feira', priceSingle: 6.99, category: 'promocoes', dayOfWeek: 4, imageUrl: '/destaque-quinta-pizza.png'},
  // { id: 'md-4-esfirra', name: 'Quinta-feira: Promoção Esfirra', ingredients: 'Esfirra Promocional de Quinta-feira', priceSingle: 6.99, category: 'promocoes', dayOfWeek: 4, imageUrl: '/destaque-quinta-esfirra.png'},
  // { id: 'md-5-pizza', name: 'Sexta-feira: Promoção Pizza', ingredients: 'Pizza Promocional de Sexta-feira', priceSingle: 6.99, category: 'promocoes', dayOfWeek: 5, imageUrl: '/destaque-sexta-pizza.png'},
  // { id: 'md-5-esfirra', name: 'Sexta-feira: Promoção Esfirra', ingredients: 'Esfirra Promocional de Sexta-feira', priceSingle: 6.99, category: 'promocoes', dayOfWeek: 5, imageUrl: '/destaque-sexta-esfirra.png'},
  // { id: 'md-6-pizza', name: 'Sábado: Promoção Pizza', ingredients: 'Pizza Promocional de Sábado', priceSingle: 6.99, category: 'promocoes', dayOfWeek: 6, imageUrl: '/destaque-sabado-pizza.png'},
  // { id: 'md-6-esfirra', name: 'Sábado: Promoção Esfirra', ingredients: 'Esfirra Promocional de Sábado', priceSingle: 6.99, category: 'promocoes', dayOfWeek: 6, imageUrl: '/destaque-sabado-esfirra.png'}

  // --- DOBRO PIZZAS: BEBIDAS ---
  {id: 'b-1', name: 'Coca-Cola 350ml (Lata)', ingredients: 'Refrigerante Coca-Cola original lata 350ml gelada.', priceSingle: 6.00, category: 'bebidas', imageUrl: '/cocacolalata.png'},
  {id: 'b-2', name: 'Coca-Cola Zero 350ml (Lata)', ingredients: 'Refrigerante Coca-Cola zero açúcar lata 350ml gelada.', priceSingle: 6.00, category: 'bebidas', imageUrl: '/cocazerolata.png'},
  {id: 'b-3', name: 'Água Mineral com Gás', ingredients: 'Água mineral gaseificada fresca.', priceSingle: 4.50, category: 'bebidas', imageUrl: '/agua.png'},
  {id: 'b-4', name: 'Água Mineral sem Gás', ingredients: 'Água mineral natural fresca.', priceSingle: 4.00, category: 'bebidas', imageUrl: '/agua.png'},
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
//
