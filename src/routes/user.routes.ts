import { Router } from "express";
import { createUser, deleteUser, getUserById, listUsers, updateUser } from "../controllers/user.controller";
import { validate } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import {
  createUserSchema,
  idParamSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from "../validators/user.validators";

const router = Router();

// Applied once for the whole router instead of per-route — every /users/*
// endpoint requires a valid Bearer token.
router.use(requireAuth);

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a user profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               age: { type: integer }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation error }
 *       401: { description: Missing or invalid token }
 *       409: { description: Email already in use }
 */
router.post("/", validate({ body: createUserSchema }), createUser);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List user profiles (paginated, optional age filter)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Capped server-side at 100 regardless of what's requested.
 *       - in: query
 *         name: age
 *         schema: { type: integer }
 *     responses:
 *       200: { description: A page of users }
 *       401: { description: Missing or invalid token }
 */
router.get("/", validate({ query: listUsersQuerySchema }), listUsers);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a user profile by id
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The user }
 *       400: { description: Malformed id }
 *       401: { description: Missing or invalid token }
 *       404: { description: Not found }
 */
router.get("/:id", validate({ params: idParamSchema }), getUserById);

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update a user profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               age: { type: integer }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Validation error or empty body }
 *       401: { description: Missing or invalid token }
 *       404: { description: Not found }
 *       409: { description: Email already in use }
 */
router.put("/:id", validate({ params: idParamSchema, body: updateUserSchema }), updateUser);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       401: { description: Missing or invalid token }
 *       404: { description: Not found }
 */
router.delete("/:id", validate({ params: idParamSchema }), deleteUser);

export default router;
