import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type UpdateTodoInput, type CreateTodoInput } from '../schema';
import { updateTodo } from '../handlers/update_todo';
import { eq } from 'drizzle-orm';

// Helper function to create a test todo
const createTestTodo = async (description: string = 'Test todo') => {
  const result = await db.insert(todosTable)
    .values({
      description,
      completed: false
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update todo completion status to true', async () => {
    // Create a test todo first
    const testTodo = await createTestTodo('Learn TypeScript');

    const input: UpdateTodoInput = {
      id: testTodo.id,
      completed: true
    };

    const result = await updateTodo(input);

    // Verify the returned todo
    expect(result.id).toEqual(testTodo.id);
    expect(result.description).toEqual('Learn TypeScript');
    expect(result.completed).toEqual(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at).toEqual(testTodo.created_at);
  });

  it('should update todo completion status to false', async () => {
    // Create a completed test todo
    const testTodo = await db.insert(todosTable)
      .values({
        description: 'Already completed task',
        completed: true
      })
      .returning()
      .execute();

    const input: UpdateTodoInput = {
      id: testTodo[0].id,
      completed: false
    };

    const result = await updateTodo(input);

    // Verify the returned todo
    expect(result.id).toEqual(testTodo[0].id);
    expect(result.description).toEqual('Already completed task');
    expect(result.completed).toEqual(false);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    // Create a test todo
    const testTodo = await createTestTodo('Database persistence test');

    const input: UpdateTodoInput = {
      id: testTodo.id,
      completed: true
    };

    await updateTodo(input);

    // Query the database to verify the change was persisted
    const updatedTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    expect(updatedTodos).toHaveLength(1);
    expect(updatedTodos[0].id).toEqual(testTodo.id);
    expect(updatedTodos[0].description).toEqual('Database persistence test');
    expect(updatedTodos[0].completed).toEqual(true);
    expect(updatedTodos[0].created_at).toEqual(testTodo.created_at);
  });

  it('should throw error when todo does not exist', async () => {
    const input: UpdateTodoInput = {
      id: 99999, // Non-existent ID
      completed: true
    };

    await expect(updateTodo(input)).rejects.toThrow(/Todo with id 99999 not found/i);
  });

  it('should not modify other todo properties', async () => {
    // Create a test todo
    const testTodo = await createTestTodo('Should not change description');
    const originalCreatedAt = testTodo.created_at;
    const originalDescription = testTodo.description;

    const input: UpdateTodoInput = {
      id: testTodo.id,
      completed: true
    };

    const result = await updateTodo(input);

    // Verify only completion status changed
    expect(result.description).toEqual(originalDescription);
    expect(result.created_at).toEqual(originalCreatedAt);
    expect(result.completed).toEqual(true);
  });

  it('should handle multiple updates correctly', async () => {
    // Create a test todo
    const testTodo = await createTestTodo('Multiple updates test');

    // First update: mark as completed
    await updateTodo({
      id: testTodo.id,
      completed: true
    });

    // Second update: mark as incomplete
    const finalResult = await updateTodo({
      id: testTodo.id,
      completed: false
    });

    // Verify final state
    expect(finalResult.completed).toEqual(false);
    expect(finalResult.description).toEqual('Multiple updates test');
    expect(finalResult.id).toEqual(testTodo.id);

    // Verify in database
    const dbTodo = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    expect(dbTodo[0].completed).toEqual(false);
  });
});