import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

import { CheckCircle, Clock, Truck, ChefHat, ArrowLeft } from 'lucide-react';
import { formatItemNameForPrint } from '../utils/printHelpers';

export default function OrderTracking() {
  const { code } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchOrder() {
      try {
        const { data, error } = await supabase.rpc('get_order_by_tracking_code', { p_code: code });
        if (error) throw error;
        if (!isMounted) return;
        if (data && data.length > 0) {
          const o = data[0];
          setOrder({
            id: o.id,
            customerName: o.customer_name,
            orderType: o.order_type,
            paymentMethod: o.payment_method,
            status: o.status,
            totalAmount: o.total_amount,
            items: o.items,
            createdAt: o.created_at
          });
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to fetch order', err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchOrder();
    const interval = setInterval(fetchOrder, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [code]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">A carregar...</div>;

  if (notFound || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Pedido não encontrado</h1>
        <Link to="/" className="text-red-700 underline">Voltar à loja</Link>
      </div>
    );
  }

  const statusMap: Record<string, { icon: any, text: string, color: string }> = {
    'Pendente': { icon: Clock, text: 'Pendente', color: 'text-gray-500' },
    'Em Preparo': { icon: ChefHat, text: 'Em Preparo', color: 'text-orange-500' },
    'Saiu para Entrega': { icon: Truck, text: 'Saiu para Entrega', color: 'text-blue-500' },
    'Finalizado': { icon: CheckCircle, text: 'Finalizado', color: 'text-green-500' }
  };

  const currentStatus = statusMap[order.status] || statusMap['Pendente'];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div>
          <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6">
            <ArrowLeft size={16} className="mr-1" /> Voltar ao Início
          </Link>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Acompanhar Pedido #{order.id}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Cliente: {order.customerName}
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center space-y-4">
          <div className={`p-6 rounded-full bg-gray-50 shadow-inner ${currentStatus.color}`}>
            <StatusIcon size={64} />
          </div>
          <h3 className={`text-2xl font-bold ${currentStatus.color}`}>
            {currentStatus.text}
          </h3>
          <p className="text-gray-500 text-center">
            {order.status === 'Pendente' && 'Aguardando o restaurante aceitar seu pedido.'}
            {order.status === 'Em Preparo' && 'Nossa equipe está preparando o seu pedido com muito carinho!'}
            {order.status === 'Saiu para Entrega' && 'O seu pedido já está a caminho!'}
            {order.status === 'Finalizado' && 'Pedido concluído. Bom apetite!'}
          </p>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">Resumo do Pedido</h4>
          <div className="space-y-3">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}x {formatItemNameForPrint(item)}</span>
                <span className="font-medium">R$ {(item.priceCalculated * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>R$ {order.totalAmount.toFixed(2)}</span>
          </div>
          <div className="mt-2 text-sm text-gray-500 text-right">
            Pago em {order.paymentMethod}
          </div>
        </div>
      </div>
    </div>
  );
}
