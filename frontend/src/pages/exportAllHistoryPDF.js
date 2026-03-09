// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
// import loadTamilFont from "../fonts/NotoSansTamil-normal";

// export default function exportAllHistoryPDF(history) {
//   const doc = new jsPDF({ unit: "mm", format: "a4" });

//   loadTamilFont(jsPDF);
//   doc.setFont("NotoSansTamil", "normal");
//   doc.setFontSize(12);

//   doc.text("All Product Price Change Report", 14, 12);

//   const tableData = history.map((h) => {
//     const weight = Number(h.productId?.weight || 1);

//     const oldPrice = Number(h.oldPrice || 0);
//     const newPrice = Number(h.newPrice || 0);

//     const oldPack = oldPrice;
//     const newPack = newPrice;

//     const oldUnit = oldPack / weight;
//     const newUnit = newPack / weight;

//     const diff = newPack - oldPack;

//     return [
//       new Date(h.changedAt).toLocaleString(),
//       String(h.productId?.name?.en || h.productId?.name || "Unknown"),
//       `${weight} kg`,
//       `Rs. ${oldUnit.toFixed(2)}`,
//       `Rs. ${newUnit.toFixed(2)}`,
//       `Rs. ${oldPack.toFixed(2)}`,
//       `Rs. ${newPack.toFixed(2)}`,
//       diff > 0
//         ? `+Rs. ${diff.toFixed(2)}`
//         : diff < 0
//           ? `-Rs. ${Math.abs(diff).toFixed(2)}`
//           : "No Change",
//       String(h.changedBy?.name || "Admin"),
//     ];
//   });

//   autoTable(doc, {
//     startY: 18,
//     head: [
//       [
//         "Date",
//         "Product",
//         "Weight",
//         "Old (1kg)",
//         "New (1kg)",
//         "Old Pack Price",
//         "New Pack Price",
//         "Difference",
//         // "Changed By",
//       ],
//     ],
//     body: tableData,

//     styles: {
//       font: "NotoSansTamil",
//       fontSize: 9,
//       cellPadding: 3,
//       halign: "center",
//       textColor: [0, 0, 0], // default black
//     },

//     columnStyles: {
//       0: { halign: "left" }, // Date
//       1: { halign: "left" }, // Product

//       // 🔴 OLD PRICES (RED)
//       3: { textColor: [200, 0, 0] }, // Old (1kg)
//       5: { textColor: [200, 0, 0] }, // Old Pack Price

//       // 🟢 NEW PRICES (GREEN)
//       4: { textColor: [0, 150, 0] }, // New (1kg)
//       6: { textColor: [0, 150, 0] }, // New Pack Price

//       // 🔴🟢 DIFFERENCE (DYNAMIC)
//       7: { fontStyle: "bold" },
//     },
//   });

//   doc.save("product_price_changes.pdf");
// }

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../fonts/NotoSansTamil-normal";

export default function exportAllHistoryPDF(history) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Use Tamil font
  doc.setFont("NotoSansTamil-Regular", "normal");
  doc.setFontSize(12);

  doc.text("All Product Price Change Report", 14, 12);

  const tableData = history.map((h) => {
    const weight = Number(h.productId?.weight || 1);

    const oldPrice = Number(h.oldPrice || 0);
    const newPrice = Number(h.newPrice || 0);

    const oldUnit = oldPrice / weight;
    const newUnit = newPrice / weight;

    const diff = newPrice - oldPrice;

    return [
      new Date(h.changedAt).toLocaleString(),
      String(h.productId?.name?.en || h.productId?.name || "Unknown"),
      `${weight} kg`,
      `Rs. ${oldUnit.toFixed(2)}`,
      `Rs. ${newUnit.toFixed(2)}`,
      `Rs. ${oldPrice.toFixed(2)}`,
      `Rs. ${newPrice.toFixed(2)}`,
      diff > 0
        ? `+Rs. ${diff.toFixed(2)}`
        : diff < 0
          ? `-Rs. ${Math.abs(diff).toFixed(2)}`
          : "No Change",
    ];
  });

  autoTable(doc, {
    startY: 18,
    head: [
      [
        "Date",
        "Product",
        "Weight",
        "Old (1kg)",
        "New (1kg)",
        "Old Pack Price",
        "New Pack Price",
        "Difference",
      ],
    ],
    body: tableData,

    styles: {
      font: "NotoSansTamil-Regular",
      fontSize: 9,
      cellPadding: 3,
      halign: "center",
    },
  });

  doc.save("product_price_changes.pdf");
}
