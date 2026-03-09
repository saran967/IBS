// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";

// function cleanNumber(value) {
//   if (value == null) return "0";

//   let str = String(value);

//   const superscripts = {
//     "⁰": "0",
//     "¹": "1",
//     "²": "2",
//     "³": "3",
//     "⁴": "4",
//     "⁵": "5",
//     "⁶": "6",
//     "⁷": "7",
//     "⁸": "8",
//     "⁹": "9",
//     "⁺": "+",
//     "⁻": "-",
//     "·": ".",
//   };

//   str = str.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻·]/g, (c) => superscripts[c] || "");
//   str = str.replace(/[\u200B-\u200F\u202A-\u202E]/g, "");
//   str = str.replace(/[^0-9.+-]/g, "");

//   return str.trim();
// }

// export default function exportHistoryPDF(product, history) {
//   //  safety
//   if (!product) {
//     alert("Product not loaded yet. Please try again!");
//     return;
//   }

//   const doc = new jsPDF();

//   const productName =
//     product?.name?.en ||
//     product?.name?.ta ||
//     (typeof product?.name === "string" ? product.name : "Unknown Product");

//   doc.text(`Price Change History - ${productName}`, 14, 10);

//   const weight = Number(product?.weight || 1);

//   const tableData = history.map((h) => {
//     const oldPack = Number(h.oldPrice || 0);
//     const newPack = Number(h.newPrice || 0);

//     const oldUnit = oldPack / weight;
//     const newUnit = newPack / weight;

//     const diff = newPack - oldPack;

//     return [
//       new Date(h.changedAt).toLocaleString(),
//       `${weight} kg`,
//       cleanNumber(oldUnit.toFixed(2)),
//       cleanNumber(newUnit.toFixed(2)),
//       cleanNumber(oldPack.toFixed(2)),
//       cleanNumber(newPack.toFixed(2)),
//       diff > 0
//         ? `+${cleanNumber(diff.toFixed(2))}`
//         : diff < 0
//           ? `-${cleanNumber(Math.abs(diff).toFixed(2))}`
//           : "0",
//     ];
//   });

//   autoTable(doc, {
//     startY: 20,
//     head: [
//       [
//         "Date",
//         "Weight",
//         "Old (per unit)",
//         "New (per unit)",
//         "Old Pack",
//         "New Pack",
//         "Difference",
//       ],
//     ],
//     body: tableData,
//     styles: {
//       font: "helvetica",
//       fontSize: 9,
//       cellPadding: 3,
//       halign: "center",
//       textColor: [0, 0, 0],
//     },
//     columnStyles: {
//       0: { halign: "left" }, // Date
//       2: { textColor: [200, 0, 0] },
//       4: { textColor: [200, 0, 0] },
//       3: { textColor: [0, 150, 0] },
//       5: { textColor: [0, 150, 0] },
//       6: { fontStyle: "bold" },
//     },
//   });

//   doc.save(`${productName}_price_history.pdf`);
// }
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../fonts/NotoSansTamil-normal"; // 👈 add this

function cleanNumber(value) {
  if (value == null) return "0";

  let str = String(value);

  const superscripts = {
    "⁰": "0",
    "¹": "1",
    "²": "2",
    "³": "3",
    "⁴": "4",
    "⁵": "5",
    "⁶": "6",
    "⁷": "7",
    "⁸": "8",
    "⁹": "9",
    "⁺": "+",
    "⁻": "-",
    "·": ".",
  };

  str = str.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻·]/g, (c) => superscripts[c] || "");
  str = str.replace(/[\u200B-\u200F\u202A-\u202E]/g, "");
  str = str.replace(/[^0-9.+-]/g, "");

  return str.trim();
}

export default function exportHistoryPDF(product, history) {
  if (!product) {
    alert("Product not loaded yet. Please try again!");
    return;
  }

  const doc = new jsPDF();

  // ✅ SET TAMIL FONT
  doc.setFont("NotoSansTamil-Regular", "normal");

  const productName =
    product?.name?.en ||
    product?.name?.ta ||
    (typeof product?.name === "string" ? product.name : "Unknown Product");

  doc.text(`Price Change History - ${productName}`, 14, 10);

  const weight = Number(product?.weight || 1);

  const tableData = history.map((h) => {
    const oldPack = Number(h.oldPrice || 0);
    const newPack = Number(h.newPrice || 0);

    const oldUnit = oldPack / weight;
    const newUnit = newPack / weight;

    const diff = newPack - oldPack;

    return [
      new Date(h.changedAt).toLocaleString(),
      `${weight} kg`,
      cleanNumber(oldUnit.toFixed(2)),
      cleanNumber(newUnit.toFixed(2)),
      cleanNumber(oldPack.toFixed(2)),
      cleanNumber(newPack.toFixed(2)),
      diff > 0
        ? `+${cleanNumber(diff.toFixed(2))}`
        : diff < 0
          ? `-${cleanNumber(Math.abs(diff).toFixed(2))}`
          : "0",
    ];
  });

  autoTable(doc, {
    startY: 20,
    head: [
      [
        "Date",
        "Weight",
        "Old (per unit)",
        "New (per unit)",
        "Old Pack",
        "New Pack",
        "Difference",
      ],
    ],
    body: tableData,

    // ✅ APPLY TAMIL FONT HERE
    styles: {
      font: "NotoSansTamil-Regular",
      fontSize: 9,
      cellPadding: 3,
      halign: "center",
      textColor: [0, 0, 0],
    },

    columnStyles: {
      0: { halign: "left" },
      2: { textColor: [200, 0, 0] },
      4: { textColor: [200, 0, 0] },
      3: { textColor: [0, 150, 0] },
      5: { textColor: [0, 150, 0] },
      6: { fontStyle: "bold" },
    },
  });

  doc.save(`${productName}_price_history.pdf`);
}
