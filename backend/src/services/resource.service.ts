import { db } from '../config/database';
import { randomUUID } from 'crypto';

export interface Resource {
  id: string;
  name: string;
  type: 'DESK' | 'MEETING_ROOM' | 'EQUIPMENT';
  capacity: number;
  location: string;
  description?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class ResourceService {
  /**
   * List resources with optional type filter and search term
   */
  getAll(filters?: { type?: string; search?: string; onlyActive?: boolean }): Resource[] {
    let sql = 'SELECT * FROM resources WHERE 1=1';
    const params: any[] = [];

    if (filters?.onlyActive !== false) {
      sql += ' AND is_active = 1';
    }

    if (filters?.type && ['DESK', 'MEETING_ROOM', 'EQUIPMENT'].includes(filters.type.toUpperCase())) {
      sql += ' AND type = ?';
      params.push(filters.type.toUpperCase());
    }

    if (filters?.search && filters.search.trim()) {
      sql += ' AND (name LIKE ? OR location LIKE ? OR description LIKE ?)';
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY type ASC, name ASC';
    const stmt = db.prepare(sql);
    return stmt.all(...params) as Resource[];
  }

  /**
   * Retrieve resource by ID
   */
  getById(id: string): Resource | undefined {
    const stmt = db.prepare('SELECT * FROM resources WHERE id = ?');
    return stmt.get(id) as Resource | undefined;
  }

  /**
   * Create a new resource (Admin only)
   */
  create(data: {
    name: string;
    type: 'DESK' | 'MEETING_ROOM' | 'EQUIPMENT';
    capacity: number;
    location: string;
    description?: string;
  }): Resource {
    const id = `res_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO resources (id, name, type, capacity, location, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.type,
      data.capacity || 1,
      data.location,
      data.description || null,
      now,
      now
    );

    return this.getById(id)!;
  }

  /**
   * Update resource details or toggle active state (Admin only)
   */
  update(
    id: string,
    data: Partial<{
      name: string;
      type: 'DESK' | 'MEETING_ROOM' | 'EQUIPMENT';
      capacity: number;
      location: string;
      description?: string;
      is_active: number;
    }>
  ): Resource {
    const existing = this.getById(id);
    if (!existing) {
      throw { statusCode: 404, message: 'Resource not found' };
    }

    const now = new Date().toISOString();
    const updated = { ...existing, ...data, updated_at: now };

    const stmt = db.prepare(`
      UPDATE resources
      SET name = ?, type = ?, capacity = ?, location = ?, description = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.type,
      updated.capacity,
      updated.location,
      updated.description || null,
      updated.is_active,
      now,
      id
    );

    return this.getById(id)!;
  }

  /**
   * Soft-delete / deactivate resource (Admin only)
   */
  deactivate(id: string): void {
    const existing = this.getById(id);
    if (!existing) {
      throw { statusCode: 404, message: 'Resource not found' };
    }

    const stmt = db.prepare('UPDATE resources SET is_active = 0, updated_at = ? WHERE id = ?');
    stmt.run(new Date().toISOString(), id);
  }
}

export const resourceService = new ResourceService();
