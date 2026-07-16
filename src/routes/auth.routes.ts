import { Router } from "express";
import { login } from "../controllers/auth.controller";
import { validate } from "../middleware/validate.middleware";
import { authLimiter } from "../middleware/rateLimiter.middleware";
import { loginSchema } from "../validators/auth.validators";

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Obtain a JWT for the CRUD endpoints
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login succeeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 expiresIn: { type: string, example: "1h" }
 *       400: { description: Invalid request body }
 *       401: { description: Invalid credentials }
 *       429: { description: Too many login attempts }
 */
router.post("/login", authLimiter, validate({ body: loginSchema }), login);

export default router;
