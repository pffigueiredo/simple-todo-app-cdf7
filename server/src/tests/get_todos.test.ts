import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { getTodos } from '../handlers/get_todos';

describe('getTodos', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no todos exist', async () => {
    const result = await getTodos();

    expect(result).toEqual([]);
  });

  it('should return all todos from database', async () => {
    // Create test todos directly in database
    await db.insert(todosTable)
      .values([
        { description: 'First todo', completed: false },
        { description: 'Second todo', completed: true },
        { description: 'Third todo', completed: false }
      ])
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(3);
    expect(result[0].description).toEqual('First todo');
    expect(result[0].completed).toEqual(false);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].description).toEqual('Second todo');
    expect(result[1].completed).toEqual(true);

    expect(result[2].description).toEqual('Third todo');
    expect(result[2].completed).toEqual(false);
  });

  it('should return todos ordered by creation date', async () => {
    // Create todos with slight delay to ensure different timestamps
    await db.insert(todosTable)
      .values({ description: 'Oldest todo', completed: false })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(todosTable)
      .values({ description: 'Newest todo', completed: true })
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(2);
    expect(result[0].description).toEqual('Oldest todo');
    expect(result[1].description).toEqual('Newest todo');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });

  it('should return todos with all required fields', async () => {
    await db.insert(todosTable)
      .values({ description: 'Test todo with all fields', completed: true })
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(1);
    const todo = result[0];

    // Verify all required fields are present
    expect(todo.id).toBeDefined();
    expect(typeof todo.id).toBe('number');
    expect(todo.description).toEqual('Test todo with all fields');
    expect(typeof todo.description).toBe('string');
    expect(todo.completed).toEqual(true);
    expect(typeof todo.completed).toBe('boolean');
    expect(todo.created_at).toBeInstanceOf(Date);
  });

  it('should handle mixed completion statuses', async () => {
    await db.insert(todosTable)
      .values([
        { description: 'Completed todo', completed: true },
        { description: 'Incomplete todo', completed: false },
        { description: 'Another completed todo', completed: true }
      ])
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(3);
    
    const completedTodos = result.filter(todo => todo.completed);
    const incompleteTodos = result.filter(todo => !todo.completed);
    
    expect(completedTodos).toHaveLength(2);
    expect(incompleteTodos).toHaveLength(1);
    expect(incompleteTodos[0].description).toEqual('Incomplete todo');
  });
});