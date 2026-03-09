import FinancialYear from "../models/FinancialYear.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../Error/customError.js";

export const getAllFinancialYears = async (req, res) => {
    const financialYears = await FinancialYear.find().sort({ startDate: -1 });
    res.status(StatusCodes.OK).json({ financialYears });
};

export const createFinancialYear = async (req, res) => {
    const { yearName, startDate, endDate } = req.body;

    const existing = await FinancialYear.findOne({ yearName });
    if (existing) {
        throw new BadRequestError("Financial year already exists");
    }

    const financialYear = await FinancialYear.create({
        yearName,
        startDate,
        endDate,
        isActive: false,
    });

    res.status(StatusCodes.CREATED).json({ financialYear });
};

export const activateFinancialYear = async (req, res) => {
    const { id } = req.params;

    const fy = await FinancialYear.findById(id);
    if (!fy) {
        throw new NotFoundError("Financial year not found");
    }

    // Deactivate all others
    await FinancialYear.updateMany({}, { isActive: false });

    // Activate selected one
    fy.isActive = true;
    await fy.save();

    res.status(StatusCodes.OK).json({ message: "Financial year activated successfully", financialYear: fy });
};

export const deleteFinancialYear = async (req, res) => {
    const { id } = req.params;
    const fy = await FinancialYear.findById(id);

    if (!fy) {
        throw new NotFoundError("Financial year not found");
    }

    if (fy.isActive) {
        throw new BadRequestError("Cannot delete active financial year");
    }

    await fy.deleteOne();
    res.status(StatusCodes.OK).json({ message: "Financial year deleted successfully" });
};
