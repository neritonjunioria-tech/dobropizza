import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yexlnjznkxthffklovql.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export const handler: Handler = async (event, context) => {
  try {
    // Busca todos os itens, exceto as configurações do sistema
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('*')
      .neq('category', 'system_config')
      .neq('category', 'system_config_promo');

    if (error) {
      console.error('Erro ao buscar cardápio do Supabase:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Erro ao buscar cardápio' })
      };
    }

    // Formatar como CSV para a inteligência artificial ler com facilidade
    let csv = "categoria,item,tamanho,Preço,ingredientes,disponivel\n";

    for (const item of menuItems || []) {
      // Remover quebras de linha e aspas duplas dos ingredientes para não quebrar o CSV
      const ingredientesFormatados = (item.ingredients || '').replace(/\n/g, ' ').replace(/"/g, '""');
      const nomeFormatado = (item.name || '').replace(/"/g, '""');
      
      // Categorias podem definir se é P/M/G ou único
      const cat = item.category || 'outro';
      const disponivel = item.is_bestseller === false ? 'Não' : 'Sim'; // Usando is_bestseller como disponível temporário ou ignora

      if (item.price_single) {
        const preco = `R$ ${item.price_single.toFixed(2).replace('.', ',')}`;
        csv += `"${cat}","${nomeFormatado}","-","${preco}","${ingredientesFormatados}","Sim"\n`;
      } else {
        if (item.price_p) {
          const preco = `R$ ${item.price_p.toFixed(2).replace('.', ',')}`;
          csv += `"${cat}","${nomeFormatado}","P","${preco}","${ingredientesFormatados}","Sim"\n`;
        }
        if (item.price_m) {
          const preco = `R$ ${item.price_m.toFixed(2).replace('.', ',')}`;
          csv += `"${cat}","${nomeFormatado}","M","${preco}","${ingredientesFormatados}","Sim"\n`;
        }
        if (item.price_g) {
          const preco = `R$ ${item.price_g.toFixed(2).replace('.', ',')}`;
          csv += `"${cat}","${nomeFormatado}","G","${preco}","${ingredientesFormatados}","Sim"\n`;
        }
      }
    }

    // Retorna CSV puro para o N8N consumir perfeitamente como tabela
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: csv
    };
  } catch (error) {
    console.error('Erro na função agent-menu:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno no servidor' })
    };
  }
};
