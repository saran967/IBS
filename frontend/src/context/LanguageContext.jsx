

import { createContext, useContext } from "react";
import { useParams } from "react-router-dom";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { lang } = useParams();

  let currentLang = "en";

  if (lang === "ta") currentLang = "ta";
  else if (lang === "both") currentLang = "both";

  return (
    <LanguageContext.Provider value={currentLang}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
