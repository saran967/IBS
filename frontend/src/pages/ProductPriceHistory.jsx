import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TableContainer,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";

import exportHistoryPDF from "./exportHistoryPDF";
import customFetch from "../utils/customFetch";

export default function ProductPriceHistory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await customFetch.get(`/product/${id}/price-history`);
        console.log(res.data);

        setProduct(res.data.product || null);
        setHistory(res.data.history || []);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [id]);

  const getProductName = () => {
    const name = product?.name;
    if (!name) return "Unknown Product";
    if (typeof name === "string") return name;
    if (typeof name === "object")
      return name.en || name.ta || "Unnamed Product";
    return "Unnamed Product";
  };

  return (
    <Box p={2}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5">Price History - {getProductName()}</Typography>

        <Button variant="outlined" onClick={() => navigate(-1)}>
          Back
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        {/*  FIX: Button only if product + history available */}
        {product && history.length > 0 && (
          <Button
            variant="contained"
            sx={{ mb: 2 }}
            onClick={() => exportHistoryPDF(product, history)}
          >
            Download PDF
          </Button>
        )}

        <TableContainer sx={{ overflowX: "auto" }}>
          <Table
            size="small"
            sx={{
              minWidth: 750,
              whiteSpace: "nowrap",
            }}
          >
            <TableHead sx={{ background: "#f2f2f2" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>

                <TableCell>Weight</TableCell>
                <TableCell>Old (per unit)</TableCell>
                <TableCell>New (per unit)</TableCell>
                <TableCell>Old Pack</TableCell>
                <TableCell>New Pack</TableCell>
                <TableCell>Difference</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    No price changes recorded
                  </TableCell>
                </TableRow>
              ) : (
                history.map((row) => {
                  const weight = Number(product?.weight || 1);

                  //  Pack price stored in DB directly
                  const oldPack = Number(row.oldPrice || 0);
                  const newPack = Number(row.newPrice || 0);

                  //  Unit price derived
                  const oldUnit = oldPack / weight;
                  const newUnit = newPack / weight;

                  const diff = newPack - oldPack;

                  return (
                    <TableRow key={row._id}>
                      <TableCell>
                        {new Date(row.changedAt).toLocaleString()}
                      </TableCell>

                      <TableCell>{weight} kg</TableCell>

                      <TableCell sx={{ color: "red" }}>
                        ₹ {oldUnit.toFixed(2)}
                      </TableCell>

                      <TableCell sx={{ color: "green" }}>
                        ₹ {newUnit.toFixed(2)}
                      </TableCell>

                      <TableCell>₹ {oldPack.toFixed(2)}</TableCell>
                      <TableCell>₹ {newPack.toFixed(2)}</TableCell>

                      <TableCell
                        sx={{
                          color: diff > 0 ? "green" : diff < 0 ? "red" : "grey",
                          fontWeight: 600,
                        }}
                      >
                        {diff > 0
                          ? `+₹${diff.toFixed(2)}`
                          : diff < 0
                            ? `-₹${Math.abs(diff).toFixed(2)}`
                            : "No Change"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
