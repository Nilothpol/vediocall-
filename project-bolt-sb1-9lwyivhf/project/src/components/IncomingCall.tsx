import { Phone, PhoneOff } from 'lucide-react';

interface IncomingCallProps {
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCall({ callerName, onAccept, onReject }: IncomingCallProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-4xl text-white font-bold">
              {callerName.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Incoming Call
          </h2>
          <p className="text-gray-600 mb-8">{callerName} is calling you</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={onReject}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <PhoneOff size={20} />
              Decline
            </button>
            <button
              onClick={onAccept}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
            >
              <Phone size={20} />
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
