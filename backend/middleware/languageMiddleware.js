// middleware/languageMiddleware.js
export const setLanguage = (req, res, next) => {
  // if your routes include :lang param, read it
  req.lang = req.params.lang || req.query.lang || "en";
  next();
};
