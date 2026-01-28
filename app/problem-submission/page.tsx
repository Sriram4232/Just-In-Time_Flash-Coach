"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter
} from "@/components/ui/sheet"
import { useTheme } from "next-themes"
import { Mic, Send, Globe, Volume2, Languages, User, Sun, Moon, LogOut, Phone, Mail, ChevronDown, ChevronRight, MessageSquare, Clock, Pause, Play, Plus, Check, WifiOff } from "lucide-react"
import { API_ROUTES, checkBackendHealth } from "@/lib/api-config"

// Mock Data for Languages
const languages = [
    { code: "EN", name: "English" },
    { code: "HI", name: "Hindi" },
    { code: "BN", name: "Bengali" },
    { code: "TE", name: "Telugu" },
    { code: "MR", name: "Marathi" },
    { code: "TA", name: "Tamil" },
]

// Mock Suggestion Chips
const suggestions = [
    "Students are distracted and talking",
    "Students don't understand the concept",
    "Students are nervous about tests",
    "Classroom is too noisy",
]

export default function ChatInterfacePage() {
    const router = useRouter()
    const [selectedLang, setSelectedLang] = useState("EN")
    const [voiceOutput, setVoiceOutput] = useState(false)
    const [autoTranslate, setAutoTranslate] = useState(true)
    const [inputText, setInputText] = useState("")
    const { theme, setTheme } = useTheme()

    // Sidebar State
    const [isLangOpen, setIsLangOpen] = useState(true)
    const [history, setHistory] = useState<any[]>([])
    const [activeChat, setActiveChat] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [chatMessages, setChatMessages] = useState<any[]>([]) // Messages for current view
    const [isBackendHealthy, setIsBackendHealthy] = useState(true) // Default true, checked on mount

    // Voice & Language State
    const [languagesList, setLanguages] = useState<any[]>([])
    const [isRecording, setIsRecording] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)

    const [feedbackLoadingId, setFeedbackLoadingId] = useState<string | null>(null)

    // Audio Playback State
    const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null)
    const [audioState, setAudioState] = useState<'idle' | 'playing' | 'paused'>('idle')
    const [currentAudioText, setCurrentAudioText] = useState<string | null>(null)

    // Profile State
    const [userProfile, setUserProfile] = useState<{ name: string, email: string, crpName?: string, crpContact?: string, teacherId?: string } | null>(null)
    const [mounted, setMounted] = useState(false)
    // Modal State
    const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
        // Initial Health Check
        checkBackendHealth().then(status => setIsBackendHealthy(status))

        // Load data from storage
        const teacherName = localStorage.getItem("teacherName") || "Teacher"
        const teacherEmail = localStorage.getItem("teacherEmail") || "teacher@example.com"
        const teacherId = localStorage.getItem("teacherId")
        const crpData = localStorage.getItem("crpDetails")
        const parsedCrp = crpData ? JSON.parse(crpData) : null

        if (!teacherId) {
            console.warn("No teacher ID found")
        }

        setUserProfile({
            name: teacherName,
            email: teacherEmail,
            teacherId: teacherId || undefined,
            crpName: parsedCrp?.name || "Not Assigned",
            crpContact: parsedCrp?.contact || "N/A"
        })

        if (teacherId) {
            fetchHistory(teacherId)
        }

        fetchLanguages()
    }, [])

    const fetchLanguages = async () => {
        try {
            const res = await fetch(API_ROUTES.LANGUAGES)
            if (res.ok) {
                const data = await res.json()
                const langArray = Object.values(data).map((l: any) => ({
                    code: l.tts,
                    name: l.name,
                    displayCode: l.code
                }))
                setLanguages(langArray)
            }
        } catch (e) {
            console.error("Failed to fetch languages via API:", e)
        }
    }

    const fetchHistory = async (teacherId: string) => {
        try {
            const res = await fetch(API_ROUTES.HISTORY(teacherId))
            if (res.ok) {
                const data = await res.json()
                // Messages now include message_id and feedback_status from backend
                const historyItems = (data.chat_history || []).map((session: any) => {
                    const firstMsg = session.messages.find((m: any) => m.sender === 'user')
                    return {
                        id: session.session_id,
                        title: firstMsg ? firstMsg.message : "New Conversation",
                        date: "Recent",
                        messages: session.messages
                    }
                })
                setHistory(historyItems.reverse())
            }
        } catch (error) {
            console.error("Failed to fetch history:", error)
        }
    }

    const handleHistoryClick = (sessionId: string) => {
        setActiveChat(sessionId)
        setCurrentSessionId(sessionId)
        const session = history.find(h => h.id === sessionId)
        if (session) {
            setChatMessages(session.messages)
        }
    }

    const handleNewChat = () => {
        setChatMessages([])
        setCurrentSessionId(null)
        setActiveChat(null)
    }

    const handleSendMessage = async () => {
        if (!inputText.trim() || !userProfile?.teacherId) return

        // Optimistic: Assume healthy validation happened at mount or via previous success.
        // We do typically check health, but blocking here prevents retry if transient failure occurs.
        // The fetch below will handle errors naturally.

        // Temporary local ID for optimistic rendering
        const tempId = `temp-${Date.now()}`
        const newMessage = {
            message_id: tempId,
            sender: 'user',
            message: inputText,
            timestamp: new Date().toISOString()
        }

        const tempMessages = [...chatMessages, newMessage]
        setChatMessages(tempMessages)
        setInputText("")
        setIsLoading(true)

        try {
            const res = await fetch(API_ROUTES.COACHING_ADVICE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    teacher_id: userProfile.teacherId,
                    message: newMessage.message,
                    session_id: currentSessionId,
                    user_lang: selectedLang
                })
            })

            if (res.ok) {
                const data = await res.json()
                const finalSessionId = currentSessionId || data.session_id

                if (!currentSessionId) {
                    setCurrentSessionId(finalSessionId)
                    // If New Chat, we actively switch to this session
                    setActiveChat(finalSessionId)
                }

                // OPTIMIZED: Update local state immediately with the robust ID from backend
                // This ensures feedback works instantly without waiting for history re-fetch
                const aiMessage = {
                    message_id: data.ai_message_id,
                    sender: 'ai',
                    message: data.response, // The JSON string or text
                    timestamp: new Date().toISOString()
                }

                setChatMessages(prev => [...prev, aiMessage])

                // Background sync ensures consistency
                fetchHistory(userProfile.teacherId)

            } else {
                console.error(`Status ${res.status}: Failed to send message`)
            }
        } catch (error) {
            console.error("Chat error:", error)
            alert("Failed to connect to the assistant.")
        } finally {
            setIsLoading(false)
        }
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorderRef.current = new MediaRecorder(stream)
            const chunks: BlobPart[] = []

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data)
            }

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunks, { type: "audio/wav" })
                const file = new File([blob], "recording.wav", { type: "audio/wav" })
                await handleVoiceUpload(file)
            }

            mediaRecorderRef.current.start()
            setIsRecording(true)
        } catch (err) {
            console.error("Could not start recording", err)
            alert("Microphone access denied or not available")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
        }
    }

    const handleVoiceUpload = async (file: File) => {
        setIsLoading(true)
        const formData = new FormData()
        formData.append("audio", file)
        const voiceLang = languagesList.find(l => l.code === selectedLang)?.code || "en-US"
        formData.append("lang", voiceLang)

        try {
            const res = await fetch(API_ROUTES.SPEECH_TO_TEXT, {
                method: "POST",
                body: formData
            })
            if (res.ok) {
                const data = await res.json()
                if (data.text) {
                    setInputText(data.text)
                }
            }
        } catch (error) {
            console.error("STT Error", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("teacherEmail")
        localStorage.removeItem("teacherName")
        localStorage.removeItem("teacherId")
        localStorage.removeItem("loginStatus")
        localStorage.removeItem("crpDetails")
        router.push("/")
    }

    // --- Audio Control ---
    const handleAudioControl = async (text: string) => {
        if (currentAudioText === text && audioState === 'playing') {
            audioPlayer?.pause()
            setAudioState('paused')
            return
        }

        if (currentAudioText === text && audioState === 'paused') {
            audioPlayer?.play()
            setAudioState('playing')
            return
        }

        if (audioPlayer) {
            audioPlayer.pause()
            setAudioState('idle')
        }

        setCurrentAudioText(text)
        try {
            const res = await fetch(API_ROUTES.TEXT_TO_SPEECH, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text,
                    lang: selectedLang == "EN" ? "en" : languagesList.find(l => l.code === selectedLang)?.code
                })
            })
            if (res.ok) {
                const data = await res.json()
                if (data.audio) {
                    const audio = new Audio(`data:audio/mp3;base64,${data.audio}`)
                    audio.onended = () => {
                        setAudioState('idle')
                        setCurrentAudioText(null)
                    }
                    setAudioPlayer(audio)
                    audio.play()
                    setAudioState('playing')
                }
            }
        } catch (e) {
            console.error("TTS Error", e)
            setAudioState('idle')
            setCurrentAudioText(null)
        }
    }

    // --- Feedback Logic ---
    const sendFeedback = async (feedbackValue: string, messageId: string, sessionId?: string) => {
        const sid = sessionId || currentSessionId
        if (!sid || !messageId || !userProfile?.teacherId) return

        // Optimistic UI Update
        const updatedMessages = chatMessages.map(msg => {
            if (msg.message_id === messageId) {
                return { ...msg, feedback_status: feedbackValue }
            }
            return msg
        })
        setChatMessages(updatedMessages)

        setFeedbackLoadingId(messageId) // Start Loading Indicator

        try {
            const res = await fetch(API_ROUTES.FEEDBACK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    teacher_id: userProfile.teacherId,
                    session_id: sid,
                    message_id: messageId,
                    feedback: feedbackValue
                })
            })
            if (res.ok) {
                const data = await res.json()
                // Strict Handshake Check: Only trigger if backend explicitly confirms 'sent' status
                if (data.escalation?.triggered === true) {
                    if (data.escalation.status === 'sent') {
                        setIsEscalationModalOpen(true)
                    } else if (data.escalation.status === 'failed') {
                        // Show the backend's friendly error message directly
                        alert(`Escalation Failed: ${data.escalation.error || "Unknown error"}`)
                    }
                }
            }
        } catch (e) {
            console.error("Feedback error", e)
        } finally {
            setFeedbackLoadingId(null) // Stop Loading Indicator
        }
    }

    // --- ESCALATION ALERT MODAL COMPONENT ---
    const EscalationModal = () => (
        isEscalationModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-indigo-100 dark:border-indigo-900 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
                            <span className="text-3xl">🛡️</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Support Notified</h3>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            We've noticed you're exploring multiple strategies. We have notified your CRP via email for personalized assistance.
                        </p>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg w-full border border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Action Taken</p>
                            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Escalation Email Sent & Feedback Reset</p>
                        </div>
                        <Button
                            onClick={() => setIsEscalationModalOpen(false)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none mt-4"
                        >
                            Understood
                        </Button>
                    </div>
                </div>
            </div>
        )
    )

    return (
        <div className="flex h-screen w-full bg-[#F8FAFC] dark:bg-[#0F172A] overflow-hidden transition-colors duration-300">
            <EscalationModal />
            {/* LEFT SIDEBAR - Language & Settings */}
            <aside className="w-72 bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm z-20">

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                    {/* NEW CHAT BUTTON */}
                    <div className="p-4 pb-2">
                        <Button
                            onClick={handleNewChat}
                            className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:shadow-lg ${!isBackendHealthy ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!isBackendHealthy}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Chat
                        </Button>
                    </div>

                    {/* LANGUAGES */}
                    <div className="pt-2 px-4 pb-2">
                        <button
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            className="flex items-center justify-between w-full p-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                        >
                            <div className="flex items-center gap-2">
                                <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span>Languages</span>
                            </div>
                            {isLangOpen ? (
                                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-500" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-500" />
                            )}
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isLangOpen ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                            <div className="space-y-1 pl-2">
                                {languagesList.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setSelectedLang(lang.code)}
                                        className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between text-sm transition-all duration-200 ${selectedLang === lang.code
                                            ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-200 font-medium"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                            }`}
                                    >
                                        <span>{lang.name}</span>
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${selectedLang === lang.code ? 'bg-indigo-100 dark:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            {lang.displayCode || lang.code}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-2">
                        <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>
                    </div>
                    {/* HISTORY */}
                    <div className="px-4 pb-6">
                        <h3 className="px-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">History</h3>
                        {history.length === 0 ? (
                            <div className="px-2 py-4 text-center text-sm text-slate-400 italic">No previous conversations yet.</div>
                        ) : (
                            <div className="space-y-1">
                                {history.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleHistoryClick(item.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-colors group ${activeChat === item.id
                                            ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-600 dark:border-indigo-400 shadow-sm"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800 border-l-2 border-transparent"
                                            }`}
                                    >
                                        <MessageSquare className={`w-4 h-4 mt-0.5 transition-colors shrink-0 ${activeChat === item.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-indigo-500"}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm truncate font-medium ${activeChat === item.id ? "text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300"}`}>{item.title}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">{item.date}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-4 bg-slate-50 dark:bg-[#1E293B] border-t border-slate-200 dark:border-slate-800 space-y-3 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Volume2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Voice Output</span>
                        </div>
                        <button
                            onClick={() => setVoiceOutput(!voiceOutput)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${voiceOutput ? "bg-indigo-600" : "bg-slate-300"}`}
                        >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${voiceOutput ? "translate-x-4" : "translate-x-1"}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Auto-Translate</span>
                        </div>
                        <button
                            onClick={() => setAutoTranslate(!autoTranslate)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${autoTranslate ? "bg-indigo-600" : "bg-slate-300"}`}
                        >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${autoTranslate ? "translate-x-4" : "translate-x-1"}`} />
                        </button>
                    </div>
                </div>

            </aside >

            {/* MAIN CHAT AREA */}
            < main className="flex-1 flex flex-col relative" >

                {/* Header */}
                < header className="h-16 bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shadow-sm z-10 transition-colors duration-300" >
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-indigo-950 dark:text-white tracking-tight">FLASH COACH</h1>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md">BETA</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${isBackendHealthy ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800/30' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800/30'}`}>
                            {isBackendHealthy ? (
                                <>
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    Connected
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-3 h-3" />
                                    Offline
                                </>
                            )}
                        </div>
                        <Sheet>
                            <SheetTrigger asChild>
                                <button className="w-9 h-9 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all hover:scale-105 hover:shadow-sm">
                                    <User className="w-5 h-5" />
                                </button>
                            </SheetTrigger>
                            <SheetContent side="right" className="bg-white dark:bg-[#1E293B] border-l border-slate-200 dark:border-slate-800">
                                <SheetHeader className="mb-6">
                                    <SheetTitle className="text-2xl font-bold text-indigo-950 dark:text-white">My Profile</SheetTitle>
                                    <SheetDescription className="text-slate-500 dark:text-slate-400">Manage your teacher profile and settings.</SheetDescription>
                                </SheetHeader>
                                {userProfile && (
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2"><User className="w-4 h-4" /> User Information</h3>
                                            <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-lg space-y-3 border border-slate-100 dark:border-slate-800">
                                                <div><label className="text-xs text-slate-500 dark:text-slate-500 font-medium uppercase">Name</label><p className="text-base text-slate-900 dark:text-slate-100 font-medium">{userProfile.name}</p></div>
                                                <div><label className="text-xs text-slate-500 dark:text-slate-500 font-medium uppercase">Email / Contact</label><p className="text-base text-slate-900 dark:text-slate-100">{userProfile.email}</p></div>
                                                <div><label className="text-xs text-slate-500 dark:text-slate-500 font-medium uppercase">Preferred Language</label><div className="flex items-center gap-2 mt-1"><span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded">{languages.find(l => l.code === selectedLang)?.name || selectedLang}</span></div></div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2"><Phone className="w-4 h-4" /> CRP Support</h3>
                                            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg space-y-3 border border-indigo-100 dark:border-indigo-900/30">
                                                <div><label className="text-xs text-indigo-400 dark:text-indigo-400 font-medium uppercase">Assigned CRP</label><p className="text-base text-indigo-950 dark:text-indigo-100 font-medium">{userProfile.crpName}</p></div>
                                                <div><label className="text-xs text-indigo-400 dark:text-indigo-400 font-medium uppercase">Contact</label><p className="text-base text-indigo-900 dark:text-indigo-200">{userProfile.crpContact}</p></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <SheetFooter className="absolute bottom-6 left-6 right-6 sm:justify-center">
                                    <Button variant="outline" className="w-full h-12 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-slate-200 dark:border-slate-700 transition-colors" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" /> Log Out</Button>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all hover:scale-105 hover:shadow-sm">
                            {mounted && (theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
                        </button>
                    </div>
                </header >

                {/* Chat Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
                    {chatMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
                            <div className="max-w-2xl w-full">
                                <div className="mb-8 inline-block p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-full"><span className="text-4xl">✨</span></div>
                                <h2 className="text-4xl font-semibold text-slate-900 dark:text-white mb-4 tracking-tight">Your Personal Teaching Coach</h2>
                                <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-lg mx-auto leading-relaxed">Describe a challenge you're facing in the classroom, and I'll provide immediate, personalized strategies in {languages.find(l => l.code === selectedLang)?.name}.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                                    {suggestions.map((text, idx) => (
                                        <button key={idx} onClick={() => setInputText(text)} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-[#334155] hover:text-indigo-900 dark:hover:text-indigo-200 text-slate-700 dark:text-slate-200 p-4 rounded-xl text-left transition-all duration-200 shadow-sm hover:shadow-md group">
                                            <span className="block text-sm font-medium group-hover:translate-x-1 transition-transform">{text}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-12 flex items-center justify-center gap-6 text-sm text-slate-400 font-medium">
                                    <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> Multi-language Support</span>
                                    <span className="flex items-center gap-1.5"><Volume2 className="w-4 h-4" /> Voice Output Available</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-3xl mx-auto w-full pb-8">
                            {chatMessages.map((msg, idx) => {
                                let content = null
                                let isJson = false
                                try {
                                    if (msg.sender === 'ai') {
                                        content = JSON.parse(msg.message)
                                        if (content.speech_flow || content.strategies) {
                                            isJson = true
                                        }
                                    }
                                } catch (e) { }

                                let textToSpeak = msg.message
                                if (isJson) {
                                    if (content.speech_flow) {
                                        const flow = content.speech_flow
                                        const steps = flow.main_advice.map((s: any) => s.spoken_text).join(". ")
                                        textToSpeak = `${flow.intro}. ${steps}. ${flow.closing}`
                                    } else {
                                        textToSpeak = `${content.summary}. ${content.strategies?.map((s: any) => s.title + ". " + s.description).join(". ")}`
                                    }
                                }

                                const isThisCardPlaying = currentAudioText === textToSpeak && audioState === 'playing'
                                const isThisCardPaused = currentAudioText === textToSpeak && audioState === 'paused'

                                return (
                                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl group relative ${msg.sender === 'user'
                                            ? 'bg-indigo-600 text-white p-4 rounded-tr-none'
                                            : 'bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'
                                            }`}>

                                            {msg.sender === 'ai' && isJson ? (
                                                <div className="p-5 space-y-5">
                                                    <div className="text-slate-600 dark:text-slate-300 leading-relaxed italic border-l-4 border-indigo-200 pl-3">
                                                        {content.speech_flow?.intro || content.summary}
                                                    </div>
                                                    <div className="space-y-3">
                                                        {(content.speech_flow?.main_advice || content.strategies || []).map((step: any, sIdx: number) => (
                                                            <div key={sIdx} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800/50">
                                                                <div className="flex items-start gap-3">
                                                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold mt-0.5">{step.step || sIdx + 1}</span>
                                                                    <div>
                                                                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{step.title}</h4>
                                                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.spoken_text || step.description}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {content.speech_flow?.closing && (
                                                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium text-center pt-2">{content.speech_flow.closing}</div>
                                                    )}

                                                    {/* FEEDBACK & VOICE CONTROL SECTION (Flex Row) */}
                                                    <div className="flex items-center justify-between gap-4 pt-4 text-xs border-t border-slate-100 dark:border-slate-800 mt-2">

                                                        {/* Left: Feedback */}
                                                        <div className="flex items-center gap-2">
                                                            {msg.feedback_status ? (
                                                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium px-2 py-1 bg-green-50 dark:bg-green-900/10 rounded-full animate-in fade-in duration-300">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                    <span>Thank you for your feedback</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span className="text-slate-400 hidden sm:inline">{content.feedback?.feedback_prompt || "Did this help?"}</span>
                                                                    {content.feedback?.feedback_storage?.allowed_values?.includes("worked") && (
                                                                        <button onClick={() => sendFeedback("worked", msg.message_id, currentSessionId || undefined)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30 transition-colors border border-green-100 dark:border-green-800/30">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Worked
                                                                        </button>
                                                                    )}
                                                                    {content.feedback?.feedback_storage?.allowed_values?.includes("partially_worked") && (
                                                                        <button onClick={() => sendFeedback("partially_worked", msg.message_id, currentSessionId || undefined)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:hover:bg-yellow-900/30 transition-colors border border-yellow-100 dark:border-yellow-800/30">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Partially
                                                                        </button>
                                                                    )}
                                                                    {content.feedback?.feedback_storage?.allowed_values?.includes("did_not_work") && (
                                                                        <button onClick={() => sendFeedback("did_not_work", msg.message_id, currentSessionId || undefined)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-800/30">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Didn't Work
                                                                        </button>
                                                                    )}
                                                                    {!content.feedback?.feedback_storage?.allowed_values && (
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={() => sendFeedback("worked", msg.message_id, currentSessionId || undefined)}
                                                                                disabled={!!feedbackLoadingId}
                                                                                className={`px-3 py-1.5 rounded-full text-xs transition-all ${feedbackLoadingId === msg.message_id ? 'bg-slate-100 text-slate-400' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                                                                            >
                                                                                {feedbackLoadingId === msg.message_id ? "Processing..." : "Worked"}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => sendFeedback("did_not_work", msg.message_id, currentSessionId || undefined)}
                                                                                disabled={!!feedbackLoadingId}
                                                                                className={`px-3 py-1.5 rounded-full text-xs transition-all ${feedbackLoadingId === msg.message_id ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                                                                            >
                                                                                {feedbackLoadingId === msg.message_id ? "Processing..." : "Didn't Work"}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Right: Voice Control */}
                                                        <button
                                                            onClick={() => handleAudioControl(textToSpeak)}
                                                            className={`p-2 shadow-sm border rounded-full transition-all hover:scale-110 flex-shrink-0 
                                                            ${isThisCardPlaying
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 animate-pulse'
                                                                    : 'bg-white dark:bg-[#1E293B] text-slate-400 hover:text-indigo-600 border-slate-100 dark:border-slate-700'
                                                                }`}
                                                            title={isThisCardPlaying ? "Pause" : "Play Audio"}
                                                        >
                                                            {isThisCardPlaying ? (
                                                                <Pause className="w-4 h-4 fill-current" />
                                                            ) : isThisCardPaused ? (
                                                                <Play className="w-4 h-4 fill-current ml-0.5" />
                                                            ) : (
                                                                <Volume2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4"><p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p></div>
                                            )}

                                        </div>
                                    </div>
                                )
                            })}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                < div className="p-6 bg-white dark:bg-[#1E293B] border-t border-slate-200 dark:border-slate-800 transition-colors duration-300" >
                    <div className="max-w-4xl mx-auto relative">
                        {/* INPUT VALIDATION STATE */}
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSendMessage()
                                }
                            }}
                            placeholder="Describe your classroom challenge here..."
                            // STRICT REQUIREMENT: "chance to enter prompt as many times as i want" -> NEVER DISABLE based on backend health
                            className={`w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl pl-6 pr-32 py-5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none h-20 shadow-inner text-lg transition-all`}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                            <button onClick={isRecording ? stopRecording : startRecording} className={`p-2.5 rounded-full transition-all duration-300 ${isRecording ? "bg-red-100 text-red-600 animate-pulse" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`} title="Use Voice Input"><Mic className={`w-5 h-5 ${isRecording ? "fill-current" : ""}`} /></button>
                            <Button onClick={handleSendMessage} disabled={isLoading || !inputText.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-6 shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"><Send className="w-5 h-5" /></Button>
                        </div>
                    </div>
                    {/* Footnote status */}
                    <div className="text-center mt-3 text-xs text-slate-400 flex justify-center items-center gap-2">
                        <span>Press <strong>Enter</strong> to send</span>
                        {!isBackendHealthy && <span className="text-red-500 font-medium ml-2 flex items-center gap-1"><WifiOff className="w-3 h-3" /> Backend Offline</span>}
                    </div>
                </div >

            </main >
        </div >
    )
}
