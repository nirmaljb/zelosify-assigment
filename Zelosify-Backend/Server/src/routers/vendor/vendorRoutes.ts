import express from "express";
import vendorRequestRoutes from "./vendorRequestRoutes.js";
import contractHiringVendorRouter from "../../modules/contractHiring/vendor/router.js";

const router = express.Router();

/**
 * @route /vendor/requests
 * Existing vendor resource request routes (off-limits for this module)
 */
router.use("/requests", vendorRequestRoutes);

/**
 * @route /vendor/openings, /vendor/profiles
 * Contract hiring module - vendor routes
 */
router.use("/", contractHiringVendorRouter);

export default router;
