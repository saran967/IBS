// utils/quotationCalc.js

export const numeric = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
};

export const recalcTotals = ({
    rows = [],
    totals = {},
    updatedTotals = {},
}) => {
    // Gross from row totals
    const gross = rows.reduce((acc, cur) => acc + Number(cur.total || 0), 0);

    // Take latest values if user is typing now
    const discountRaw = updatedTotals.discount ?? totals.discount;
    const discount = numeric(discountRaw);

    const net = gross - discount;

    return {
        gross: Number(gross.toFixed(2)),
        discount: discountRaw === "" ? "" : Number(discount.toFixed(2)),
        net: Number(net.toFixed(2)),
    };
};
