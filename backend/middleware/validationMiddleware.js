import { body, validationResult } from "express-validator";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../Error/customError.js";
import userModel from "../models/userModel.js";
import purchaseModel from "../models/purchaseModel.js";

const withValidationErrors = (validateValues) => {
  return [
    validateValues,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err) => err.msg);
        if (errorMessages[0].startsWith("no product found")) {
          throw new NotFoundError(errorMessages);
        }
        if (errorMessages[0].startsWith("not authorized")) {
          throw new UnauthorizedError("not authorized to access ");
        }
        throw new BadRequestError(errorMessages);
      }
      next();
    },
  ];
};


export const validateAdminCreation = withValidationErrors([
  body("name").notEmpty().withMessage("Admin name is required"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .custom(async (email) => {
      const user = await userModel.findOne({ email });
      if (user) {
        throw new BadRequestError("email already exits");
      }
    }),
  body("password").notEmpty().withMessage("Password is required"),
]);


export const validateShopSubAdminCreation = withValidationErrors([
  body("shopName")
    .if((value, { req }) => !req.body.shopId) // only required if shopId is not provided
    .notEmpty()
    .withMessage("Shop name is required if shopId is not provided"),

  body("shopId").optional().isMongoId().withMessage("Invalid shopId"),

  body("subAdminName").notEmpty().withMessage("Sub Admin name is required"),

  body("subAdminEmail")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .custom(async (email) => {
      const user = await userModel.findOne({ email });
      if (user) {
        throw new BadRequestError("Email already exists");
      }
    }),

  body("subAdminPassword").notEmpty().withMessage("Password is required"),
]);


export const validateEmployeeCreation = withValidationErrors([
  body("name").notEmpty().withMessage("Employee name is required"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .custom(async (email) => {
      const user = await userModel.findOne({ email });
      if (user) {
        throw new BadRequestError("email already exits");
      }
    }),
  body("password").notEmpty().withMessage("Password is required"),
  
]);



export const validatePurchaseCreation = withValidationErrors([
  body("batchNo").notEmpty().withMessage("Batch number is required"),
  body("productId").notEmpty().withMessage("Product ID is required"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isFloat({ gt: 0 })
    .withMessage("Quantity must be greater than 0"),
  body("pricePerUnit")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Price per unit must be greater than 0"),
  body("totalPrice")
    .notEmpty()
    .withMessage("Total price is required")
    .isFloat({ gt: 0 })
    .withMessage("Total price must be greater than 0"),
  body("assignedShops").custom((assignedShops, { req }) => {
    if (!assignedShops) return true; 

    if (!Array.isArray(assignedShops)) {
      throw new BadRequestError("Assigned shops must be an array");
    }

    let totalAssigned = 0;
    for (const entry of assignedShops) {
      if (!entry.shopId) {
        throw new BadRequestError("Each assigned shop must include shopId");
      }
      if (
        typeof entry.quantityAssigned !== "number" ||
        entry.quantityAssigned < 0
      ) {
        throw new BadRequestError(
          "Each assigned shop must include a valid quantityAssigned"
        );
      }
      totalAssigned += entry.quantityAssigned;
    }

    if (totalAssigned > req.body.quantity) {
      throw new BadRequestError(
        "Assigned quantity exceeds total purchase quantity"
      );
    }

    return true;
  }),
]);

export const validateCustomerCreation = withValidationErrors([
  body("customerType")
    .notEmpty()
    .withMessage("Customer type is required")
    .isIn(["B2C", "B2B"])
    .withMessage("Customer type must be either B2C or B2B"),

  body("customerName").notEmpty().withMessage("Customer name is required"),

  body("mobileNumber")
    .notEmpty()
    .withMessage("Mobile number is required")
    .isMobilePhone("any")
    .withMessage("Invalid mobile number"),

  body("email").optional().isEmail().withMessage("Invalid email format"),

  body("address").optional(),

  body("city").optional(),

  body("state").optional(),

  body("pincode").optional(),

  body("openingBalance")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Opening balance must be a positive number"),


  body("gstNumber")
    .if((value, { req }) => req.body.customerType === "B2B")
    .notEmpty()
    .withMessage("GST number is required for B2B customers")
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage("Invalid GST number format"),

  body("remarks").optional(),
]);
