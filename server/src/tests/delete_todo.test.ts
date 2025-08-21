import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type DeleteTodoInput } from '../schema';
import { deleteTodo } from '../handlers/delete_todo';
import { eq } from 'drizzle-orm';

describe('deleteTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing todo', async () => {
    // Create a test todo first
    const result = await db.insert(todosTable)
      .values({
        description: 'Test todo to delete',
        completed: false
      })
      .returning()
      .execute();

    const createdTodo = result[0];

    const deleteInput: DeleteTodoInput = {
      id: createdTodo.id
    };

    // Delete the todo
    const deleteResult = await deleteTodo(deleteInput);

    // Verify deletion was successful
    expect(deleteResult.success).toBe(true);

    // Verify todo no longer exists in database
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, createdTodo.id))
      .execute();

    expect(todos).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent todo', async () => {
    const deleteInput: DeleteTodoInput = {
      id: 999 // Non-existent ID
    };

    const result = await deleteTodo(deleteInput);

    // Should return success: false when no rows were affected
    expect(result.success).toBe(false);
  });

  it('should not affect other todos when deleting one', async () => {
    // Create multiple test todos
    const insertResult = await db.insert(todosTable)
      .values([
        { description: 'Todo 1', completed: false },
        { description: 'Todo 2', completed: true },
        { description: 'Todo 3', completed: false }
      ])
      .returning()
      .execute();

    const [todo1, todo2, todo3] = insertResult;

    const deleteInput: DeleteTodoInput = {
      id: todo2.id
    };

    // Delete the middle todo
    const deleteResult = await deleteTodo(deleteInput);
    expect(deleteResult.success).toBe(true);

    // Verify only the target todo was deleted
    const remainingTodos = await db.select()
      .from(todosTable)
      .execute();

    expect(remainingTodos).toHaveLength(2);
    
    const remainingIds = remainingTodos.map(todo => todo.id);
    expect(remainingIds).toContain(todo1.id);
    expect(remainingIds).toContain(todo3.id);
    expect(remainingIds).not.toContain(todo2.id);
  });

  it('should handle completed and uncompleted todos equally', async () => {
    // Create one completed and one uncompleted todo
    const insertResult = await db.insert(todosTable)
      .values([
        { description: 'Completed todo', completed: true },
        { description: 'Uncompleted todo', completed: false }
      ])
      .returning()
      .execute();

    const [completedTodo, uncompletedTodo] = insertResult;

    // Delete the completed todo
    const deleteCompletedInput: DeleteTodoInput = {
      id: completedTodo.id
    };

    const result1 = await deleteTodo(deleteCompletedInput);
    expect(result1.success).toBe(true);

    // Delete the uncompleted todo
    const deleteUncompletedInput: DeleteTodoInput = {
      id: uncompletedTodo.id
    };

    const result2 = await deleteTodo(deleteUncompletedInput);
    expect(result2.success).toBe(true);

    // Verify both todos were deleted
    const remainingTodos = await db.select()
      .from(todosTable)
      .execute();

    expect(remainingTodos).toHaveLength(0);
  });
});