'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import type { Ticket } from '@/types/ticket';

export default function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [response, setResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ticketsQuery = query(
      collection(db, 'tickets'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      setTickets(ticketData);
      
      if (selectedTicket) {
        const updatedSelectedTicket = ticketData.find(t => t.id === selectedTicket.id);
        if (updatedSelectedTicket) {
          setSelectedTicket(updatedSelectedTicket);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedTicket?.id]);

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

  const updateTicketStatus = async (ticketId: string, status: Ticket['status']) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        status,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const addResponse = async (ticketId: string) => {
    if (!response.trim()) return;

    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        responses: [
          ...(selectedTicket?.responses || []),
          {
            id: Date.now().toString(),
            message: response,
            createdAt: new Date(),
            userId: 'admin',
            userType: 'admin',
            userName: 'Admin'
          }
        ],
        status: 'in_progress',
        updatedAt: new Date()
      });

      setResponse('');
    } catch (error) {
      console.error('Error adding response:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.responses]);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List - Takes 1/3 of the space */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">All Tickets</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[calc(100vh-250px)] overflow-y-auto">
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
                      <span className="text-gray-500">{ticket.studentName}</span>
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

        {/* Ticket Details - Takes 2/3 of the space */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedTicket.subject}</h2>
                    <p className="text-sm text-gray-500 mt-1">Submitted by {selectedTicket.studentName}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')}
                      className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                      className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
                    >
                      Resolved
                    </button>
                    <button
                      onClick={() => updateTicketStatus(selectedTicket.id, 'closed')}
                      className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-md">{selectedTicket.description}</p>
              </div>

              <div className="p-4">
                <h3 className="text-base font-medium text-gray-900 mb-3">Responses</h3>
                <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto mb-3 pr-4">
                  {selectedTicket.responses?.map((response) => (
                    <div key={response.id} className={`flex ${
                      response.userType === 'admin' 
                        ? 'justify-end'
                        : 'justify-start'
                    }`}>
                      <div className="max-w-[75%]">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{response.userName}</span>
                          <span className="ml-4">{new Date(response.createdAt.seconds * 1000).toLocaleString()}</span>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          response.userType === 'admin' 
                            ? 'bg-[#4FB3E8] text-white rounded-tr-none'
                            : 'bg-gray-50 rounded-tl-none'
                        }`}>
                          <p className="text-sm">{response.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

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