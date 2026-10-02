'use client'

import { formatPrice, formatDateHour } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/types'
import type { Order } from '@/lib/types'

const SHIPPING_LABELS: Record<string, string> = {
  standard: 'Standard (3-5 jours)',
  express: 'Express (24-48h)',
  relais: 'Point Relais',
}

/**
 * Facture au format impression — invisible à l'écran (display:none),
 * rendue uniquement lors d'un window.print() via .print-invoice.
 */
export default function OrderInvoice({ order }: { order: Order }) {
  return (
    <div className="print-invoice text-black" aria-hidden="true">
      {/* En-tête */}
      <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
        <div>
          <p className="text-2xl font-bold">
            MIGNONCITE<span>SHOP</span>
          </p>
          <p className="text-xs mt-1">
            contact@mignonciteshop.com · +33 1 23 45 67 89 · Paris, France
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">FACTURE</p>
          <p className="text-sm">{order.orderNumber}</p>
          <p className="text-xs">{formatDateHour(order.createdAt)}</p>
        </div>
      </div>

      {/* Client */}
      <div className="mb-6">
        <p className="font-bold text-sm uppercase mb-1">Facturé à</p>
        <p className="text-sm">{order.customerName}</p>
        <p className="text-sm">{order.address}</p>
        <p className="text-sm">
          {order.postalCode} {order.city}, {order.country}
        </p>
        {order.phone && <p className="text-sm">Tél : {order.phone}</p>}
        <p className="text-sm">{order.customerEmail}</p>
      </div>

      {/* Articles */}
      <table className="w-full text-sm border-collapse mb-6">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-2 font-bold">Article</th>
            <th className="py-2 font-bold text-center">Qté</th>
            <th className="py-2 font-bold text-right">P.U.</th>
            <th className="py-2 font-bold text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-gray-300">
              <td className="py-2">{item.name}</td>
              <td className="py-2 text-center">{item.quantity}</td>
              <td className="py-2 text-right">{formatPrice(item.price)}</td>
              <td className="py-2 text-right">{formatPrice(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <div className="flex justify-end mb-4">
        <div className="w-64 text-sm">
          <div className="flex justify-between py-1">
            <span>Sous-total</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between py-1">
              <span>Réduction {order.promoCode ? `(${order.promoCode})` : ''}</span>
              <span>-{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between py-1">
            <span>
              Livraison{order.shippingMethod ? ` — ${SHIPPING_LABELS[order.shippingMethod] || order.shippingMethod}` : ''}
            </span>
            <span>{order.shipping === 0 ? 'Gratuite' : formatPrice(order.shipping)}</span>
          </div>
          <div className="flex justify-between py-2 border-t border-black font-bold text-base">
            <span>Total TTC</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Pied */}
      <div className="border-t pt-3 text-xs flex items-center justify-between">
        <span>
          Paiement : {order.paymentMethod} · Statut : {STATUS_LABELS[order.status] || order.status}
        </span>
        <span>Merci de votre confiance !</span>
      </div>
    </div>
  )
}
