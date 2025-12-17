import { Video, Circle } from 'lucide-react';
import { User } from '../lib/supabase';

interface UserListProps {
  users: User[];
  onCallUser: (user: User) => void;
}

export function UserList({ users, onCallUser }: UserListProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Online Users</h2>
      {users.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No users online</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  {user.is_online && (
                    <Circle
                      className="absolute -bottom-1 -right-1 fill-green-500 text-green-500"
                      size={12}
                    />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{user.username}</p>
                  <p className="text-sm text-gray-500">
                    {user.is_online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onCallUser(user)}
                disabled={!user.is_online}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Video size={18} />
                Call
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
