'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface PlanningTask {
  id: string;
  name: string;
  description: string | null;
  start_month: number;
  end_month: number;
  year: number;
  color: string;
  position: number;
  status: 'pending' | 'done';
  created_at: string;
  updated_at: string | null;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TASK_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Orange', value: '#F97316' },
];

export default function PlanningPage() {
  const router = useRouter();

  // Auth & Loading
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Theme
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Data
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);

  // Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form
  const [newTask, setNewTask] = useState<{
    name: string;
    description: string;
    start_month: number;
    end_month: number;
    color: string;
    status: 'pending' | 'done';
  }>({
    name: '',
    description: '',
    start_month: 1,
    end_month: 1,
    color: TASK_COLORS[0].value,
    status: 'pending',
  });

  // Drag & Drop
  const [draggedTask, setDraggedTask] = useState<PlanningTask | null>(null);
  const [dragOverMonth, setDragOverMonth] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
    const savedTheme = localStorage.getItem('planningTheme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated, selectedYear]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/admin/login');
      return;
    }

    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('planningTheme', newTheme ? 'dark' : 'light');
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('planning_tasks')
        .select('*')
        .eq('year', selectedYear)
        .order('position', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTask.name.trim()) {
      alert('Task name is required');
      return;
    }

    if (newTask.end_month < newTask.start_month) {
      alert('End month must be equal or after start month');
      return;
    }

    try {
      const maxPosition = tasks.reduce((max, t) => Math.max(max, t.position), 0);

      const { error } = await supabase
        .from('planning_tasks')
        .insert([{
          name: newTask.name,
          description: newTask.description || null,
          start_month: newTask.start_month,
          end_month: newTask.end_month,
          year: selectedYear,
          color: newTask.color,
          status: newTask.status,
          position: maxPosition + 1,
        }]);

      if (error) throw error;

      resetForm();
      setIsTaskModalOpen(false);
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingTaskId) return;

    if (newTask.end_month < newTask.start_month) {
      alert('End month must be equal or after start month');
      return;
    }

    try {
      const { error } = await supabase
        .from('planning_tasks')
        .update({
          name: newTask.name,
          description: newTask.description || null,
          start_month: newTask.start_month,
          end_month: newTask.end_month,
          color: newTask.color,
          status: newTask.status,
        })
        .eq('id', editingTaskId);

      if (error) throw error;

      resetForm();
      setIsTaskModalOpen(false);
      setIsEditing(false);
      setEditingTaskId(null);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('planning_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setIsTaskModalOpen(false);
      setIsEditing(false);
      setEditingTaskId(null);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const handleToggleStatus = async (task: PlanningTask, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const newStatus = task.status === 'done' ? 'pending' : 'done';
      const { error } = await supabase
        .from('planning_tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleEditTask = (task: PlanningTask) => {
    setNewTask({
      name: task.name,
      description: task.description || '',
      start_month: task.start_month,
      end_month: task.end_month,
      color: task.color,
      status: task.status,
    });
    setEditingTaskId(task.id);
    setIsEditing(true);
    setIsTaskModalOpen(true);
  };

  const resetForm = () => {
    setNewTask({
      name: '',
      description: '',
      start_month: 1,
      end_month: 1,
      color: TASK_COLORS[0].value,
      status: 'pending',
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, task: PlanningTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);

    if (e.currentTarget instanceof HTMLElement) {
      setTimeout(() => {
        e.currentTarget.style.opacity = '0.5';
      }, 0);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTask(null);
    setDragOverMonth(null);

    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, monthIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverMonth(monthIndex);
  };

  const handleDragLeave = () => {
    setDragOverMonth(null);
  };

  const handleDrop = async (e: React.DragEvent, targetMonth: number) => {
    e.preventDefault();
    setDragOverMonth(null);

    if (!draggedTask) return;

    const taskSpan = draggedTask.end_month - draggedTask.start_month;
    const newStartMonth = targetMonth;
    const newEndMonth = Math.min(targetMonth + taskSpan, 12);

    try {
      const { error } = await supabase
        .from('planning_tasks')
        .update({
          start_month: newStartMonth,
          end_month: newEndMonth,
        })
        .eq('id', draggedTask.id);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error moving task:', error);
      alert('Failed to move task');
    }

    setDraggedTask(null);
  };

  // Group tasks into rows to avoid overlapping
  const getTaskRows = () => {
    const rows: PlanningTask[][] = [];

    [...tasks]
      .sort((a, b) => a.position - b.position)
      .forEach(task => {
        let placed = false;
        for (const row of rows) {
          const hasOverlap = row.some(existingTask =>
            !(task.end_month < existingTask.start_month ||
              task.start_month > existingTask.end_month)
          );

          if (!hasOverlap) {
            row.push(task);
            placed = true;
            break;
          }
        }

        if (!placed) {
          rows.push([task]);
        }
      });

    return rows;
  };

  if (isLoading || !isAuthenticated) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>Loading...</p>
      </main>
    );
  }

  const taskRows = getTaskRows();

  return (
    <main className={`min-h-screen py-4 sm:py-8 px-3 sm:px-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              Wedding Planning
            </h1>
            <p className={`mt-1 text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Plan and track your wedding tasks
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Year Selector */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedYear(y => y - 1)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className={`px-3 py-1 text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear(y => y + 1)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => {
                resetForm();
                setIsEditing(false);
                setEditingTaskId(null);
                setIsTaskModalOpen(true);
              }}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-blue-600 text-blue-400 hover:bg-blue-900/30' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Task</span>
            </button>

            <button
              onClick={toggleTheme}
              className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border-2 border-yellow-500 text-yellow-500 rounded-lg hover:bg-yellow-500/10 transition-colors"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>

            <button
              onClick={() => router.push('/admin')}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <button
              onClick={handleLogout}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={`rounded-lg shadow-md border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Month Headers */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-12">
                {MONTHS.map((month, index) => (
                  <div
                    key={month}
                    className={`p-2 sm:p-3 text-center text-xs sm:text-sm font-medium border-b border-r last:border-r-0 ${isDarkMode ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                  >
                    <span className="hidden sm:inline">{MONTHS_FULL[index]}</span>
                    <span className="sm:hidden">{month}</span>
                  </div>
                ))}
              </div>

              {/* Drop Zone Grid */}
              <div className="relative">
                {/* Drop zones layer */}
                <div className="grid grid-cols-12 absolute inset-0 z-0">
                  {MONTHS.map((_, index) => (
                    <div
                      key={index}
                      onDragOver={(e) => handleDragOver(e, index + 1)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index + 1)}
                      className={`border-r last:border-r-0 min-h-[200px] transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${dragOverMonth === index + 1 ? (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100') : ''}`}
                    />
                  ))}
                </div>

                {/* Tasks layer */}
                <div className="relative z-10 p-2 sm:p-4 min-h-[200px]">
                  {taskRows.length === 0 ? (
                    <div className={`flex items-center justify-center h-[150px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <p>No tasks yet. Click "Add Task" to create your first task.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {taskRows.map((row, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-12 gap-1">
                          {row.map(task => (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleEditTask(task)}
                              className={`rounded-lg px-2 sm:px-3 py-2 cursor-move transition-all hover:scale-[1.02] hover:shadow-lg ${task.status === 'done' ? 'opacity-60' : ''}`}
                              style={{
                                gridColumnStart: task.start_month,
                                gridColumnEnd: task.end_month + 1,
                                backgroundColor: task.color,
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => handleToggleStatus(task, e)}
                                  className={`flex-shrink-0 w-4 h-4 rounded border-2 border-white/50 flex items-center justify-center ${task.status === 'done' ? 'bg-white/30' : ''}`}
                                >
                                  {task.status === 'done' && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <span className={`text-white text-xs sm:text-sm font-medium truncate ${task.status === 'done' ? 'line-through' : ''}`}>
                                  {task.name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className={`mt-4 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-wrap items-center gap-4">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tips:</span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Drag tasks to move them between months
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Click on a task to edit
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Click the checkbox to mark as done
            </span>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }}>
          <div className={`rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              {isEditing ? 'Edit Task' : 'Add New Task'}
            </h2>
            <form onSubmit={isEditing ? handleUpdateTask : handleCreateTask} className="space-y-4">
              {/* Task Name */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Task Name *
                </label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  placeholder="e.g., Book wedding venue"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  placeholder="Optional notes about this task"
                />
              </div>

              {/* Month Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Start Month *
                  </label>
                  <select
                    value={newTask.start_month}
                    onChange={(e) => setNewTask({ ...newTask, start_month: parseInt(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  >
                    {MONTHS_FULL.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    End Month *
                  </label>
                  <select
                    value={newTask.end_month}
                    onChange={(e) => setNewTask({ ...newTask, end_month: parseInt(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  >
                    {MONTHS_FULL.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {TASK_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewTask({ ...newTask, color: color.value })}
                      className={`w-8 h-8 rounded-full transition-all ${newTask.color === color.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Status */}
              {isEditing && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value as 'pending' | 'done' })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => editingTaskId && handleDeleteTask(editingTaskId)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsTaskModalOpen(false);
                    setIsEditing(false);
                    setEditingTaskId(null);
                    resetForm();
                  }}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditing ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
