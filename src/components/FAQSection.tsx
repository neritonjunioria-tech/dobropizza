import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First one open by default

  const faqItems: FAQItem[] = [
    {
      question: 'Como funciona o pedido de dois sabores (meio-a-meio) nas pizzas?',
      answer: 'O recheio meio-a-meio está disponível exclusivamente no tamanho Grande. No nosso configurador digital, ao escolher uma pizza Grande, ative a opção "Adicionar 2º Sabor (Opcional)" para escolher o segundo sabor. O preço cobrado será calculado pelo sabor com maior valor das duas coberturas escolhidas.'
    },
    {
      question: 'Quais são as áreas de entrega e as taxas correspondentes?',
      answer: 'ZONAS COM ENTREGA GRÁTIS:\nCotovia, Quintinha, Quintola de Santana, Santana, Maçã, Faúlha, Sampaio, Corredora, Almoinha, Alto das Vinhas, Carrasqueira\n\nZONAS COM R$2,00:\nVila de Sesimbra, Zambujal\n\nZONAS COM R$4,00:\nCaixas, Alfarim, Aiana\n\nZONAS COM R$5,00:\nMeco, Azeitão, Aldeia da Piedade, Aldeia de Irmãos, Oleiros, Várzeas, Vila Nogueira, Moinho da Torre, Casal Bolinhos\n\nZONAS COM R$6,00:\nLagoa da Albufeira\n\nCONDIÇÃO ESPECIAL:\nAcima de R$35,00 de subtotal → entrega grátis em qualquer zona\n\nZONA NÃO ATENDIDA:\nSe a sua zona não estiver listada, lamento, mas ainda não fazemos entregas nessa zona. Pode levantar aqui no DOBRO Pizzas em Sesimbra.'
    },
    {
      question: 'Qual é o valor mínimo para entrega e como Ganhar a Entrega?',
      answer: 'O valor mínimo de um pedido para podermos enviar um estafeta é de R$ 10,00. E para pedidos com subtotal acima de R$ 35,00, Ganha a entrega!'
    },
    {
      question: 'Quais são os métodos de pagamento aceites?',
      answer: 'Aceitamos pagamentos via MB Way e Numerário (Dinheiro).'
    },
    {
      question: 'Qual o compromisso com a qualidade dos ingredientes e finalização?',
      answer: 'Nossas pizzas são confeccionadas artesanalmente com massa de fermentação lenta e molho de tomate fresco. Todas as pizzas salgadas são devidamente finalizadas com óregano perfumado (orégaos secos de grande frescor) e azeitonas inteiras suculentas selecionadas.'
    }
  ];

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 bg-[#0B0B0E] border-t border-[#222432]/60 scroll-mt-20">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        
        {/* Header Block */}
        <div className="text-center space-y-2 max-w-lg mx-auto">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#E67E22] font-semibold block">
            Dúvidas Frequentes
          </span>
          <h3 className="font-serif text-3xl text-white tracking-tight font-extrabold">
            Perguntas &amp; Respostas de Suporte
          </h3>
          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Esclareça instantaneamente dúvidas sobre o seu pedido, entregas rápidas ao domicílio, pagamentos e taxas.
          </p>
        </div>

        {/* Accordions */}
        <div className="space-y-3.5 pt-4">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className="bg-[#16171E] border border-[#222432]/75 rounded-xl overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleIndex(index)}
                  className="w-full p-4 flex items-center justify-between text-left focus:outline-none transition-colors hover:bg-[#1E202B]"
                >
                  <span className="font-sans font-extrabold text-sm text-[#F5F5F0] pr-4 leading-snug">
                    {item.question}
                  </span>
                  <span className="shrink-0 p-1.5 rounded-lg bg-[#0B0B0E] border border-[#222432] text-amber-500">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>
                
                {isOpen && (
                  <div className="px-4 pb-4.5 pt-3.5 text-zinc-300 text-[13px] leading-relaxed font-sans border-t border-[#222432]/50 animate-fade-in text-left">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
