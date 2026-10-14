import React, { useState, useEffect } from 'react';
import { Review } from '../types';
import { Star } from 'lucide-react';

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  // Initial Seed Reviews - All 100% 5-star ratings for the base branding
  const seedReviews: Review[] = [
    {
      id: 'rev-1',
      author: 'Tiago Silva',
      rating: 5,
      comment: 'As pizzas mais recheadas de Sesimbra, sem dúvida! A de Alho Francês é soberba e a massa é super macia. Chegou super rápida e ainda quentinha. Atendimento excelente no WhatsApp!',
      date: '2026-06-05',
      approved: true
    },
    {
      id: 'rev-2',
      author: 'Maria Henriques',
      rating: 5,
      comment: 'A Pizza de Batata Frita com Bacon é gigantesca e muito saborosa. Pedimos no fim de semana para a família e sobrou para o pequeno-almoço. Esfiha doce de Nutella com morango é dos deuses.',
      date: '2026-06-03',
      approved: true
    },
    {
      id: 'rev-3',
      author: 'Ricardo Santos',
      rating: 5,
      comment: 'Excelente relação qualidade-preço em Portugal! A pizza Grande é mesmo enorme e o facto de poder pedir meio-a-meio é fenomenal. E podermos Ganhar a entrega acima de R$35 cumpre o prometido.',
      date: '2026-05-28',
      approved: true
    }
  ];

  useEffect(() => {
    // Keep it synchronized with 5-star reviews
    setReviews(seedReviews);
  }, []);

  const averageRating = '5.0';

  return (
    <section id="reviews" className="py-16 bg-[#0B0B0E] border-t border-[#222432]/60 scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 space-y-10">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#E67E22] font-semibold block">
              Opinião dos Clientes
            </span>
            <h3 className="font-serif text-3xl lg:text-4xl text-[#F5F5F0] tracking-tight text-white font-bold animate-fade-in">
              O Que Dizem Nossos Clientes?
            </h3>
            <p className="text-xs text-zinc-300 font-sans max-w-lg leading-relaxed">
              Transparência total: recolhemos e publicamos depoimentos reais sobre as nossas pizzas e atendimento.
            </p>
          </div>

          {/* Social score badge */}
          <div className="flex items-center gap-4 bg-[#16171E] border border-[#222432]/80 p-3 px-5 rounded-2xl shrink-0">
            <div className="text-center">
              <span className="block text-3xl font-serif text-[#E67E22] leading-none font-bold">
                {averageRating}
              </span>
              <span className="text-[9px] text-zinc-400 font-sans tracking-wider uppercase block mt-1 font-bold">nota média</span>
            </div>
            <div className="h-10 w-px bg-[#222432]" />
            <div className="space-y-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 text-brand-orange fill-brand-orange" />
                ))}
              </div>
              <span className="block text-[10px] text-zinc-305 font-sans font-semibold">
                com base em {reviews.length} avaliações
              </span>
            </div>
          </div>
        </div>

        {/* Testimonials List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reviews.slice(0, 6).map((rev) => (
            <div key={rev.id} className="bg-[#16171E] border border-[#222432]/70 hover:border-amber-500/45 hover:bg-[#1E202B] transition-all duration-300 p-5 rounded-2xl shadow-lg flex flex-col justify-between">
              <div className="space-y-3">
                {/* Score and date */}
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 font-semibold">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <Star 
                        key={num} 
                        className={`w-2.5 h-2.5 ${
                          num <= rev.rating ? 'text-brand-orange fill-brand-orange' : 'text-[#222432]'
                        }`} 
                      />
                    ))}
                  </div>
                  <span>{rev.date}</span>
                </div>
                {/* Comment body */}
                <p className="text-zinc-200 text-xs leading-relaxed italic font-sans text-left">
                  &quot;{rev.comment}&quot;
                </p>
              </div>

              {/* Author Info */}
              <div className="pt-3 border-t border-[#222432]/60 flex items-center gap-2.5 mt-4">
                <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-sans font-bold text-[10px] flex items-center justify-center">
                  {rev.author.charAt(0).toUpperCase()}
                </div>
                <div className="leading-none text-left">
                  <span className="font-sans font-bold text-xs text-white block">
                    {rev.author}
                  </span>
                  <span className="text-[9px] text-[#A1A1AA] font-sans tracking-wide">Cliente Verificado</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
