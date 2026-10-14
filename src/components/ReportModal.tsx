import React from 'react';
import { X } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getItemNameTextForPrint, formatItemNameForPrint } from '../utils/printHelpers';

interface ReportModalProps {
  isOpen: boolean;
  type: string;
  title: string;
  onClose: () => void;
  filteredOrders: any[];
  dashboardData: any;
}

const safeGetDate = (dStr: any): Date | null => {
  if (!dStr) return null;
  try {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const safeParseItems = (items: any): any[] => {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  type,
  title,
  onClose,
  filteredOrders = [],
  dashboardData,
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let reportOrders = filteredOrders;
  if (type === 'cancelamentos') {
    reportOrders = reportOrders.filter((o: any) => o.status === 'Cancelado');
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl border border-stone-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-stone-200 flex justify-between items-center bg-stone-50/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <h3 className="font-bold text-base text-stone-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white border border-stone-200 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto">
          {(() => {
            // ────────────── RELATÓRIO: FLUXO DE CAIXA ──────────────
            if (type === 'fluxo_caixa') {
              const cashData = dashboardData?.chartData?.cashFlowData || [];
              const totEntradas = cashData.reduce((acc: number, c: any) => acc + (Number(c.revenue) || 0), 0);
              const totSaidas = cashData.reduce((acc: number, c: any) => acc + (Number(c.expenses) || 0), 0);
              const lucroTotal = totEntradas - totSaidas;
              const margemTotal = totEntradas > 0 ? (lucroTotal / totEntradas) * 100 : 0;

              return (
                <div className="space-y-5">
                  {/* Indicadores do Período */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">Entradas (Vendas)</span>
                      <span className="text-lg font-black font-mono text-emerald-700">R$ {totEntradas.toFixed(2)}</span>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                      <span className="text-[10px] font-mono font-bold text-rose-800 uppercase tracking-wider block mb-0.5">Saídas (Despesas)</span>
                      <span className="text-lg font-black font-mono text-rose-700">R$ {totSaidas.toFixed(2)}</span>
                    </div>
                    <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl text-white">
                      <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider block mb-0.5">Lucro Líquido</span>
                      <span className={`text-lg font-black font-mono ${lucroTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>R$ {lucroTotal.toFixed(2)}</span>
                    </div>
                    <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl">
                      <span className="text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider block mb-0.5">Margem Líquida</span>
                      <span className="text-lg font-black font-mono text-stone-900">{margemTotal.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Gráfico de Barras: Entradas vs Saídas */}
                  {cashData.length > 0 && (
                    <div className="bg-white p-4 border border-stone-200 rounded-xl shadow-xs">
                      <h4 className="text-xs font-mono font-bold text-stone-700 uppercase tracking-wider mb-3">Gráfico Comparativo: Entradas vs Saídas</h4>
                      <div className="h-[230px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={cashData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="date" tick={{fontSize: 11, fill: '#6B7280', fontFamily: 'monospace'}} tickMargin={8} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={(val) => `R$ ${val}`} tick={{fontSize: 11, fill: '#6B7280', fontFamily: 'monospace'}} axisLine={false} tickLine={false} />
                            <Tooltip 
                              formatter={(value: any) => [`R$ ${Number(value || 0).toFixed(2)}`, '']}
                              contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'monospace' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                            <Bar dataKey="revenue" name="Entradas (R$ Faturamento)" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                            <Bar dataKey="expenses" name="Saídas (R$ Despesas)" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Tabela Analítica Dia-a-Dia */}
                  <div className="overflow-x-auto border border-stone-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-stone-50 text-stone-600 font-mono uppercase border-b border-stone-200">
                        <tr>
                          <th className="px-3.5 py-2.5 font-bold">Data</th>
                          <th className="px-3.5 py-2.5 font-bold text-center">Pedidos</th>
                          <th className="px-3.5 py-2.5 font-bold text-right text-emerald-700">Entradas</th>
                          <th className="px-3.5 py-2.5 font-bold text-right text-rose-700">Saídas</th>
                          <th className="px-3.5 py-2.5 font-bold text-right text-stone-900">Lucro Líquido</th>
                          <th className="px-3.5 py-2.5 font-bold text-right text-stone-700">Margem (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono">
                        {cashData.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-500">Nenhum registro financeiro encontrado para este período.</td></tr>
                        ) : cashData.map((day: any) => (
                          <tr key={day.date} className="hover:bg-stone-50 transition-colors">
                            <td className="px-3.5 py-2.5 font-bold text-stone-900">{day.date}</td>
                            <td className="px-3.5 py-2.5 text-center text-stone-600">{day.orders}</td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-emerald-600">R$ {Number(day.revenue || 0).toFixed(2)}</td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-rose-600">R$ {Number(day.expenses || 0).toFixed(2)}</td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-stone-900">R$ {Number(day.profit || 0).toFixed(2)}</td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-stone-600">{Number(day.margin || 0).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                      {cashData.length > 0 && (
                        <tfoot className="bg-stone-100 border-t border-stone-200 font-mono font-bold text-stone-900">
                          <tr>
                            <td className="px-3.5 py-2.5 uppercase">Total Geral</td>
                            <td className="px-3.5 py-2.5 text-center">{cashData.reduce((acc: number, c: any) => acc + (c.orders || 0), 0)}</td>
                            <td className="px-3.5 py-2.5 text-right text-emerald-700">R$ {totEntradas.toFixed(2)}</td>
                            <td className="px-3.5 py-2.5 text-right text-rose-700">R$ {totSaidas.toFixed(2)}</td>
                            <td className="px-3.5 py-2.5 text-right text-stone-900">R$ {lucroTotal.toFixed(2)}</td>
                            <td className="px-3.5 py-2.5 text-right">{margemTotal.toFixed(1)}%</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              );
            }

            // ────────────── RELATÓRIO: FATURAMENTO GERAL POR DIA / VENDAS NO PERÍODO ──────────────
            if (type === 'faturamento' || type === 'vendas_mes') {
              const dailyMap = new Map<string, { revenue: number, count: number }>();
              reportOrders.forEach(o => {
                const d = safeGetDate(o.createdAt);
                if (!d) return;
                const dKey = d.toLocaleDateString('pt-BR');
                if (!dailyMap.has(dKey)) dailyMap.set(dKey, { revenue: 0, count: 0 });
                const cur = dailyMap.get(dKey)!;
                cur.revenue += Number(o.totalAmount) || 0;
                cur.count += 1;
              });
              const dailyList = Array.from(dailyMap.entries()).sort((a,b) => {
                const pA = a[0].split('/').map(Number);
                const pB = b[0].split('/').map(Number);
                return new Date(pB[2], pB[1]-1, pB[0]).getTime() - new Date(pA[2], pA[1]-1, pA[0]).getTime();
              });

              return (
                <div className="space-y-5">
                  <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-3.5 rounded-xl">
                    <div>
                      <span className="text-[10.5px] font-mono font-bold text-blue-900 uppercase">Faturamento Total do Período</span>
                      <p className="text-xl font-black font-mono text-blue-700">R$ {reportOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0).toFixed(2)}</p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">{reportOrders.length} pedidos</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono font-bold text-stone-700 uppercase tracking-wider mb-2">Faturamento por Dia</h4>
                    <div className="overflow-x-auto border border-stone-200 rounded-xl mb-4">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-stone-50 text-stone-600 font-mono uppercase border-b border-stone-200">
                          <tr>
                            <th className="px-3.5 py-2.5 font-bold">Data</th>
                            <th className="px-3.5 py-2.5 font-bold text-center">Nº de Pedidos</th>
                            <th className="px-3.5 py-2.5 font-bold text-right text-stone-700">Ticket Médio</th>
                            <th className="px-3.5 py-2.5 font-bold text-right text-emerald-700">Total Faturado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 font-mono">
                          {dailyList.map(([date, item]) => (
                            <tr key={date} className="hover:bg-stone-50">
                              <td className="px-3.5 py-2 font-bold text-stone-900">{date}</td>
                              <td className="px-3.5 py-2 text-center text-stone-600">{item.count}</td>
                              <td className="px-3.5 py-2 text-right font-bold text-stone-700">R$ {(item.revenue / (item.count || 1)).toFixed(2)}</td>
                              <td className="px-3.5 py-2 text-right font-bold text-emerald-600">R$ {item.revenue.toFixed(2)}</td>
                            </tr>
                          ))}
                          {dailyList.length === 0 && (
                            <tr><td colSpan={4} className="py-6 text-center text-stone-500 font-mono">Nenhum registro para este período</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono font-bold text-stone-700 uppercase tracking-wider mb-2">Lista de Pedidos ({reportOrders.length})</h4>
                    <div className="overflow-x-auto border border-stone-200 rounded-xl max-h-[300px]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-stone-50 border-b border-stone-200 font-mono sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3 font-bold text-stone-700">ID</th>
                            <th className="py-2.5 px-3 font-bold text-stone-700">Data/Hora</th>
                            <th className="py-2.5 px-3 font-bold text-stone-700">Cliente</th>
                            <th className="py-2.5 px-3 font-bold text-stone-700">Tipo</th>
                            <th className="py-2.5 px-3 font-bold text-stone-700 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 font-mono">
                          {reportOrders.map((o: any) => (
                            <tr key={o.id} className="hover:bg-stone-50">
                              <td className="py-2 px-3 font-bold">#{o.id}</td>
                              <td className="py-2 px-3 text-stone-500">{new Date(o.createdAt).toLocaleString('pt-BR')}</td>
                              <td className="py-2 px-3 text-stone-700">{o.customerName || 'Cliente Balcão'}</td>
                              <td className="py-2 px-3 uppercase text-[10px] text-stone-600">{o.orderType || 'balcao'}</td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-600">R$ {Number(o.totalAmount || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                          {reportOrders.length === 0 && (
                            <tr><td colSpan={5} className="py-6 text-center text-stone-500 font-mono">Nenhum pedido encontrado</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            }

            // ────────────── RELATÓRIO: CÁLCULO DO TICKET MÉDIO ──────────────
            if (type === 'ticket_medio') {
              const totalFaturado = reportOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
              const totalQtd = reportOrders.length;
              const ticketGeral = totalQtd > 0 ? totalFaturado / totalQtd : 0;

              // Breakdown por tipo
              const typesMap: Record<string, { rev: number, count: number }> = {};
              reportOrders.forEach(o => {
                const t = o.orderType || 'balcao';
                if (!typesMap[t]) typesMap[t] = { rev: 0, count: 0 };
                typesMap[t].rev += (Number(o.totalAmount) || 0);
                typesMap[t].count += 1;
              });

              return (
                <div className="space-y-5">
                  {/* Caixa Didática de Cálculo */}
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                    <h4 className="text-xs font-mono font-bold text-amber-900 uppercase tracking-wider mb-2">Fórmula do Ticket Médio</h4>
                    <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200">
                        <span className="text-[9.5px] text-amber-700 uppercase block font-bold">Faturamento Total</span>
                        <span className="text-base font-black text-stone-900">R$ {totalFaturado.toFixed(2)}</span>
                      </div>
                      <span className="text-lg font-black text-amber-700">÷</span>
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200">
                        <span className="text-[9.5px] text-amber-700 uppercase block font-bold">Total de Pedidos</span>
                        <span className="text-base font-black text-stone-900">{totalQtd} pedidos</span>
                      </div>
                      <span className="text-lg font-black text-amber-700">=</span>
                      <div className="bg-amber-500 text-stone-950 px-3 py-1.5 rounded-lg shadow-2xs font-bold border border-amber-600">
                        <span className="text-[9.5px] uppercase block font-bold text-amber-950">Ticket Médio Geral</span>
                        <span className="text-base font-black">R$ {ticketGeral.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown por Tipo de Pedido */}
                  <div>
                    <h4 className="text-xs font-mono font-bold text-stone-700 uppercase tracking-wider mb-2">Ticket Médio por Tipo de Atendimento</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono">
                      {Object.entries(typesMap).map(([orderTypeKey, data]: any) => {
                        const tAvg = data.count > 0 ? data.rev / data.count : 0;
                        return (
                          <div key={orderTypeKey} className="bg-white p-3 border border-stone-200 rounded-xl">
                            <span className="text-[10px] font-bold text-stone-500 uppercase block mb-0.5">
                              {orderTypeKey === 'entrega' ? 'Entrega / Delivery' : orderTypeKey === 'mesa' ? 'Mesa' : 'Balcão / Retirada'}
                            </span>
                            <p className="text-lg font-black text-stone-900">R$ {tAvg.toFixed(2)}</p>
                            <span className="text-[9.5px] text-stone-400 mt-0.5 block">{data.count} pedidos • R$ {data.rev.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            // ────────────── RELATÓRIO: PRODUTOS OU COMPLEMENTOS ──────────────
            if (type === 'produtos' || type === 'complementos') {
              const counts: Record<string, { qty: number, rev: number }> = {};
              reportOrders.forEach(o => {
                const items = safeParseItems(o.items);
                items.forEach((it: any) => {
                  if (type === 'produtos') {
                    const itemName = getItemNameTextForPrint(it);
                    counts[itemName] = counts[itemName] || { qty: 0, rev: 0 };
                    counts[itemName].qty += (Number(it.quantity) || 1);
                    counts[itemName].rev += (Number(it.priceCalculated || it.price) || 0) * (Number(it.quantity) || 1);
                  } else {
                    if (it.extras && Array.isArray(it.extras)) {
                      it.extras.forEach((ext: any) => {
                        counts[ext.name] = counts[ext.name] || { qty: 0, rev: 0 };
                        counts[ext.name].qty += (Number(it.quantity) || 1);
                        counts[ext.name].rev += (Number(ext.price) || 0) * (Number(it.quantity) || 1);
                      });
                    }
                  }
                });
              });
              const sorted = Object.entries(counts).sort((a,b) => b[1].rev - a[1].rev);
              return (
                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200 font-mono">
                        <th className="py-2.5 px-3.5 font-bold text-stone-700">Item</th>
                        <th className="py-2.5 px-3.5 font-bold text-stone-700 text-center">Quantidade</th>
                        <th className="py-2.5 px-3.5 font-bold text-stone-700 text-right">Faturamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-mono">
                      {sorted.map(([name, data]: any, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="py-2 px-3.5 font-medium text-stone-900">{formatItemNameForPrint({ name })}</td>
                          <td className="py-2 px-3.5 text-center text-stone-600">{data.qty}</td>
                          <td className="py-2 px-3.5 text-right font-bold text-emerald-700">R$ {data.rev.toFixed(2)}</td>
                        </tr>
                      ))}
                      {sorted.length === 0 && (
                        <tr><td colSpan={3} className="py-6 text-center text-stone-500 font-mono">Nenhum registro encontrado no período</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            }

            // ────────────── RELATÓRIO: FORMAS DE PAGAMENTO ──────────────
            if (type === 'pagamentos') {
              const counts: Record<string, { count: number, rev: number }> = {};
              reportOrders.forEach(o => {
                const pm = o.paymentMethod || 'Não informado';
                counts[pm] = counts[pm] || { count: 0, rev: 0 };
                counts[pm].count++;
                counts[pm].rev += (Number(o.totalAmount) || 0);
              });
              const sorted = Object.entries(counts).sort((a,b) => b[1].rev - a[1].rev);
              return (
                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200 font-mono">
                        <th className="py-2.5 px-3.5 font-bold text-stone-700">Forma de Pagamento</th>
                        <th className="py-2.5 px-3.5 font-bold text-stone-700 text-center">Nº de Pedidos</th>
                        <th className="py-2.5 px-3.5 font-bold text-stone-700 text-right">Total Recebido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-mono">
                      {sorted.map(([pm, data]: any, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="py-2 px-3.5 font-medium text-stone-900">{pm}</td>
                          <td className="py-2 px-3.5 text-center text-stone-600">{data.count}</td>
                          <td className="py-2 px-3.5 text-right font-bold text-emerald-700">R$ {data.rev.toFixed(2)}</td>
                        </tr>
                      ))}
                      {sorted.length === 0 && (
                        <tr><td colSpan={3} className="py-6 text-center text-stone-500 font-mono">Nenhum pagamento registrado no período</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            }

            // ────────────── RELATÓRIO: CANCELAMENTOS OU PADRÃO ──────────────
            return (
              <div>
                <div className="flex justify-between items-center bg-stone-50 p-3.5 rounded-xl mb-4 border border-stone-200">
                  <span className="font-bold text-xs font-mono text-stone-700">Total no período:</span>
                  <span className="font-black text-xl font-mono text-emerald-700">R$ {reportOrders.reduce((acc, o: any) => acc + (Number(o.totalAmount) || 0), 0).toFixed(2)}</span>
                </div>
                <div className="overflow-x-auto border border-stone-200 rounded-xl max-h-[360px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 font-mono sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3.5 font-bold text-stone-700">Pedido</th>
                        <th className="py-2.5 px-3.5 font-bold text-stone-700">Data</th>
                        <th className="py-2.5 px-3.5 font-bold text-stone-700">Cliente</th>
                        <th className="py-2.5 px-3.5 font-bold text-stone-700">Status</th>
                        <th className="py-2.5 px-3.5 font-bold text-stone-700 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-mono">
                      {reportOrders.map((o: any) => (
                        <tr key={o.id} className="hover:bg-stone-50">
                          <td className="py-2 px-3.5 font-bold text-stone-900">#{o.id}</td>
                          <td className="py-2 px-3.5 text-stone-500">{new Date(o.createdAt).toLocaleString('pt-BR')}</td>
                          <td className="py-2 px-3.5 text-stone-700">{o.customerName || 'Cliente Balcão'}</td>
                          <td className="py-2 px-3.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                              {o.status}
                            </span>
                          </td>
                          <td className="py-2 px-3.5 text-right font-bold text-emerald-700">R$ {Number(o.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {reportOrders.length === 0 && (
                        <tr><td colSpan={5} className="py-6 text-center text-stone-500 font-mono">Nenhum pedido encontrado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
