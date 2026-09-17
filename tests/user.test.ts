import request from 'supertest';
import app from '@/app';
import { signToken } from '../src/utils/token'; // Or '@/utils/token'

describe('GET /api/users - Role Guard Verification', () => {
  const standardUserToken = signToken({ id: '00000000-0000-0000-0000-000000000001', role: 'User' });
  const adminUserToken = signToken({ id: '00000000-0000-0000-0000-000000000002', role: 'Admin' });

  it('should return 401 Unauthorized when no token is provided', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('should return 403 Forbidden when accessed by a standard user', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${standardUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty(
      'error',
      expect.stringMatching(/forbidden|you do not have permission/i)
    );
  });

  it('should return 200 OK when accessed by an admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminUserToken}`);

    expect(res.status).toBe(200);
  });
});