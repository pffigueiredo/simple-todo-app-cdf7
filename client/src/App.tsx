import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, CheckCircle2, Circle } from 'lucide-react';
// Using type-only import for better TypeScript compliance
import type { Todo, CreateTodoInput } from '../../server/src/schema';

function App() {
  // Explicit typing with Todo interface
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state for new todo
  const [newTodoDescription, setNewTodoDescription] = useState<string>('');

  // useCallback to memoize function used in useEffect
  const loadTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getTodos.query();
      setTodos(result);
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps since trpc is stable

  // useEffect with proper dependencies
  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoDescription.trim()) return;
    
    setIsCreating(true);
    try {
      const input: CreateTodoInput = { description: newTodoDescription.trim() };
      const newTodo = await trpc.createTodo.mutate(input);
      // Update todos list with explicit typing in setState callback
      setTodos((prev: Todo[]) => [...prev, newTodo]);
      // Reset form
      setNewTodoDescription('');
    } catch (error) {
      console.error('Failed to create todo:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    try {
      const updatedTodo = await trpc.updateTodo.mutate({
        id: todo.id,
        completed: !todo.completed
      });
      // Update the specific todo in the list
      setTodos((prev: Todo[]) =>
        prev.map((t) => (t.id === todo.id ? updatedTodo : t))
      );
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    try {
      const result = await trpc.deleteTodo.mutate({ id: todoId });
      if (result.success) {
        // Remove the todo from the list
        setTodos((prev: Todo[]) => prev.filter((t) => t.id !== todoId));
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ✅ Todo App
          </h1>
          <p className="text-gray-600">Stay organized and get things done!</p>
        </div>

        {/* Add Todo Form */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5" />
              Add New Todo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTodo} className="flex gap-3">
              <Input
                placeholder="What needs to be done? 🤔"
                value={newTodoDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewTodoDescription(e.target.value)
                }
                className="flex-1"
                disabled={isCreating}
              />
              <Button type="submit" disabled={isCreating || !newTodoDescription.trim()}>
                {isCreating ? 'Adding...' : 'Add Todo'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Progress Stats */}
        {totalCount > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardDescription className="text-sm text-gray-600">
                    Progress
                  </CardDescription>
                  <div className="text-2xl font-bold text-gray-800">
                    {completedCount} of {totalCount} completed
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={completedCount === totalCount ? "default" : "secondary"} className="text-lg px-3 py-1">
                    {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Todo List */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your Todos</span>
              {isLoading && <span className="text-sm text-gray-500">Loading...</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {todos.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-gray-500 text-lg">No todos yet!</p>
                <p className="text-gray-400">Add one above to get started.</p>
              </div>
            ) : (
              <div className="divide-y">
                {todos.map((todo: Todo, index: number) => (
                  <div
                    key={todo.id}
                    className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                      todo.completed ? 'opacity-75' : ''
                    }`}
                  >
                    <button
                      onClick={() => handleToggleComplete(todo)}
                      className={`flex-shrink-0 transition-colors ${
                        todo.completed
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-gray-400 hover:text-green-500'
                      }`}
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-lg transition-all ${
                          todo.completed
                            ? 'line-through text-gray-500'
                            : 'text-gray-800'
                        }`}
                      >
                        {todo.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Created: {todo.created_at.toLocaleDateString()} at{' '}
                        {todo.created_at.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {todo.completed && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          ✓ Done
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Made with ❤️ using React & tRPC</p>
        </div>
      </div>
    </div>
  );
}

export default App;