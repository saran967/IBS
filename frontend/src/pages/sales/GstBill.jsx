import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import customFetch from "../../utils/customFetch";
import { Box, CircularProgress, Button } from "@mui/material";
import getLocalizedText from "../../utils/getLocalizedText";

export default function InvoiceA4Styled() {
  const { id } = useParams();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggerPrint, setTriggerPrint] = useState(false);

  // THEME COLORS (same as old)
  const themePalette = [
    "#8b5cf6",
    "#0284c7",
    "#9ca3af",
    "#6b7280",
    "#a3a372",
    "#3b82f6",
    "#0ea5e9",
  ];

  const [printTypes, setPrintTypes] = useState({
    original: true,
    duplicate: false,
    transport: false,
  });

  const togglePrintType = (type) => {
    setPrintTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // selected theme color (default green)
  const [themeColor, setThemeColor] = useState("#1b8f3a");

  useEffect(() => {
    if (!triggerPrint) return;
    const timer = setTimeout(() => {
      window.print();
      setTriggerPrint(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [triggerPrint]);

  const bank = {
    name: "HDFC Bank",
    accNo: "823939399299",
    ifsc: "HDFC0C0031",
  };

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const res = await customFetch.get(`/sales/${id}`);
        if (res.data.success) setSale(res.data.data);
      } catch (err) {
        console.error("Invoice fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSale();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sale) return <div>Invoice not found</div>;

  const company = {
    name: "ismath",
    address1: "Your Address Line 1",
    address2: "Your Address Line 2",
    phone: "2349743786",
    email: "ismath@gmail.com",
    gst: "-",
    state: "Tamil Nadu",
    upi: "ismath@upi",
    logo: null,
  };

  const amountInWords = (amount) => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const num = Math.floor(amount);

    const convert = (n) => {
      if (n < 20) return ones[n];
      if (n < 100)
        return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
      if (n < 1000)
        return (
          ones[Math.floor(n / 100)] +
          " Hundred" +
          (n % 100 ? " " + convert(n % 100) : "")
        );
      if (n < 100000)
        return (
          convert(Math.floor(n / 1000)) +
          " Thousand" +
          (n % 1000 ? " " + convert(n % 1000) : "")
        );
      if (n < 10000000)
        return (
          convert(Math.floor(n / 100000)) +
          " Lakh" +
          (n % 100000 ? " " + convert(n % 100000) : "")
        );
      return (
        convert(Math.floor(n / 10000000)) +
        " Crore" +
        (n % 10000000 ? " " + convert(n % 10000000) : "")
      );
    };

    return convert(num) + " Rupees Only";
  };

  const billTo = {
    name: getLocalizedText(sale.customerId?.customerName),
    address: getLocalizedText(sale.customerId?.address),
    gst: sale.customerId?.gstNumber,
    phone: sale.customerId?.mobile,
  };

  const invoice = {
    no: sale.invoiceNumber,
    date: new Date(sale.saleDate).toLocaleDateString(),
    place: company.state,
    transporter: sale.transportDetails?.transportAgency || "-",
    vehicle: sale.transportDetails?.vehicleNumber || "-",
    lr: sale.transportDetails?.remarks || "-",
  };

  const items = Array.isArray(sale.items)
    ? sale.items.map((it, i) => ({
        sl: i + 1,
        name: it.productName?.en || it.productName,
        hsn: it.hsnCode,
        qty: it.quantity,
        price: it.sellingPrice,
        cgst: it.cgstPercentage || 0,
        sgst: it.sgstPercentage || 0,
      }))
    : [];

  const saleDiscount = Number(sale.discount || 0);
  const lineGross = (i) => i.qty * i.price;
  const subTotal = items.reduce((s, i) => s + lineGross(i), 0);
  const taxable = Math.max(0, subTotal - saleDiscount);

  let cgstAmt = 0;
  let sgstAmt = 0;
  items.forEach((i) => {
    cgstAmt += (lineGross(i) * i.cgst) / 100;
    sgstAmt += (lineGross(i) * i.sgst) / 100;
  });

  const total = taxable + cgstAmt + sgstAmt;
  const received = sale.paidAmount || 0;
  const balance = Math.max(0, total - received);

  const fmt = (v) => Number(v || 0).toFixed(2);
  const showTransportFor = (type) => type === "transport";

  return (
    <div className="bg-gray-200 p-4 print-root">
      {/* CONTROLS (screen only) */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: "center",
          mb: 2,
        }}
      >
        <Button
          size="small"
          variant={printTypes.original ? "contained" : "outlined"}
          onClick={() => togglePrintType("original")}
        >
          Original
        </Button>
        <Button
          size="small"
          variant={printTypes.duplicate ? "contained" : "outlined"}
          onClick={() => togglePrintType("duplicate")}
        >
          Duplicate
        </Button>
        <Button
          size="small"
          variant={printTypes.transport ? "contained" : "outlined"}
          onClick={() => togglePrintType("transport")}
        >
          Transport
        </Button>
        <Button
          size="small"
          variant="contained"
          color="success"
          onClick={() => {
            const anySelected =
              printTypes.original ||
              printTypes.duplicate ||
              printTypes.transport;
            if (!anySelected) {
              setPrintTypes({
                original: true,
                duplicate: false,
                transport: false,
              });
            }
            setTriggerPrint(true);
          }}
        >
          Print
        </Button>
      </Box>

      {/* THEME PICKER */}
      <div
        className="theme-picker"
        style={{
          display: "flex",
          gap: 14,
          marginBottom: 14,
          justifyContent: "center",
        }}
      >
        {themePalette.map((color) => (
          <div
            key={color}
            onClick={() => setThemeColor(color)}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: color,
              cursor: "pointer",
              border:
                themeColor === color ? "3px solid #000" : "2px solid #e5e7eb",
            }}
            title="Select Theme"
          />
        ))}
      </div>

      {/* STYLE (old UI + fixed print) */}
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        .sheet {
          width: 210mm;
          min-height: 270mm;
          background: #ffffff;
          padding: 12mm;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
          color: #1f2937;
          --theme-light: color-mix(in srgb, var(--theme-color) 15%, white);
        }

        @media screen {
          .sheet {
            margin: 20px auto;
            box-shadow: 0 0 8px rgba(0,0,0,0.1);
          }
          .copy-label {
            display: none;
          }
        }

        .green-bar {
          background: var(--theme-color);
        }

        .green-text {
          color: var(--theme-color);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        th {
          background: var(--theme-light);
          border: 1px solid var(--theme-color);
          padding: 6px;
          text-align: center;
          font-weight: 600;
          color: #111827;
        }

        table td {
          border-color: var(--theme-color);
        }

        td {
          border: 1px solid #d1d5db;
          padding: 6px;
        }

        .section {
          padding: 6px 8px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
        }

        .invoice-words {
          padding-bottom: 20px;
        }

        .signatory {
          margin-top: 40px;
          padding-right: 8px;
        }

        .signature-line {
          margin-top: 48px;
        }

        .summary-total {
          border-top: 2px solid var(--theme-color);
        }

        .copy-label {
          text-align: right;
          font-weight: 700;
          font-size: 12px;
        }

        @media print {
          body * { visibility: hidden !important; }

          .print-root,
          .print-root * {
            visibility: visible !important;
            margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  overflow-x: hidden !important;
          }

          .print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            background: white;
            padding: 0;
            margin: 0;
          }

          .sheet {
            width: 210mm;
            min-height: 270mm;
            margin: 0;
            padding: 12mm;
            box-sizing: border-box;
            page-break-inside: avoid;
            box-shadow: none;
          }

          .sheet:not(:last-child) {
            page-break-after: always;
          }

          .sheet:last-child {
            page-break-after: auto;
          }

          button,
          .theme-picker {
            display: none !important;
          }

          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* SHEETS (same UI as old version) */}
      {["original", "duplicate", "transport"]
        .filter((t) => printTypes[t])
        .map((type) => (
          <div
            key={type}
            className="sheet"
            style={{ "--theme-color": themeColor }}
          >
            <div className="copy-label">{type.toUpperCase()} COPY</div>

            {/* HEADER */}
            <div className="green-bar flex justify-between items-center p-3 text-white">
              <div>
                <div className="text-xl font-bold">{company.name}</div>
                <div className="text-sm">{company.address1}</div>
                <div className="text-sm">{company.address2}</div>
                <div className="text-sm">Phone: {company.phone}</div>
                <div className="text-sm">Email: {company.email}</div>
              </div>
              {company.logo && (
                <img src={company.logo} alt="logo" style={{ height: 48 }} />
              )}
            </div>

            <div className="text-center mt-2 green-text font-bold text-lg">
              TAX INVOICE
            </div>

            {/* META */}
            <div className="grid grid-cols-3 gap-4 mt-4 text-sm section">
              <div className="p-2 rounded">
                <b>Bill To</b>
                <div>{billTo.name}</div>
                <div>{billTo.address}</div>
              </div>

              <div className="p-2 rounded text-center">
                <b>Invoice Details</b>
                <div>Invoice No: {invoice.no}</div>
                <div>Date: {invoice.date}</div>
                <div>Place of Supply: {invoice.place}</div>
              </div>

              {showTransportFor(type) && (
                <div className="p-2 rounded text-right">
                  <b>Transport Details</b>
                  <div>Transporter: {invoice.transporter}</div>
                  <div>Vehicle No: {invoice.vehicle}</div>
                  <div>LR No: {invoice.lr}</div>
                </div>
              )}
            </div>

            {/* ITEMS TABLE */}
            <table className="mt-4">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Name</th>
                  <th>HSN/SAC</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>CGST%</th>
                  <th>SGST%</th>
                  <th>GST Amt</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const taxableLine = lineGross(i);
                  const gstLine = (taxableLine * (i.cgst + i.sgst)) / 100;
                  return (
                    <tr key={i.sl}>
                      <td align="center">{i.sl}</td>
                      <td>{i.name}</td>
                      <td align="center">{i.hsn}</td>
                      <td align="center">{i.qty}</td>
                      <td align="right">{fmt(i.price)}</td>
                      <td align="center">{i.cgst}%</td>
                      <td align="center">{i.sgst}%</td>
                      <td align="right">{fmt(gstLine)}</td>
                      <td align="right">{fmt(taxableLine + gstLine)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* SUMMARY */}
            <div className="flex justify-between mt-4 items-start gap-4 p-2">
              <div
                className="text-sm w-1/2 invoice-words"
                style={{ marginTop: "60px" }}
              >
                <b>Invoice Amount (in Words)</b>
                <div className="mt-1 italic">{amountInWords(total)}</div>
              </div>

              <div style={{ width: 300 }} className="text-sm">
                <div className="summary-row">
                  <span>Sub Total</span>
                  <span>₹ {fmt(subTotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Discount</span>
                  <span>₹ {fmt(saleDiscount)}</span>
                </div>
                <div className="summary-row">
                  <span>CGST</span>
                  <span>₹ {fmt(cgstAmt)}</span>
                </div>
                <div className="summary-row">
                  <span>SGST</span>
                  <span>₹ {fmt(sgstAmt)}</span>
                </div>
                <div className="summary-row summary-total">
                  <span>Total</span>
                  <span>₹ {fmt(total)}</span>
                </div>
                <div className="summary-row">
                  <span>Received</span>
                  <span>₹ {fmt(received)}</span>
                </div>
                <div className="summary-row">
                  <span>Balance</span>
                  <span>₹ {fmt(balance)}</span>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="grid grid-cols-2 mt-6 text-sm p-2">
              <div>
                <b>Pay To</b>
                <div>{company.name}</div>
                <div>Bank: {bank.name}</div>
                <div>A/C: {bank.accNo}</div>
                <div>IFSC: {bank.ifsc}</div>
                <div>UPI: {company.upi}</div>
              </div>
            </div>

            <div className="mt-6 text-sm p-2">
              <div className="text-center">
                <b>Acknowledgement</b>
                <div>
                  Invoice No: {invoice.no} | Invoice Amount: ₹ {fmt(total)}
                </div>
              </div>

              <div className="grid grid-cols-2 mt-8">
                <div>
                  <div>
                    <b>Packed By:</b>
                  </div>
                  <div style={{ marginTop: "32px" }}>____________________</div>
                </div>
                <div className="text-right">
                  <div>
                    <b>Checked By:</b>
                  </div>
                  <div style={{ marginTop: "32px" }}>____________________</div>
                </div>
              </div>

              <div className="text-right signatory">
                {/* <b>For {company.name}</b> */}
                <div className="signature-line">Authorised Signatory</div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
