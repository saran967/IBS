export const focusField = (refs, key) => {
  try {
    const el = refs.current[key];
    if (!el) return false;

    if (typeof el.focus === "function" && !el.disabled) {
      el.focus();
      if (typeof el.select === "function") el.select();
      return true;
    }

    if (el.querySelector) {
      const input = el.querySelector("input, textarea, select");
      if (input && !input.disabled) {
        input.focus();
        if (typeof input.select === "function") input.select();
        return true;
      }
    }
  } catch (e) {}

  return false;
};

export const buildFocusOrder = ({
  items,
  includeHandling,
  includeTransport,
}) => {
  const order = [];

  order.push("customer");

  (items || []).forEach((_, idx) => {
    order.push(`shop_${idx}`);
    order.push(`productCode_${idx}`);
    order.push(`unit_${idx}`);
    order.push(`qty_${idx}`);
    order.push(`sellingPrice_${idx}`);

    //  REMOVE THIS if you don't want GST focus
    // order.push(`gst_${idx}`);
  });

  if (includeHandling) {
    (items || []).forEach((it) => {
      if (it.productId) order.push(`handling_${it.productId}`);
    });
  }

  if (includeTransport) {
    order.push("vehicleNumber");
    order.push("driverName");
    order.push("driverPhone");
    order.push("transportAgency");
    order.push("remarks");
    order.push("destination");
  }

  return order;
};

export const focusNextLogicalField = ({
  refs,
  currentKey,
  items,
  includeHandling,
  includeTransport,
}) => {
  const order = buildFocusOrder({ items, includeHandling, includeTransport });

  const idx = order.indexOf(currentKey);
  const start = idx === -1 ? 0 : idx + 1;

  for (let i = start; i < order.length; i++) {
    if (focusField(refs, order[i])) return true;
  }

  return false;
};
