import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const API = import.meta.env.VITE_API_URL || "https://orbit-i5ur.onrender.com";
    const [threads, setThreads] = useState([]);
    const [currentThread, setCurrentThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load threads on mount (if user is logged in, triggered by component using it)
    // But we need to handle auth token availability.
    // We'll export a load function or rely on calls.

    useEffect(() => {
        const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
        if (token) loadThreads();
    }, []);

    const loadThreads = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
            if (!token) return;
            const res = await axios.get(`${API}/threads`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setThreads(res.data);
        } catch (error) {
            console.error("Failed to load threads", error);
        }
    };

    const loadThread = async (threadId) => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
            const res = await axios.get(`${API}/threads/${threadId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data);
            const thread = threads.find(t => t.threadId === threadId);
            setCurrentThread(thread);
        } catch (error) {
            console.error("Failed to load messages", error);
            alert("Failed to load chat: " + (error.response?.data?.message || error.message));
        }
    };

    const createNewThread = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
            const res = await axios.post(`${API}/threads`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const newThread = res.data;
            setThreads(prev => [newThread, ...prev]);
            setCurrentThread(newThread);
            setMessages([]);
        } catch (error) {
            console.error("Failed to create thread", error);
            alert("Failed to create thread: " + (error.response?.data?.message || error.message));
        }
    };

    const deleteThread = async (threadId) => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
            await axios.delete(`${API}/threads/${threadId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setThreads(prev => prev.filter(t => t.threadId !== threadId));
            if (currentThread?.threadId === threadId) {
                setCurrentThread(null);
                setMessages([]);
            }
        } catch (error) {
            console.error("Failed to delete thread", error);
        }
    };

    const shareThread = async (threadId) => {
        try {
            const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
            const res = await axios.post(`${API}/threads/${threadId}/share`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data.shareUrl;
        } catch (error) {
            console.error("Failed to share thread", error);
            alert("Failed to share");
        }
    };

    const sendMessage = async (content) => {
        if (!currentThread) return;

        // Optimistic UI update
        const tempUserMsg = { _id: Date.now(), role: 'user', content };
        setMessages(prev => [...prev, tempUserMsg]);
        setIsLoading(true);

        try {
            const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
            const res = await axios.post(`${API}/chat`, {
                threadId: currentThread.threadId,
                message: content
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const aiMsg = res.data.aiMessage;
            setMessages(prev => [...prev, aiMsg]);

            // Update thread list to reflect new title if changed
            loadThreads();
        } catch (error) {
            console.error("Chat failed", error);
            let errorText = "Error: Could not get response.";
            if (error.response && error.response.data && error.response.data.details) {
                errorText = "API Error: " + (error.response.data.error || error.message);
            }
            setMessages(prev => [...prev, { _id: Date.now() + 1, role: 'assistant', content: errorText }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ChatContext.Provider value={{
            threads,
            messages,
            currentThread,
            loadThread,
            createNewThread,
            sendMessage,
            deleteThread,
            shareThread,
            isLoading
        }}>
            {children}
        </ChatContext.Provider>
    );
};
