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
} from "@mui/material";
import exportAllHistoryPDF from "./exportAllHistoryPDF";
import customFetch from "../utils/customFetch";

export default function AllPriceHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await customFetch.get(`/product/price-history/all`);
      setHistory(res.data.history || []);
    };
    load();
  }, []);

  return (
    <Box p={2}>
      <Typography variant="h5" mb={2}>
        All Product Price Changes
      </Typography>

      <Paper sx={{ p: 2 }}>
        {history.length > 0 && (
          <Button
            variant="contained"
            sx={{ mb: 2 }}
            onClick={() => exportAllHistoryPDF(history)}
          >
            Download PDF
          </Button>
        )}

        <Table size="small">
          <TableHead sx={{ background: "#f2f2f2" }}>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Old (per unit)</TableCell>
              <TableCell>New (per unit)</TableCell>
              <TableCell>Old Pack Price</TableCell>
              <TableCell>New Pack Price</TableCell>
              <TableCell>Difference</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  No price changes recorded
                </TableCell>
              </TableRow>
            ) : (
              history.map((row) => {
                const weight = Number(row.productId?.weight || 1);
                const oldPrice = Number(row.oldPrice || 0);
                const newPrice = Number(row.newPrice || 0);

                const oldPack = oldPrice;
                const newPack = newPrice;

                const oldUnit = oldPack / weight;
                const newUnit = newPack / weight;

                const diff = newPack - oldPack;

                return (
                  <TableRow key={row._id}>
                    <TableCell>
                      {new Date(row.changedAt).toLocaleString()}
                    </TableCell>

                    <TableCell>
                      {row.productId?.name?.en ||
                        row.productId?.name ||
                        "Unknown Product"}
                    </TableCell>

                    <TableCell>{weight} kg</TableCell>

                    <TableCell>₹ {oldUnit.toFixed(2)}</TableCell>
                    <TableCell>₹ {newUnit.toFixed(2)}</TableCell>

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
      </Paper>
    </Box>
  );
}
