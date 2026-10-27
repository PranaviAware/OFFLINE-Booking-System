import { Router } from 'express';
import { z } from 'zod';
import { resourceService } from '../services/resource.service';
import { authenticateJWT } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

export const resourceRouter = Router();

const createResourceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['DESK', 'MEETING_ROOM', 'EQUIPMENT']),
  capacity: z.number().int().min(1).default(1),
  location: z.string().min(2, 'Location is required'),
  description: z.string().optional()
});

const updateResourceSchema = createResourceSchema.partial().extend({
  is_active: z.number().int().min(0).max(1).optional()
});

/**
 * GET /api/v1/resources
 * Query parameters: type (DESK, MEETING_ROOM, EQUIPMENT), search (string)
 */
resourceRouter.get('/', (req, res, next) => {
  try {
    const { type, search, all } = req.query;
    const resources = resourceService.getAll({
      type: type as string,
      search: search as string,
      onlyActive: all === 'true' ? false : true
    });
    res.json({ count: resources.length, data: resources });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/resources/:id
 */
resourceRouter.get('/:id', (req, res, next) => {
  try {
    const resource = resourceService.getById(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'NotFound', message: 'Resource not found' });
    }
    res.json(resource);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/resources
 * Admin only: Create a new resource
 */
resourceRouter.post('/', authenticateJWT, requireAdmin, (req, res, next) => {
  try {
    const validated = createResourceSchema.parse(req.body);
    const created = resourceService.create(validated);
    res.status(201).json({
      message: 'Resource created successfully',
      data: created
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/resources/:id
 * Admin only: Update resource details
 */
resourceRouter.put('/:id', authenticateJWT, requireAdmin, (req, res, next) => {
  try {
    const validated = updateResourceSchema.parse(req.body);
    const updated = resourceService.update(req.params.id, validated);
    res.json({
      message: 'Resource updated successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/resources/:id
 * Admin only: Soft-deactivate resource
 */
resourceRouter.delete('/:id', authenticateJWT, requireAdmin, (req, res, next) => {
  try {
    resourceService.deactivate(req.params.id);
    res.json({ message: 'Resource deactivated successfully' });
  } catch (err) {
    next(err);
  }
});
