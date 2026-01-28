"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


import { QRCodeSVG } from 'qrcode.react'

export default function CRPDetailsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [qrCodeUrl, setQrCodeUrl] = useState("")
    const [isRegistered, setIsRegistered] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        contact: "",
    })

    const validate = () => {
        const newErrors: { [key: string]: string } = {}
        if (!formData.name.trim()) newErrors.name = "Name is required"
        if (!formData.contact.trim()) {
            newErrors.contact = "Contact is required"
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact) && !/^\d{10}$/.test(formData.contact)) {
            newErrors.contact = "Enter a valid email or 10-digit phone number"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: "" })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)

        try {
            // Retrieve temporary data from Step 1
            const tempSignupDataStr = localStorage.getItem("tempSignupData")
            if (!tempSignupDataStr) {
                alert("Session expired. Please sign up again.")
                router.push("/")
                return
            }
            const tempSignupData = JSON.parse(tempSignupDataStr)

            // API Call to Signup
            const res = await fetch("http://localhost:8000/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    teacher_name: tempSignupData.teacher_name,
                    teacher_mail: tempSignupData.teacher_mail,
                    password: tempSignupData.password,
                    crp_name: formData.name,
                    crp_mail: formData.contact
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || "Signup failed")
            }

            const data = await res.json()

            // Show QR Code
            setQrCodeUrl(data.otp_auth_url)
            setIsRegistered(true)

            // Clear temp data
            localStorage.removeItem("tempSignupData")

        } catch (err: any) {
            alert(err.message || "Failed to register")
        } finally {
            setLoading(false)
        }
    }

    const handleDone = () => {
        router.push("/")
    }

    if (isRegistered) {
        return (
            <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4">
                <Card className="w-full max-w-[500px] bg-white border-slate-200 text-slate-900 shadow-lg p-8 text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-indigo-950">Setup 2FA</CardTitle>
                        <CardDescription className="text-slate-600">
                            Scan this QR code with Google Authenticator to enable 2-Factor Authentication.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-6">
                        {qrCodeUrl && <QRCodeSVG value={qrCodeUrl} size={200} />}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                            You wil need the code from your authenticator app to login next time.
                        </p>
                        <Button onClick={handleDone} className="w-full bg-indigo-900 mt-4 h-12 text-lg">
                            Done, Go to Login
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4">
            <Card className="w-full max-w-[500px] bg-white border-slate-200 text-slate-900 shadow-lg ring-1 ring-slate-900/5 p-8">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-semibold tracking-tight text-indigo-950">
                        CRP Details
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-lg mt-2">
                        Please provide your details to proceed.
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6 pt-6">

                        {/* Name Field */}
                        <div className="space-y-3">
                            <Label htmlFor="name" className="text-slate-700 font-medium text-base">
                                Full Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Enter your full name"
                                className={`bg-white border-slate-300 text-slate-900 h-12 text-lg transition-all duration-300 ease-in-out focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${errors.name ? 'border-red-500 ring-red-500' : ''}`}
                                value={formData.name}
                                onChange={handleChange}
                                disabled={loading}
                            />
                            {errors.name && <p className="text-sm text-red-500 font-medium">{errors.name}</p>}
                        </div>

                        {/* Contact Field */}
                        <div className="space-y-3">
                            <Label htmlFor="contact" className="text-slate-700 font-medium text-base">
                                Email or Phone <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="contact"
                                name="contact"
                                placeholder="email@example.com"
                                className={`bg-white border-slate-300 text-slate-900 h-12 text-lg transition-all duration-300 ease-in-out focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${errors.contact ? 'border-red-500 ring-red-500' : ''}`}
                                value={formData.contact}
                                onChange={handleChange}
                                disabled={loading}
                            />
                            {errors.contact && <p className="text-sm text-red-500 font-medium">{errors.contact}</p>}
                        </div>

                    </CardContent>
                    <CardFooter className="pt-2">
                        <Button
                            type="submit"
                            className="w-full bg-indigo-900 text-white hover:bg-indigo-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-in-out h-12 text-lg font-medium tracking-wide shadow-md"
                            disabled={loading}
                        >
                            {loading ? "Processing..." : "Complete Registration"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
