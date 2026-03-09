import React from "react";
import {
  Box,
  Autocomplete,
  TextField,
  Card,
  CardContent,
  Typography,
  Switch,
} from "@mui/material";

const FiltersBar = ({
  lang,
  categories,
  selectedCategory,
  setSelectedCategory,
  toggleCategory,
}) => {
  return (
    <Box mb={2} display="flex" alignItems="center" gap={2} flexWrap="wrap">
      {/* Category Dropdown */}
      <Autocomplete
        options={categories}
        getOptionLabel={(option) =>
          lang === "ta" ? option.ta || option.en : option.en
        }
        value={selectedCategory}
        onChange={(e, newValue) => setSelectedCategory(newValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={lang === "ta" ? "வகை" : "Category"}
            size="small"
            sx={{ width: 220 }}
          />
        )}
      />

      {/* Category Toggle */}
      {selectedCategory && (
        <Card sx={{ minWidth: 180, p: 0.5 }}>
          <CardContent
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              py: 0.5,
            }}
          >
            <Typography variant="body2">
              {lang === "ta"
                ? selectedCategory.ta || selectedCategory.en
                : selectedCategory.en}
            </Typography>

            <Switch
              checked={selectedCategory.enabled}
              onChange={() => toggleCategory(selectedCategory)}
              color="success"
              size="small"
            />
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default FiltersBar;
