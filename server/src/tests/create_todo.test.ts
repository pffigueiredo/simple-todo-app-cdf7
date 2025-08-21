import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type CreateTodoInput } from '../schema';
import { createTodo } from '../handlers/create_todo';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateTodoInput = {
  description: 'Test todo item'
};

describe('createTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a todo', async () => {
    const result = await createTodo(testInput);

    // Basic field validation
    expect(result.description).toEqual('Test todo item');
    expect(result.completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save todo to database', async () => {
    const result = await createTodo(testInput);

    // Query using proper drizzle syntax
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].description).toEqual('Test todo item');
    expect(todos[0].completed).toEqual(false);
    expect(todos[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple todos with different descriptions', async () => {
    const firstTodo = await createTodo({ description: 'First todo' });
    const secondTodo = await createTodo({ description: 'Second todo' });

    // Verify different IDs
    expect(firstTodo.id).not.toEqual(secondTodo.id);
    expect(firstTodo.description).toEqual('First todo');
    expect(secondTodo.description).toEqual('Second todo');

    // Verify both are saved in database
    const allTodos = await db.select()
      .from(todosTable)
      .execute();

    expect(allTodos).toHaveLength(2);
    
    const descriptions = allTodos.map(todo => todo.description);
    expect(descriptions).toContain('First todo');
    expect(descriptions).toContain('Second todo');
  });

  it('should set completed to false by default', async () => {
    const result = await createTodo(testInput);

    expect(result.completed).toEqual(false);

    // Verify in database
    const savedTodo = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(savedTodo[0].completed).toEqual(false);
  });

  it('should handle long descriptions', async () => {
    const longDescription = 'This is a very long todo description that contains many words and should still be handled correctly by the database and the handler function';
    
    const result = await createTodo({ description: longDescription });

    expect(result.description).toEqual(longDescription);

    // Verify in database
    const savedTodo = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(savedTodo[0].description).toEqual(longDescription);
  });
});