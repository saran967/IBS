// src/components/LanguageSwitcher.jsx

import { useNavigate, useParams } from "react-router-dom";
import { FormControl, Select, MenuItem, InputLabel } from "@mui/material";

const LanguageSwitcher = () => {
  const navigate = useNavigate();
  const { lang } = useParams();

  const validLangs = ["en", "ta", "both"];
  const currentLang = validLangs.includes(lang) ? lang : "en";

  const handleChange = (e) => {
    const selectedLang = e.target.value;
    const pathname = window.location.pathname;
    const pathParts = pathname.split("/").filter(Boolean);

    if (validLangs.includes(pathParts[0])) {
      pathParts[0] = selectedLang;
    } else {
      pathParts.unshift(selectedLang);
    }

    const newPath = `/${pathParts.join("/")}`;
    if (newPath !== pathname) navigate(newPath);
  };

  return (
    <FormControl
      size="small"
      sx={{
        minWidth: 130,
        backgroundColor: "white",
        borderRadius: 2,
      }}
    >
      <InputLabel id="language-select-label">Language</InputLabel>
      <Select
        labelId="language-select-label"
        value={currentLang}
        label="Language"
        onChange={handleChange}
      >
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="ta">தமிழ்</MenuItem>
        <MenuItem value="both">Both</MenuItem>
      </Select>
    </FormControl>
  );
};

export default LanguageSwitcher;
