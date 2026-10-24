import React from 'react';
import RecipeManager from '../components/RecipeManager';
import { ALL_MENU_ITEMS } from '../data/menu';

export default function RecipeManagerPreview() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] p-4 sm:p-6 max-w-7xl mx-auto">
      <RecipeManager menuItems={ALL_MENU_ITEMS} />
    </div>
  );
}
