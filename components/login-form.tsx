"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [mode, setMode] = useState<"login" | "signup">("login")

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        otp: ""
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setError("")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        if (!formData.email || !formData.password) {
            setError("Please enter email and password")
            setLoading(false)
            return
        }

        if (mode === "signup" && !formData.name) {
            setError("Please enter your full name")
            setLoading(false)
            return
        }

        if (mode === "login" && !formData.otp) {
            setError("Please enter the 2FA code")
            setLoading(false)
            return
        }

        try {
            if (mode === "login") {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        otp: formData.otp
                    })
                })

                if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.detail || "Login failed")
                }

                const data = await res.json()
                // Store teacher info
                localStorage.setItem("teacherId", data.teacher_id)
                localStorage.setItem("teacherEmail", formData.email)
                localStorage.setItem("teacherName", data.name)

                router.push("/problem-submission")

            } else {
                // SIGNUP FLOW: just store data temporarily and move to CRP page
                // WARNING: Storing password in localStorage is unsafe for production.
                // Doing this for hackathon speed/continuity only.
                localStorage.setItem("tempSignupData", JSON.stringify({
                    teacher_name: formData.name,
                    teacher_mail: formData.email,
                    password: formData.password
                }))

                router.push("/crp-details")
            }

        } catch (err: any) {
            setError(err.message || "Something went wrong.")
        } finally {
            setLoading(false)
        }
    }

    const toggleMode = () => {
        setMode(mode === "login" ? "signup" : "login")
        setError("")
        setFormData({ name: "", email: "", password: "", otp: "" })
    }

    return (
        <Card className="w-full max-w-[450px] bg-white border-slate-200 text-slate-900 shadow-lg ring-1 ring-slate-900/5 p-8 relative overflow-hidden transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent pointer-events-none" />
            <CardHeader>
                <CardTitle className="text-2xl font-semibold tracking-tight text-indigo-950">
                    {mode === "login" ? "Login" : "Create Account"}
                </CardTitle>
                <CardDescription className="text-slate-500">
                    {mode === "login"
                        ? "Enter your credentials and 2FA code."
                        : "Sign up to get started as a teacher."}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6 pt-4">

                    {/* Name Field - ONLY FOR SIGNUP */}
                    {mode === "signup" && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-300">
                            <Label htmlFor="name" className="text-slate-700 font-medium">Full Name</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="Enter your full name"
                                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-12 text-lg transition-all duration-300 ease-in-out"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div className="space-y-3">
                        <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="teacher@example.com"
                            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-12 text-lg transition-all duration-300 ease-in-out"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-12 text-lg transition-all duration-300 ease-in-out"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    {/* OTP Field - ONLY FOR LOGIN */}
                    {mode === "login" && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-300">
                            <Label htmlFor="otp" className="text-slate-700 font-medium">2FA Code</Label>
                            <Input
                                id="otp"
                                name="otp"
                                type="text"
                                placeholder="123456"
                                maxLength={6}
                                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-12 text-lg tracking-widest text-center font-mono transition-all duration-300 ease-in-out"
                                value={formData.otp}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button
                        type="submit"
                        className="w-full bg-indigo-900 text-white hover:bg-indigo-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-in-out h-12 text-lg font-medium tracking-wide shadow-md"
                        disabled={loading}
                    >
                        {loading ? "Processing..." : (mode === "login" ? "Login" : "Next")}
                    </Button>

                    <div className="text-center text-sm text-slate-600 mt-2">
                        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                        >
                            {mode === "login" ? "Sign Up" : "Login"}
                        </button>
                    </div>
                </CardFooter>
            </form>
        </Card>
    )
}
