import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

@Injectable()
export class MarginEngine {
  calculateLine(input: any) {
    const qty = new Decimal(input.qty || 0);
    const unitPrice = new Decimal(input.unitPrice || 0);
    const costPrice = new Decimal(input.costPrice || 0);
    const discountPct = new Decimal(input.discountPct || 0);
    const taxPct = new Decimal(input.taxPct || 18);

    const discountAmount = unitPrice.mul(discountPct).div(100);
    const effectivePrice = unitPrice.minus(discountAmount);
    const subtotal = qty.mul(effectivePrice);
    const taxAmount = subtotal.mul(taxPct).div(100);
    const lineTotal = subtotal.plus(taxAmount);
    const totalCost = qty.mul(costPrice);
    const marginAmount = subtotal.minus(totalCost);
    const marginPct = subtotal.isZero()
      ? new Decimal(0)
      : marginAmount.div(subtotal).mul(100);

    return {
      qty,
      unitPrice,
      costPrice,
      discountPct,
      discountAmount: discountAmount.mul(qty),
      effectivePrice,
      subtotal,
      taxPct,
      taxAmount,
      lineTotal,
      totalCost,
      marginAmount,
      marginPct: marginPct.toDecimalPlaces(2),
    };
  }

  calculateTotals(lines: any[]) {
    const subtotal = lines.reduce((sum, l) => sum.plus(l.subtotal), new Decimal(0));
    const discountAmount = lines.reduce((sum, l) => sum.plus(l.discountAmount), new Decimal(0));
    const taxAmount = lines.reduce((sum, l) => sum.plus(l.taxAmount), new Decimal(0));
    const totalAmount = subtotal.plus(taxAmount);
    const totalCost = lines.reduce((sum, l) => sum.plus(l.totalCost), new Decimal(0));
    const marginAmount = subtotal.minus(totalCost);
    const marginPct = subtotal.isZero()
      ? new Decimal(0)
      : marginAmount.div(subtotal).mul(100).toDecimalPlaces(2);

    return {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      totalCost,
      marginAmount,
      marginPct,
    };
  }

  isMarginBelowThreshold(marginPct: Decimal, threshold = 15): boolean {
    return marginPct.lessThan(threshold);
  }
}