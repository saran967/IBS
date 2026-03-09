// utils/salesCalc.js

export const numeric = (v) => {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

export const recalcTotals = ({
  rows = [],
  totals = {},
  includeHandling = false,
  handlingCharges = [],
  updatedTotals = {},
  updatedHandling = null,
}) => {
  //  Gross from row totals
  const gross = rows.reduce((acc, cur) => acc + Number(cur.total || 0), 0);

  //  Take latest values if user is typing now
  const discountRaw = updatedTotals.discount ?? totals.discount;
  const paidRaw = updatedTotals.paid ?? totals.paid;

  const discount = numeric(discountRaw);
  const paid = numeric(paidRaw);

  //  Handling list (row-wise now, uses rowKey in objects)
  const handlingList =
    updatedHandling !== null ? updatedHandling : handlingCharges;

  //  Handling total (sum totalCharge) — safe Number conversion
  const handlingTotal = includeHandling
    ? handlingList.reduce((sum, h) => sum + Number(h.totalCharge || 0), 0)
    : 0;

  //  Net + Balance
  const net = gross + handlingTotal - discount;
  const balance = net - paid;

  return {
    gross: Number(gross.toFixed(2)),
    discount: discountRaw === "" ? "" : Number(discount.toFixed(2)),
    net: Number(net.toFixed(2)),
    paid: paidRaw === "" ? "" : Number(paid.toFixed(2)),
    balance: Number(balance.toFixed(2)),
  };
};
