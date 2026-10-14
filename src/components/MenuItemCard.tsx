import React, { useState } from 'react';
import { Plus } from "lucide-react";
import { MenuItem } from "../types";
import { getLisbonDate } from "../utils/date";
import { findImageForProduct } from "../utils/imageResolver";
import { hapticLight } from "../utils/haptics";

interface MenuItemCardProps {
  item: MenuItem & { isMaisPedido?: boolean; groupOverride?: string };
  catId: string;
  failedImage: boolean;
  onImageError: () => void;
  onClick: () => void;
  onZoom: (src: string) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({

  item,
  catId,
  failedImage,
  onImageError,
  onClick,
  onZoom,
}) => {
  const isPizza = item.category === 'tradicionais' || item.category === 'premium' || item.category === 'mais-pedidos' || item.id.startsWith('p-');
  const priceVal = (item.priceSingle || item.priceM || item.priceG || item.priceP || 0);

  const priceDisplay = (
    <div className="flex items-center gap-1.5">
      <span className="font-extrabold text-[#083d07] text-[15px]">
        R$ {priceVal.toFixed(2).replace('.', ',')}
      </span>
      {isPizza && (
        <span className="text-[10px] font-bold text-[#745240] bg-[#e8d8d1]/70 px-1.5 py-0.5 rounded tracking-tight">
          28cm
        </span>
      )}
    </div>
  );

  const [imgAttempt, setImgAttempt] = React.useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const exts = ['.png', '.jpg', '.jpeg', '.webp'];

  const handleCardClick = () => {
    hapticLight();
    onClick();
  };

  let photoSrc = item.imageUrl ? item.imageUrl.replace(/^\//, '') : "";
  if (photoSrc === 'none') {
    photoSrc = "";
  } else if (!photoSrc) {
    const autoImage = findImageForProduct(item);
    if (autoImage) photoSrc = autoImage.replace(/^\//, '');
  }

  // If it's a dynamic path without http, let's allow it to try extensions
  const getDisplaySrc = () => {
    if (!photoSrc) return "";
    if (photoSrc.startsWith('http')) return imgAttempt > 0 ? '' : photoSrc;
    let base = photoSrc;

    // Remove extension if we are going to try others
    if (imgAttempt > 0) {
      base = base.replace(/\.(png|jpe?g|webp)$/i, '');
      return `/${base}${exts[imgAttempt - 1]}`;
    }
    return `/${base}`;
  };

  const currentSrc = getDisplaySrc();
  const hasPhoto = !!currentSrc && !failedImage;

  if (item.id.startsWith('promo-dia-da-pizza') || catId === 'promocoes') {
    return (
      <div
        onClick={handleCardClick}
        className="w-full h-full flex flex-col overflow-hidden rounded-xl cursor-pointer group shadow-sm hover:shadow-md transition-all duration-200 border border-[#e8d8d1] bg-white active:scale-[0.99]"
      >
        {hasPhoto && (
          <div className="w-full aspect-[4/5] overflow-hidden bg-[#fdfbf7] relative flex items-center justify-center">
            {!imgLoaded && !failedImage && (
              <div className="absolute inset-0 bg-[#e8d8d1]/50 animate-pulse" />
            )}
            <img
              src={currentSrc}
              alt={item.name}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-contain object-center transition-all duration-300 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} group-hover:scale-105`}
              onError={() => {
                if (imgAttempt < exts.length) {
                  setImgAttempt(prev => prev + 1);
                } else {
                  onImageError();
                }
              }}
            />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1">
          <h3 className={`font-bold ${catId === "mais-pedidos" ? "text-[14px]" : "text-[16px]"} text-[#44210f] mb-1 leading-tight`}>
            {item.name}
          </h3>
          <p className={`${catId === "mais-pedidos" ? "text-[11px]" : "text-[13px]"} text-[#745240] line-clamp-3 leading-relaxed mb-4`}>
            {item.ingredients}
          </p>
          <div className="mt-auto flex items-center justify-between">
            <span className="font-extrabold text-[#083d07] text-lg">
              R$ {(item.priceSingle || item.priceM || item.priceG || item.priceP || 0).toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[#083d07] font-bold text-sm hover:underline">
              Pedir Agora
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
      className={`${catId === "promocoes" ? "bg-[#f6e3df]/40 border-[#d5af7a]" : (catId === "menu-do-dia" && item.dayOfWeek === getLisbonDate().getDay() ? "bg-emerald-50/50 border-[#083d07]" : "bg-white border-[#e8d8d1]")} border rounded-xl p-3 sm:p-4 flex items-start justify-between gap-3 sm:gap-4 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all duration-200 group relative bg-white`}
    >
      {catId === "promocoes" && (
        <div className="absolute top-0 right-0 bg-[#083d07] text-[#fdfbf7] text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 sm:py-1 rounded-bl-lg uppercase tracking-wider z-10">
          Destaque
        </div>
      )}
      {catId === "menu-do-dia" && item.dayOfWeek === getLisbonDate().getDay() && (
        <div className="absolute top-0 right-0 bg-[#083d07] text-white text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 sm:py-1 rounded-bl-lg uppercase tracking-wider z-10 shadow-sm animate-pulse">
          🔥 HOJE
        </div>
      )}
      {(item.isBestseller || catId === "mais-pedidos" || item.category === "mais-pedidos") && (
        <div className="absolute top-0 right-0 bg-[#083d07] text-[#fdfbf7] text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 sm:py-1 rounded-bl-lg uppercase tracking-wider z-10 shadow-xs">
          🔥 Mais Vendida
        </div>
      )}
      <div className={`flex-1 flex flex-col justify-between h-full ${hasPhoto ? "min-h-[92px] sm:min-h-[112px]" : "min-h-[76px] sm:min-h-[88px]"}`}>
        <div>
          <h3
            className={`font-bold ${catId === "promocoes" ? "text-base sm:text-lg text-[#083d07]" : catId === "mais-pedidos" ? "text-xs sm:text-[13px] text-[#44210f]" : "text-sm sm:text-[15px] text-[#44210f]"} mb-0.5 sm:mb-1 break-words pr-1.5 leading-snug`}
          >
            {item.name}
          </h3>
          <p
            className={`${catId === "mais-pedidos" ? "text-[10.5px] sm:text-[11px]" : "text-[11.5px] sm:text-[13px]"} text-[#745240] line-clamp-2 leading-relaxed pr-1.5 mt-0.5`}
          >
            {item.ingredients}
          </p>
        </div>
        <div className="mt-2.5 sm:mt-4 flex justify-between items-center pr-1.5">
          {priceDisplay}
          <button 
            className="w-6 h-6 sm:w-7 sm:h-7 bg-[#E8D8D1] text-[#083D07] border border-[#d5af7a]/50 hover:bg-[#d5af7a] hover:text-[#083d07] rounded-full flex items-center justify-center transition-all shrink-0 shadow-2xs"
            title="Adicionar ao pedido"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
      {/* Foto do produto Estilo iFood Compacto com Shimmer */}
      {hasPhoto && (
        <div className="w-[92px] h-[92px] sm:w-[112px] sm:h-[112px] shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-gray-200 shadow-2xs relative flex items-center justify-center">
          {!imgLoaded && !failedImage && (
            <div className="absolute inset-0 bg-stone-200 animate-pulse" />
          )}
          <img
            src={currentSrc}
            alt={item.name}
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-300 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} group-hover:scale-105`}
            onError={() => {
              if (imgAttempt < exts.length) {
                setImgAttempt(prev => prev + 1);
              } else {
                onImageError();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

export default MenuItemCard;
