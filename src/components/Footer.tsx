
import React from 'react';
import { Instagram, ShieldCheck } from "lucide-react";


export default function Footer() {
  return (
    <footer className="bg-[#1b140e] text-[#e8d8d1] py-12 px-4 mt-8 lg:mt-12 border-t-4 border-[#083d07]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <div className="font-extrabold text-white text-2xl flex items-center gap-2 justify-center md:justify-start">
            <div className="w-9 h-9 bg-[#e8d8d1] rounded-full border border-[#d5af7a] flex items-center justify-center flex-shrink-0 p-1">
              <img
                src="/dobro/logo-dobro.png"
                alt="DOBRO Pizzas"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[#fdfbf7] font-sans">DOBRO <span className="text-[#d5af7a] font-light">Pizzas</span></span>
          </div>
          <p className="text-sm text-[#e4c5b9] mt-2">
            © 2026 DOBRO Pizzas · Fermentação Natural & Receitas Autorais
          </p>
          <div className="flex items-center gap-1.5 text-sm font-medium text-[#d5af7a] mt-2 justify-center md:justify-start">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cardápio Digital Oficial</span>
          </div>
          <a
            href="https://www.instagram.com/dobropizza/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#d5af7a] mt-2 hover:text-white transition-colors"
          >
            <Instagram className="w-5 h-5" />
            @dobropizza
          </a>
        </div>
        <div className="text-center">
          <p className="text-lg md:text-xl font-bold text-[#d5af7a] uppercase tracking-widest font-serif">
            O Dobro de Sabor • O Dobro de Afeto
          </p>
          <p className="text-xs text-[#e4c5b9] mt-1">Massa de fermentação lenta com farinhas selecionadas</p>
        </div>
        <div className="text-center md:text-right space-y-1.5 text-sm text-[#e8d8d1]">
          <p className="font-semibold text-white text-base">
            Forno Artesanal & Delivery Especial
          </p>
          <p className="text-xs text-[#d5af7a]">Ingredientes frescos e selecionados todos os dias</p>
          <p className="text-xs text-[#a89284] pt-1">
            Pedidos online pelo cardápio com confirmação ágil
          </p>
        </div>
      </div>
    </footer>
  );
}
