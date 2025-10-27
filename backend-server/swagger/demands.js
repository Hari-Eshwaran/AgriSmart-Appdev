/**
 * @swagger
 * /api/demands:
 *   post:
 *     tags:
 *       - Demands
 *     summary: Create a demand (buyers only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commodity
 *               - quantity
 *             properties:
 *               commodity:
 *                 type: string
 *                 example: "tomato"
 *               quantity:
 *                 type: number
 *                 example: 2000
 *               unit:
 *                 type: string
 *                 example: "kg"
 *               location:
 *                 type: object
 *               desiredBy:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Demand created
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation failed
 *
 *   get:
 *     tags:
 *       - Demands
 *     summary: List demands (role-aware)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Demands list
 *
 * /api/demands/{id}:
 *   get:
 *     tags:
 *       - Demands
 *     summary: Get a demand by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Demand
 *       404:
 *         description: Not found
 *
 *   put:
 *     tags:
 *       - Demands
 *     summary: Update a demand (buyer owner while open)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commodity:
 *                 type: string
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Demand updated
 *
 *   delete:
 *     tags:
 *       - Demands
 *     summary: Cancel a demand (buyer)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Demand cancelled
 *
 * /api/demands/{id}/respond:
 *   post:
 *     tags:
 *       - Demands
 *     summary: Farmer responds to a demand (accept/reject)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: ["accept","reject"]
 *               priceOffer:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Demand responded to
 */
