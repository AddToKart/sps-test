'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import type { Ticket } from '@/types/ticket';

export default function StudentSupport() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState('');

  // Real-time tickets listener
  useEffect(() => {
    if (!user) return;

    const ticketsQuery = query(
      collection(db, 'tickets'),
      where('studentId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      setTickets(ticketData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time selected ticket listener
  useEffect(() => {
    if (!selectedTicket) return;

    const ticketRef = doc(db, 'tickets', selectedTicket.id);
    const unsubscribe = onSnapshot(ticketRef, (doc) => {
      if (doc.exists()) {
        setSelectedTicket({ id: doc.id, ...doc.data() } as Ticket);
      }
    });

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'tickets'), {
        studentId: user.uid,
        studentName: user.displayName || user.email,
        subject: newTicket.subject,
        description: newTicket.description,
        priority: newTicket.priority,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        responses: []
      });

      setNewTicket({
        subject: '',
        description: '',
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const addResponse = async (ticketId: string) => {
    if (!response.trim() || !user) return;

    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        responses: [
          ...(selectedTicket?.responses || []),
          {
            id: Date.now().toString(),
            message: response,
            createdAt: new Date(),
            userId: user.uid,
            userType: 'student',
            userName: user.displayName || user.email || 'Student'
          }
        ],
        updatedAt: new Date()
      });

      setResponse('');
    } catch (error) {
      console.error('Error adding response:', error);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Tickets List & Create Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* Create Ticket Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Create New Ticket</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 transition-colors"
              >
                Submit Ticket
              </button>
            </form>
          </div>

          {/* Tickets List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Your Tickets</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[calc(100vh-600px)] overflow-y-auto">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-50
                    ${selectedTicket?.id === ticket.id ? 'bg-blue-50 border-l-4 border-[#4FB3E8]' : ''}`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full
                        ${ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                          ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'}`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">
                        {new Date(ticket.createdAt.seconds * 1000).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full
                        ${ticket.status === 'open' ? 'bg-green-100 text-green-800' :
                          ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'}`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Ticket Details */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedTicket.subject}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Created on {new Date(selectedTicket.createdAt.seconds * 1000).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-sm rounded-full
                    ${selectedTicket.status === 'open' ? 'bg-green-100 text-green-800' :
                      selectedTicket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'}`}
                  >
                    {selectedTicket.status}
                  </span>
                </div>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-md">{selectedTicket.description}</p>
              </div>

              <div className="p-4">
                <h3 className="text-base font-medium text-gray-900 mb-3">Responses</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto mb-3">
                  {selectedTicket.responses?.map((response) => (
                    <div
                      key={response.id}
                      className={`flex ${
                        response.userType === 'admin' 
                          ? 'justify-start' 
                          : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-2 ${
                          response.userType === 'admin'
                            ? 'bg-blue-50 rounded-tl-none' 
                            : 'bg-gray-50 rounded-tr-none'
                        }`}
                      >
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span className="font-medium">{response.userName}</span>
                          <span className="ml-4">{new Date(response.createdAt.seconds * 1000).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-700">{response.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTicket.status !== 'closed' ? (
                  <div className="border-t pt-3">
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Type your response..."
                      rows={2}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8] mb-2 text-sm"
                    />
                    <button
                      onClick={() => addResponse(selectedTicket.id)}
                      className="w-full px-3 py-1.5 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 transition-colors text-sm"
                    >
                      Send Response
                    </button>
                  </div>
                ) : (
                  <div className="border-t pt-3">
                    <div className="bg-gray-50 rounded-md p-3 text-center text-gray-500">
                      <svg 
                        className="w-5 h-5 mx-auto mb-1"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M12 15v2m0 0v2m0-2h2m-2 0H8m4-6V4" 
                        />
                      </svg>
                      <p className="text-sm">This ticket has been closed. You cannot add new responses.</p>
                      <p className="text-xs mt-1 text-gray-400">
                        If you need further assistance, please create a new ticket.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center text-gray-500 h-[calc(100vh-250px)]">
              <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
              </svg>
              <p className="text-lg">Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 