import FinancialYear from "../models/FinancialYear.js";

const getActiveFinancialYear = async () => {
  const activeFY = await FinancialYear.findOne({ isActive: true });
  return activeFY || null;
};

export default getActiveFinancialYear;