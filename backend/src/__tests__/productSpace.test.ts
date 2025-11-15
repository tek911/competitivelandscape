import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../index';
import prisma from '../config/database';

describe('Product Space API', () => {
  let authToken: string;
  let productSpaceId: string;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      });

    authToken = response.body.token;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
    await prisma.$disconnect();
  });

  it('should create a product space', async () => {
    const response = await request(app)
      .post('/api/v1/product-spaces')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Product Space',
        description: 'A test product space',
        industry: 'Technology',
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Test Product Space');
    productSpaceId = response.body.id;
  });

  it('should get all product spaces', async () => {
    const response = await request(app).get('/api/v1/product-spaces');

    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);
  });

  it('should get a specific product space', async () => {
    const response = await request(app).get(`/api/v1/product-spaces/${productSpaceId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(productSpaceId);
  });

  it('should update a product space', async () => {
    const response = await request(app)
      .put(`/api/v1/product-spaces/${productSpaceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Updated Product Space',
      });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated Product Space');
  });

  it('should delete a product space', async () => {
    const response = await request(app)
      .delete(`/api/v1/product-spaces/${productSpaceId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(204);
  });
});
