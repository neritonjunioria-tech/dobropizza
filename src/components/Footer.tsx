import React from 'react';
import { Instagram, MapPin, Clock, ExternalLink, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#141b14] text-[#e8d8d1] border-t border-[#233124] pt-12 pb-28 lg:pb-8 px-4 mt-12">
      <div className="max-w-7xl mx-auto">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#233124]">
          {/* Coluna 1: Marca & Conceito */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/dobro/logo-dobro-circulo.png"
                alt="DOBRO Pizzas"
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <span className="font-semibold text-lg text-white tracking-tight font-sans">
                DOBRO <span className="text-[#d5af7a] font-normal">Pizzas</span>
              </span>
            </div>
            <p className="text-xs text-[#a89284] leading-relaxed pr-2">
              Forno 420°C. Longa fermentação.
            </p>
          </div>

          {/* Coluna 2: Localização */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d5af7a]">
              Localização
            </h4>
            <div className="flex items-start gap-2 text-xs text-[#c4b5aa] leading-relaxed">
              <MapPin className="w-3.5 h-3.5 text-[#d5af7a] shrink-0 mt-0.5" />
              <span>
                Rua Quirino Zagonel - São José dos Pinhais
              </span>
            </div>
            <p className="text-[11px] text-[#8a7569]">
              Atendimento exclusivo para Delivery
            </p>
          </div>

          {/* Coluna 3: Horários Oficiais */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d5af7a]">
              Horário de Funcionamento
            </h4>
            <div className="flex items-start gap-2 text-xs text-[#c4b5aa] leading-relaxed">
              <Clock className="w-3.5 h-3.5 text-[#d5af7a] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p><span className="text-white font-medium">Qua e Qui:</span> 18:30 às 23:00</p>
                <p><span className="text-white font-medium">Sex e Sáb:</span> 18:30 às 00:00</p>
                <p className="text-[11px] text-[#8a7569] pt-0.5">Dom, Seg e Ter: Fechado</p>
              </div>
            </div>
          </div>

          {/* Coluna 4: Contato & Redes */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d5af7a]">
              Redes & Contato
            </h4>
            <div className="space-y-2">
              <a
                href="https://wa.me/5541995984072"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-[#c4b5aa] hover:text-white transition-colors group"
              >
                <Phone className="w-3.5 h-3.5 text-[#25D366] group-hover:scale-110 transition-transform" />
                <span className="font-medium text-white/90">(41) 99598-4072</span>
                <span className="text-[10px] text-[#25D366] bg-[#25D366]/10 px-1.5 py-0.5 rounded font-mono">WhatsApp</span>
              </a>
              <div>
                <a
                  href="https://www.instagram.com/dobropizzas/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-[#c4b5aa] hover:text-white transition-colors group"
                >
                  <Instagram className="w-3.5 h-3.5 text-[#d5af7a] group-hover:scale-110 transition-transform" />
                  <span>@dobropizzas</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
                </a>
              </div>
            </div>
            <p className="text-[11px] text-[#8a7569] leading-relaxed">
              Cardápio digital oficial com pedidos diretos e confirmação instantânea via WhatsApp.
            </p>
          </div>
        </div>

        {/* Linha Inferior Minimalista */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#8a7569]">
          <p>© {new Date().getFullYear()} DOBRO Pizzas. Todos os direitos reservados.</p>
          <p className="tracking-wide">
            São José dos Pinhais · Paraná
          </p>
        </div>
      </div>
    </footer>
  );
}
