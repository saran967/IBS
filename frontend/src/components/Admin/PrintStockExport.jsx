import React from "react";
import getLocalizedText from "../../utils/getLocalizedText";

const PrintStockTransfer = ({ data, lang }) => {
  return (
    <div id="print-area">
      <h2 style={{ textAlign: "center" }}>Stock Transfer Report</h2>

      <table
        border="1"
        cellPadding="6"
        cellSpacing="0"
        width="100%"
        style={{ borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>From</th>
            <th>To</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Transferred By</th>
          </tr>
        </thead>
        <tbody>
          {data.map((t, i) => (
            <tr key={t._id}>
              <td>{i + 1}</td>
              <td>{new Date(t.transferDate).toLocaleString()}</td>
              <td>
                {t.fromType}: {getLocalizedText(t.fromName, lang)}
              </td>
              <td>
                {t.toType}: {getLocalizedText(t.toName, lang)}
              </td>
              <td>{getLocalizedText(t.productName, lang)}</td>
              <td>{t.quantity}</td>
              <td>
                {t.transferredByName} ({t.transferredByRole})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PrintStockTransfer;
